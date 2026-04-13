# Fix PWA Icon 404 Errors

## Problem
The PWA manifest is trying to load multiple icon sizes but they don't exist yet, causing 404 errors.

## Quick Fix (Run Now)

### Windows:
1. Open Command Prompt or File Explorer
2. Navigate to: `c:\wedo\impacthub-main\impacthub-main\frontend`
3. Double-click `create-pwa-icons.bat`
   
   OR run in terminal:
   ```cmd
   cd c:\wedo\impacthub-main\impacthub-main\frontend
   create-pwa-icons.bat
   ```

This will copy your logo.png to all required icon sizes.

## Alternative Methods

### Method 1: Use Node.js
```bash
cd frontend
node generate-icons.js
```

### Method 2: Use Python
```bash
cd frontend
python generate-icons.py
```

### Method 3: Online Tool (Best Quality)
1. Go to https://realfavicongenerator.net/
2. Upload `public/icons/logo.png`
3. Configure settings
4. Download and extract to `public/icons/`

## After Running

Restart your dev server and the 404 errors will be gone!

The icons will be:
- ✅ icon-72x72.png
- ✅ icon-96x96.png
- ✅ icon-128x128.png
- ✅ icon-144x144.png
- ✅ icon-152x152.png
- ✅ icon-192x192.png
- ✅ icon-384x384.png
- ✅ icon-512x512.png

## Production Recommendation

For production apps, use properly resized icons instead of copies. The quick fix works for testing, but use realfavicongenerator.net or sharp (npm package) for production.
