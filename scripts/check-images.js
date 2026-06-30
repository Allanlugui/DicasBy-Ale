import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');

function checkFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`${filePath}: DOES NOT EXIST`);
    return;
  }
  const stats = fs.statSync(fullPath);
  console.log(`${filePath}: Size = ${stats.size} bytes`);
  
  // Read first 16 bytes
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(fullPath, 'r');
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  
  console.log(`  First 16 bytes (hex): ${buffer.toString('hex')}`);
  console.log(`  First 16 bytes (text): ${buffer.toString('utf8').replace(/[^ -~]/g, '.')}`);
}

console.log('Checking PWA files...');
checkFile('public/icon-192.png');
checkFile('public/icon-512.png');
checkFile('public/icon-maskable-192.png');
checkFile('public/icon-maskable-512.png');
checkFile('public/screenshot-desktop.jpg');
checkFile('public/screenshot-mobile.jpg');
checkFile('dist/icon-192.png');
checkFile('dist/icon-512.png');
checkFile('dist/icon-maskable-192.png');
checkFile('dist/icon-maskable-512.png');
checkFile('dist/screenshot-desktop.jpg');
checkFile('dist/screenshot-mobile.jpg');
