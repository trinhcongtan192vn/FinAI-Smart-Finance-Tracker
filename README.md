
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

## Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/trinhcongtan192vn/FinAI-Smart-Finance-Tracker.git
    cd FinAI-Smart-Finance-Tracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add the following keys:
    
    ```ini
    # Firebase Configuration (Get these from your Firebase Console)
    VITE_FIREBASE_API_KEY=your_firebase_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    
    # AI API Keys
    GEMINI_API_KEY=your_google_gemini_api_key
    DIFY_API_KEY=your_dify_api_key
    ```

4.  **Run the Application:**
    You need to run both the frontend and the backend proxy server (for Dify).
    
    In one terminal (Backend):
    ```bash
    npm run server
    ```
    
    In another terminal (Frontend):
    ```bash
    npm run dev
    ```
    
    Access the app at `http://localhost:3000`.

## Deployment

### Option 1: Docker / Google Cloud Run (Recommended for Full Stack)
Since the application requires a backend proxy (`server.js`) to securely communicate with the Dify API, deploying as a Docker container is the most robust solution.

1.  **Create a `Dockerfile`** in the root directory:
    ```dockerfile
    # Build Stage
    FROM node:18-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build

    # Production Stage
    FROM node:18-alpine
    WORKDIR /app
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/server.js ./
    RUN npm install --production
    EXPOSE 8080
    CMD ["node", "server.js"]
    ```

2.  **Build and Deploy** (Example for Google Cloud Run):
    ```bash
    # Build container
    gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/finai-tracker

    # Deploy to Cloud Run
    # Deploy to Cloud Run (Make sure to replace placeholders with your actual keys)
    gcloud run deploy finai-tracker \
      --image gcr.io/YOUR_PROJECT_ID/finai-tracker \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars "GEMINI_API_KEY=your_gemini_key" \
      --set-env-vars "DIFY_API_KEY=your_dify_key" \
      --set-env-vars "VITE_FIREBASE_API_KEY=your_firebase_api_key" \
      --set-env-vars "VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com" \
      --set-env-vars "VITE_FIREBASE_PROJECT_ID=your_project_id" \
      --set-env-vars "VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com" \
      --set-env-vars "VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id" \
      --set-env-vars "VITE_FIREBASE_APP_ID=your_app_id" \
      --set-env-vars "VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token"
    ```
    *Important: For `VITE_*` variables to be visible in the frontend, they must be present during the image build process. Ensure your `.env.local` is included in the build context (check `.gitignore`/`.dockerignore`) or pass them as build arguments if using a custom pipeline.*

### Option 2: Render / Heroku / Railway
You can deploy this repository directly to any platform that supports Node.js.

1.  **Build Command:** `npm install && npm run build`
2.  **Start Command:** `node server.js`
3.  **Environment Variables:** Add all the variables from `.env.local` to the platform's environment configuration.

### Option 3: Static Hosting (Vercel/Netlify) - *Frontend Only*
**Warning:** This method will break the "Advisor Chat" feature because it relies on the `server.js` proxy. Use this only if you migrate the Dify API call to a Cloud Function or Edge Function.

1.  Push your code to GitHub.
2.  Import project into Vercel.
3.  Set Build Command: `npm run build`
4.  Set Output Directory: `dist`
5.  Add Environment Variables (`VITE_FIREBASE_*`).

## Docker Compose Deployment (Recommended)

The easiest way to start the FinAI server is through Docker Compose. Before running, make sure that Docker and Docker Compose are installed on your machine.

```bash
cd docker
cp .env.example .env
# Edit .env and add your API keys/Firebase config
docker compose up -d
```

After running, you can access the application at `http://localhost:8080`.

## Project Structure
- `/src`: React source code
- `/components`: Reusable UI components
- `/views`: Main application pages
- `/lib`: Utilities and Firebase config
- `/docker`: Docker Compose configuration and environment templates
- `/server.js`: Express backend proxy for Dify API
- `Dockerfile`: Multi-stage build for frontend and backend
