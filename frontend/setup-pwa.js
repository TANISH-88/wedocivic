const fs = require('fs');
const path = require('path');

// Create public directory
const publicDir = path.join(__dirname, 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory');
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Created icons directory');
}

// Create manifest.json
const manifest = {
  name: "CivicImpact - Community Platform",
  short_name: "CivicImpact",
  description: "Social platform for citizens, NGOs, and volunteers to create positive community impact.",
  start_url: "/",
  display: "standalone",
  background_color: "#F8F9FA",
  theme_color: "#2C3E50",
  orientation: "portrait-primary",
  icons: [
    { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
    { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
    { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
    { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
    { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
    { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
  ]
};

fs.writeFileSync(
  path.join(publicDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('✅ Created manifest.json');

// Create placeholder SVG icons (convert these to PNG later)
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const createSvgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2C3E50"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}" fill="#8A9A8E"/>
  <text x="${size/2}" y="${size/2 + size*0.1}" font-family="Arial, sans-serif" font-size="${size*0.3}" fill="white" text-anchor="middle" font-weight="bold">CI</text>
</svg>`;

sizes.forEach(size => {
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}.svg`),
    createSvgIcon(size)
  );
});
console.log('✅ Created placeholder SVG icons');

// Create apple-touch-icon
fs.writeFileSync(
  path.join(publicDir, 'apple-touch-icon.png'),
  '' // Placeholder - needs actual PNG
);
fs.writeFileSync(
  path.join(publicDir, 'apple-touch-icon.svg'),
  createSvgIcon(180)
);
console.log('✅ Created apple-touch-icon.svg');

console.log('\n🎉 PWA setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Convert SVG icons to PNG using: https://realfavicongenerator.net');
console.log('   2. Run: npm install next-pwa');
console.log('   3. Run: npm run build');
console.log('   4. Test in browser DevTools → Application → Manifest');