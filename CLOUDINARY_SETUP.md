# Cloudinary Setup Guide

## Quick Start

### 1. Create a Cloudinary Account
- Go to https://cloudinary.com/
- Sign up for a free account
- You'll get a free tier with 25GB storage

### 2. Get Your Cloud Name
1. Click on **Settings** in the top right
2. Go to **API Keys** tab
3. Copy your **Cloud Name**

### 3. Create an Upload Preset (IMPORTANT)
1. Go to **Settings** > **Upload**
2. Click **Add upload preset**
3. Set:
   - **Name**: `default` (or any name you prefer)
   - **Sign the URL**: `Off` (unsigned mode - safer for public use)
   - **Folder**: `online-store/products` (optional, for organization)
4. Click **Create**
5. Copy the preset name

### 4. Configure Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Add your Cloudinary credentials:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=default
   ```
3. Save and restart the dev server

### 5. Test the Feature
- Go to `/seller/products` or `/admin` (Products tab)
- Click "Add Product" and try uploading an image
- You should see:
  - **Instant preview** (base64 while uploading)
  - **Loading spinner** (during cloud upload)
  - **Green cloud badge** (when successfully uploaded to Cloudinary)

## Features

✅ **Instant Preview** - Users see the image immediately (base64)
✅ **Background Upload** - Uploads to Cloudinary without blocking the form
✅ **Cloud Storage** - Images stored in Cloudinary's CDN
✅ **Fallback** - If upload fails, base64 is kept as fallback
✅ **Status Indicators** - Green cloud badge for uploaded images, amber "Local" for base64

## Cloudinary Pricing (Free Tier)
- 25 GB storage
- 25 GB bandwidth/month
- Unlimited transformations and optimizations
- Perfect for learning and small projects

## Advanced Features (Optional)

### Image Optimization
Add transformations to auto-optimize images:
```javascript
// Cloudinary URL automatically optimizes:
// https://res.cloudinary.com/{cloud}/{type}/{id}/c_fill,w_500,h_500,q_auto/...
```

### Image Transformations
In Cloudinary URLs, add transformations:
- `w_500` - Width
- `h_500` - Height
- `c_fill` - Crop to fill
- `q_auto` - Auto quality
- `f_auto` - Auto format

Example: `https://res.cloudinary.com/{cloud}/{id}/c_fill,w_500,h_500,q_auto,f_auto`

## Troubleshooting

### 404 Error on Upload
- Check your `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is correct
- Verify upload preset exists and is set to unsigned mode
- Restart dev server after changing env vars

### CORS Errors
- Cloudinary handles CORS automatically
- Make sure you're using a signed/unsigned preset correctly

### Missing Cloud Badge
- Check browser console for upload errors
- The image still works (base64 fallback)
- Re-upload to send to Cloudinary again

## Security Notes

⚠️ **NEVER** expose your API Secret in frontend code
✅ Use unsigned presets for client-side uploads
✅ Upload presets can restrict file types and sizes
✅ The env vars starting with `NEXT_PUBLIC_` are safe to expose

## Next Steps

After setup:
1. Test uploading images as seller or admin
2. Verify images appear in Cloudinary dashboard
3. Access images by their Cloudinary URLs
4. (Optional) Add image transformations for product images
