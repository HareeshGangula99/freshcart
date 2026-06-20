// Run: node generate-icons.js
// Creates PWA icons from SVG

const fs = require('fs');
const path = require('path');

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#059669"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="white">🛒</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#059669"/>
  <text x="256" y="350" font-size="260" text-anchor="middle" fill="white">🛒</text>
</svg>`;

const publicDir = path.join(__dirname, 'public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), svg192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), svg512);

console.log('SVG icons created in public/');
console.log('NOTE: Use https://favicon.io/ to convert SVG to PNG for production');
console.log('Or use any online SVG to PNG converter');
