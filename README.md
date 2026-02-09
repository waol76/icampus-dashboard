# ICampus Dashboard

Financial dashboard for Innovation Campus with Google authentication.

## Setup

### 1. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (for production)
7. Copy the **Client ID** and **Client Secret**

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [Vercel](https://vercel.com) and import the repo
3. Add environment variables in Vercel dashboard:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Your Google Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google Client Secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `ALLOWED_EMAILS` | Comma-separated list: `email1@gmail.com,email2@gmail.com` |

4. Deploy!

### 3. Update Google OAuth

After deployment, go back to Google Cloud Console and add your Vercel URL to authorized redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
```

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in your credentials
3. Run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

## Usage

1. Sign in with an authorized Google account
2. **Revenue tab**: Upload `Facturación mensual.xlsx`
3. **Debt tab**: Upload `ICampus_Loans_Clean_v2.xlsx`
