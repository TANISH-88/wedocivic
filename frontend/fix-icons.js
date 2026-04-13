const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const androidSizes = [48, 72, 96, 144, 192];
const sourceFile = 'web-app-manifest-512x512.png';
const source = path.join(__dirname, 'public', 'icons', sourceFile);
const iconsDir = path.join(__dirname, 'public', 'icons');
const androidDir = path.join(__dirname, 'public', 'icons', 'android');

console.log('🎨 Creating PWA icons from existing icon...\n');

// Check if source exists
if (!fs.existsSync(source)) {
  console.error(`❌ Error: ${sourceFile} not found!`);
  console.log('Available files:', fs.readdirSync(iconsDir).join(', '));
  process.exit(1);
}

// Create android directory if it doesn't exist
if (!fs.existsSync(androidDir)) {
  fs.mkdirSync(androidDir, { recursive: true });
  console.log('📁 Created android directory\n');
}

// Generate standard PWA icons
console.log('Creating PWA icons:');
sizes.forEach(size => {
  const dest = path.join(iconsDir, `icon-${size}x${size}.png`);
  try {
    fs.copyFileSync(source, dest);
    console.log(`  ✅ icon-${size}x${size}.png`);
  } catch (error) {
    console.error(`  ❌ Failed to create icon-${size}x${size}.png:`, error.message);
  }
});

// Generate Android launcher icons
console.log('\nCreating Android launcher icons:');
androidSizes.forEach(size => {
  const dest = path.join(androidDir, `launchericon-${size}x${size}.png`);
  try {
    fs.copyFileSync(source, dest);
    console.log(`  ✅ android/launchericon-${size}x${size}.png`);
  } catch (error) {
    console.error(`  ❌ Failed to create launchericon-${size}x${size}.png:`, error.message);
  }
});

console.log('\n🎉 Done! All PWA and Android icons created.');
console.log('Note: Icons are copies of the 512x512 source.');
console.log('For production, consider using properly resized icons.');
