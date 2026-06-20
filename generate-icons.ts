import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#059669"/>
  <rect x="40" y="40" width="432" height="432" rx="80" fill="#059669"/>
  <text x="256" y="320" font-size="240" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">FC</text>
  <rect x="100" y="350" width="312" height="6" rx="3" fill="rgba(255,255,255,0.4)"/>
  <text x="256" y="400" font-size="48" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-weight="500">FRESH</text>
</svg>`;

async function generateIcons() {
  await sharp(Buffer.from(svgIcon)).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(Buffer.from(svgIcon)).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('PWA icons generated: icon-192.png, icon-512.png');
}

generateIcons().catch(console.error);
