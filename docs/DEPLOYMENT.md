# We3 Deployment Guide (`we3.live`)

## Production Hosting Architecture

* **Domain:** `https://we3.live`
* **Frontend:** Hosted on Vercel / Firebase Hosting
* **Backend API:** Express Node.js container on Cloud Run / Vercel Serverless Functions

## Production Build Script

```bash
# Run full Vitest suite
pnpm test

# Build production Vite assets
pnpm build
Environment Variables
Ensure the following variables are configured in your production host environment:

Code snippet
NODE_ENV=production
GEMINI_API_KEY=prod_gemini_key
FIREBASE_PROJECT_ID=we3-live
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@we3-live.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."