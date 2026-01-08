import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Cấu hình môi trường
dotenv.config(); // Tải từ .env mặc định
dotenv.config({ path: '.env.local' }); // Tải thêm từ .env.local nếu có (ghi đè)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

console.log(">>> [Server] Khởi động với các cấu hình:");
console.log("    - __dirname:", __dirname);
console.log("    - DIFY_API_KEY:", process.env.DIFY_API_KEY ? "Đã nạp" : "Thiếu");
console.log("    - GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Đã nạp" : "Thiếu");
console.log("    - TELEGRAM_BOT_TOKEN:", (process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN) ? "Đã nạp" : "Thiếu");

/**
 * Proxy Endpoint cho Dify AI Advisor
 */
app.post('/api/chat', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const { query, user, fire_config, context_string, conversation_id, language } = req.body;
        const DIFY_API_KEY = process.env.DIFY_API_KEY;

        if (!DIFY_API_KEY) {
            return res.status(500).json({ error: 'Cấu hình server thiếu API Key.' });
        }

        const payload = {
            inputs: {
                user_financial_profile: context_string || "Không có hồ sơ.",
                fire_config: JSON.stringify(fire_config || {}),
                language: language || "Vietnamese"
            },
            query: query,
            user: user || 'anonymous_user',
            response_mode: "streaming",
            conversation_id: conversation_id || "",
            files: []
        };

        const response = await axios.post('https://dify.socchiptech.com/v1/chat-messages', payload, {
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 60000
        });

        let fullAnswer = "";
        let finalConversationId = conversation_id;

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            lines.forEach(line => {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.substring(6);
                        const data = JSON.parse(jsonStr);
                        if (data.event === 'message' || data.event === 'agent_message') {
                            fullAnswer += data.answer;
                            if (data.conversation_id) finalConversationId = data.conversation_id;
                        }
                    } catch (e) { }
                }
            });
        });

        response.data.on('end', () => {
            return res.status(200).json({
                event: "message_end",
                answer: fullAnswer,
                conversation_id: finalConversationId,
                created_at: Date.now()
            });
        });

        response.data.on('error', (err) => {
            return res.status(500).json({ error: 'Lỗi stream từ Dify' });
        });

    } catch (error) {
        console.error('!!! [Proxy Error]', error.message);
        return res.status(error.response?.status || 500).json({ error: error.message });
    }
});

/**
 * Proxy Endpoint cho Google GenAI
 */
app.post('/api-proxy/v1beta/models/:model', async (req, res) => {
    try {
        const { model } = req.params;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Server missing Gemini API Key' });

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${GEMINI_API_KEY}`,
            req.body,
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        return res.status(200).json(response.data);
    } catch (error) {
        return res.status(error.response?.status || 500).json({ error: error.message });
    }
});

/**
 * Handle Telegram Feedback
 */
app.post('/api/telegram/feedback', async (req, res) => {
    try {
        const { message, chat_id } = req.body;
        const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
        const DEFAULT_CHAT_ID = "-5008015561";

        if (!TELEGRAM_BOT_TOKEN) {
            console.error("!!! [Telegram Error] Missing Bot Token");
            return res.status(500).json({ error: 'Server missing Telegram Bot Token' });
        }

        const targetChatId = chat_id || DEFAULT_CHAT_ID;
        console.log(`>>> [Telegram] Sending message to ${targetChatId}...`);

        try {
            // First try with Markdown
            await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                { chat_id: targetChatId, text: message, parse_mode: 'Markdown' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
            );
        } catch (markdownError) {
            console.warn("!!! [Telegram Warning] Markdown send failed, retrying as plain text:", markdownError.response?.data || markdownError.message);
            // Retry without parse_mode if Markdown fails (likely due to unescaped characters in user input)
            await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                { chat_id: targetChatId, text: message }, // No parse_mode
                { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
            );
        }

        console.log("<<< [Telegram] Message sent successfully");
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('!!! [Telegram Error]', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data
        });
    }
});

// Handle React Routing
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    // Đảm bảo path chuẩn xác trong môi trường Docker
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`FinAI Server running on port ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Static path: ${path.join(__dirname, 'dist')}`);
    console.log(`=========================================`);
});
