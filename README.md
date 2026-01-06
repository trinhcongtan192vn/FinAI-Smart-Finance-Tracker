
# FinAI - Smart Finance Tracker

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A smart personal finance tracking application powered by AI, built with React, Vite, and Firebase.

## Features
- **AI Financial Advisor**: Chat with an AI (via Dify & Gemini) to get personalized financial advice.
- **Expense Tracking**: Log income and expenses with auto-categorization options.
- **Dashboard**: Visual overview of your financial health.
- **P/L Analysis**: Profit and Loss reports.
- **Secure**: Authentication and data storage via Firebase.

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase project
- API Keys for Google Gemini and Dify AI

## Quick Start (Docker Compose - Recommended)

The easiest way to start the FinAI server is through Docker Compose. Before running, make sure that [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed on your machine.

```bash
# 1. Navigate to docker directory
cd docker

# 2. Setup environment variables
cp .env.example .env

# 3. Edit .env and add your API keys / Firebase configuration
# nano .env (or your favorite editor)

# 4. Start the application
docker compose up -d --build
```

After running, you can access the application at `http://localhost:8080`.

---

## Local Development

If you prefer to run the application manually without Docker:

1.  **Clone and Install:**
    ```bash
    git clone https://github.com/trinhcongtan192vn/FinAI-Smart-Finance-Tracker.git
    cd FinAI-Smart-Finance-Tracker
    npm install
    ```

2.  **Configure Environment:**
    Create a `.env.local` file in the root directory:
    ```ini
    # Firebase
    VITE_FIREBASE_API_KEY=your_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_id
    VITE_FIREBASE_STORAGE_BUCKET=your_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
    VITE_FIREBASE_APP_ID=your_id

    # AI
    GEMINI_API_KEY=your_gemini_key
    DIFY_API_KEY=your_dify_key
    ```

3.  **Run:**
    ```bash
    # Term 1: Backend Proxy
    npm run server

    # Term 2: Frontend
    npm run dev
    ```
    Access at `http://localhost:3000`.

## Deployment

### Docker / Cloud Run
The provided `Dockerfile` is optimized for multi-stage builds. Since Vite requires environment variables at *build time*, ensure you pass them as build arguments:

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg GEMINI_API_KEY=... \
  -t finai-tracker .
```

### Render / Railway / Heroku
1. **Build Command:** `npm install && npm run build`
2. **Start Command:** `node server.js`
3. **Environment Variables:** Add all keys from `.env.local` to your provider's dashboard.

## Project Structure
- `/docker`: Docker Compose configuration and environment templates
- `/src`: React source code (Vite)
- `/server.js`: Express backend proxy for Dify API
- `/components`: Reusable UI components
- `/views`: Main application pages
- `Dockerfile`: Multi-stage build for frontend and backend
