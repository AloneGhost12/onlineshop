# Vercel Frontend Setup (Next.js)

This guide deploys only the frontend (`frontend/`) to Vercel.

## 1) Import Project in Vercel

1. Open Vercel dashboard.
2. Click `Add New Project`.
3. Import your Git repository.
4. Set **Root Directory** to `frontend`.
5. Framework preset should auto-detect as `Next.js`.

## 2) Build Settings

Use defaults:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

## 3) Environment Variables (Recommended)

Add these in Vercel Project Settings -> Environment Variables:

- `NEXT_PUBLIC_API_URL` = your backend base URL + `/api`
  - Example: `https://onlineshop-f0lb.onrender.com/api`

Optional (if used in your app):
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## 4) Deploy

1. Click `Deploy`.
2. Wait for build to finish.
3. Open your Vercel URL and test:
   - Home page loads
   - Product listing works
   - Login/register requests hit backend API

## 5) Notes

- Frontend code includes Vercel hostname fallback for API calls, but setting `NEXT_PUBLIC_API_URL` is the best practice.
- If API requests fail in production, verify backend CORS allows your Vercel domain.
