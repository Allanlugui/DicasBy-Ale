import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');

async function generate() {
  console.log('Generating PWA icons from SVG...');

  // Standard icon
  const iconSvg = path.join(publicDir, 'icon.svg');
  await sharp(iconSvg).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(iconSvg).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));

  // Maskable icon
  const maskableSvg = path.join(publicDir, 'icon-maskable.svg');
  await sharp(maskableSvg).resize(192, 192).png().toFile(path.join(publicDir, 'icon-maskable-192.png'));
  await sharp(maskableSvg).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));

  console.log('Icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
