import dotenv from 'dotenv';
dotenv.config(); // Tải từ .env mặc định
dotenv.config({ path: '.env.local' }); // Tải thêm từ .env.local nếu có (ghi đè)
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

/**
 * Proxy Endpoint cho Dify AI Advisor
 */
app.post('/api/chat', async (req, res) => {
    // Set JSON header only for API routes
    res.setHeader('Content-Type', 'application/json');
    console.log(">>> [Proxy] Bắt đầu nhận yêu cầu từ Frontend");

    try {
        const { query, user, fire_config, context_string, conversation_id, language } = req.body;

        // Sử dụng API Key từ biến môi trường
        const DIFY_API_KEY = process.env.DIFY_API_KEY;

        if (!DIFY_API_KEY) {
            console.error("!!! [Proxy Error] Missing Dify API Key.");
            return res.status(500).json({ error: 'Cấu hình server thiếu API Key.' });
        }

        // NOTE: Chuyển sang streaming mode theo yêu cầu mới
        // Tuy nhiên, để frontend (đang dùng blocking) không bị lỗi, ta buffer stream lại rồi trả về JSON 1 lần.
        const payload = {
            inputs: {
                user_financial_profile: context_string || "Không có hồ sơ.",
                fire_config: JSON.stringify(fire_config || {}),
                language: language || "Vietnamese"
            },
            query: query,
            user: user || 'anonymous_user',
            response_mode: "streaming", // Changed from blocking to streaming
            conversation_id: conversation_id || "",
            files: []
        };

        console.log(">>> [Proxy] Đang gọi Dify Socchiptech (Streaming Mode)...");

        const response = await axios.post('https://dify.socchiptech.com/v1/chat-messages', payload, {
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream', // Nhận stream
            timeout: 60000
        });

        let fullAnswer = "";
        let finalConversationId = conversation_id;

        // Xử lý stream buffer
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            lines.forEach(line => {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.substring(6);
                        const data = JSON.parse(jsonStr);

                        // Sự kiện message chứa câu trả lời
                        if (data.event === 'message' || data.event === 'agent_message') {
                            fullAnswer += data.answer;
                            if (data.conversation_id) finalConversationId = data.conversation_id;
                        }
                        // Sự kiện kết thúc (tuỳ app Dify)
                        if (data.event === 'message_end') {
                            if (data.conversation_id) finalConversationId = data.conversation_id;
                        }
                    } catch (e) {
                        // Bỏ qua lỗi parse chunk (ping hoặc lỗi format)
                    }
                }
            });
        });

        response.data.on('end', () => {
            console.log("<<< [Proxy] Stream kết thúc. Gửi phản hồi tổng hợp về Frontend.");
            console.log("Payload Length:", fullAnswer.length);

            // Format trả về giống hệt blocking mode cũ để frontend không cần sửa
            return res.status(200).json({
                event: "message_end",
                task_id: "stream-buffered",
                id: "stream-buffered",
                message_id: "stream-buffered",
                conversation_id: finalConversationId,
                mode: "chat",
                answer: fullAnswer,
                metadata: {},
                created_at: Date.now()
            });
        });

        response.data.on('error', (err) => {
            console.error("!!! [Proxy Stream Error]", err);
            return res.status(500).json({ error: 'Lỗi khi đọc stream từ Dify.' });
        });

    } catch (error) {
        console.error('!!! [Proxy Error] Chi tiết lỗi:');

        if (error.response) {
            // Trường hợp stream response có thể là lỗi ngay lập tức (không phải stream 200)
            // Cần đọc stream lỗi nếu có
            // Tuy nhiên axios với responseType stream sẽ trả về stream ở data
            // Nếu status code != 2xx, axios thường ném lỗi (validateStatus).
            // Nếu lọt vào đây là lỗi status code (ví dụ 400).
            console.error("Status:", error.response.status);
            // Với stream, data là stream, cần decode để xem lỗi JSON
            // Nhưng đơn giản hoá: trả về lỗi generic kèm status code
            return res.status(error.response.status).json({
                error: `Dify trả về lỗi ${error.response.status}`,
                details: "Vui lòng kiểm tra log server."
            });
        } else if (error.request) {
            console.error("Không nhận được phản hồi từ Dify API (Network Error)");
            return res.status(502).json({ error: 'Không thể kết nối đến máy chủ AI (Dify Gateway Error)' });
        } else {
            console.error("Message:", error.message);
            return res.status(500).json({ error: 'Lỗi Proxy nội bộ: ' + error.message });
        }
    }
});

/**
 * Proxy Endpoint cho Google GenAI (cho NewEntry AI)
 */
app.post('/api-proxy/v1beta/models/:model', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    console.log(">>> [GenAI Proxy] Request for model:", req.params.model);

    try {
        const { model } = req.params;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error("!!! [GenAI Proxy Error] Missing Gemini API Key.");
            return res.status(500).json({ error: 'Server missing Gemini API Key' });
        }

        console.log(`>>> [GenAI Proxy] Key loaded (prefix: ${GEMINI_API_KEY.substring(0, 5)}...)`);

        // Forward request to Google GenAI API using query parameter for key
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${GEMINI_API_KEY}`,
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log("<<< [GenAI Proxy] Success");
        return res.status(200).json(response.data);

    } catch (error) {
        console.error('!!! [GenAI Proxy Error]', error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                error: `GenAI API Error: ${error.response.status}`,
                details: error.response.data
            });
        } else if (error.request) {
            return res.status(502).json({ error: 'Cannot connect to GenAI API' });
        } else {
            return res.status(500).json({ error: 'GenAI Proxy Error: ' + error.message });
        }
    }
});

// Serve static files from the 'dist' directory
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Handle Telegram Feedback
 */
app.post('/api/telegram/feedback', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    console.log(">>> [Telegram Feedback] Đang gửi feedback...");

    try {
        const { message, chat_id } = req.body;
        const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
        const DEFAULT_CHAT_ID = "-5008015561"; // Fallback chat ID if not provided

        if (!TELEGRAM_BOT_TOKEN) {
            console.error("!!! [Telegram Feedback Error] Missing Telegram Bot Token.");
            return res.status(500).json({ error: 'Server missing Telegram Bot Token' });
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: chat_id || DEFAULT_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );

        console.log("<<< [Telegram Feedback] Thành công");
        return res.status(200).json({ success: true, data: response.data });

    } catch (error) {
        console.error('!!! [Telegram Feedback Error]', error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                error: `Telegram API Error: ${error.response.status}`,
                details: error.response.data
            });
        }
        return res.status(500).json({ error: 'Lỗi gửi feedback Telegram: ' + error.message });
    }
});

// Handle React Routing, return all requests to React app
app.get('*', (req, res) => {
    // Skip /api routes
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`FinAI Proxy Server đang chạy tại port ${PORT}`);
    console.log(`Endpoint: POST http://localhost:${PORT}/api/chat`);
    console.log(`Endpoint: POST http://localhost:${PORT}/api/telegram/feedback`);
    console.log(`=========================================`);
});
