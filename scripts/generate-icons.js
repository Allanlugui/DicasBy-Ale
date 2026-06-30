import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const imagesDir = path.join(__dirname, '../src/assets/images');

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

  // Process screenshots if they exist
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    
    // Find latest desktop screenshot
    const desktopFile = files
      .filter(f => f.startsWith('screenshot_desktop') && f.endsWith('.jpg'))
      .sort()
      .pop();

    // Find latest mobile screenshot
    const mobileFile = files
      .filter(f => f.startsWith('screenshot_mobile') && f.endsWith('.jpg'))
      .sort()
      .pop();

    if (desktopFile) {
      const srcPath = path.join(imagesDir, desktopFile);
      const destPath = path.join(publicDir, 'screenshot-desktop.jpg');
      console.log(`Resizing desktop screenshot: ${desktopFile} -> screenshot-desktop.jpg`);
      await sharp(srcPath)
        .resize(1280, 720, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(destPath);
    } else {
      console.log('No generated desktop screenshot found in src/assets/images');
    }

    if (mobileFile) {
      const srcPath = path.join(imagesDir, mobileFile);
      const destPath = path.join(publicDir, 'screenshot-mobile.jpg');
      console.log(`Resizing mobile screenshot: ${mobileFile} -> screenshot-mobile.jpg`);
      await sharp(srcPath)
        .resize(720, 1280, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(destPath);
    } else {
      console.log('No generated mobile screenshot found in src/assets/images');
    }
  }
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
