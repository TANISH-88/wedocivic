const fs = require('fs');
const path = require('path');

console.log(`
🎨 PWA Icon Generator Setup
============================

Your app needs multiple icon sizes for PWA installation.

OPTION 1 - Use Online Tool (Recommended):
-----------------------------------------
1. Go to: https://realfavicongenerator.net/
2. Upload your logo: frontend/public/icons/logo.png
3. Download the generated icons
4. Extract to: frontend/public/icons/

OPTION 2 - Install Sharp and Auto-Generate:
-------------------------------------------
Run these commands:
  cd frontend
  npm install --save-dev sharp
  node generate-icons.js

OPTION 3 - Manual Copy (Quick Fix):
-----------------------------------
If your logo.png is already 512x512 or larger, you can copy it to all sizes:

`);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourcePath = path.join(__dirname, 'public', 'icons', 'logo.png');
const outputDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(sourcePath)) {
  console.error('❌ Error: logo.png not found at public/icons/logo.png');
  process.exit(1);
}

console.log('Copying logo.png to all required sizes...\n');

sizes.forEach(size => {
  const destPath = path.join(outputDir, `icon-${size}x${size}.png`);
  fs.copyFileSync(sourcePath, destPath);
  console.log(`✅ Created icon-${size}x${size}.png`);
});

console.log('\n🎉 Icons generated! (Note: These are copies, not resized)');
console.log('For production, use OPTION 1 or 2 above for properly sized icons.');

