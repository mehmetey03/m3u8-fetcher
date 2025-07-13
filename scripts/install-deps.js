const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Gerekli bağımlılıklar yükleniyor...');

try {
  // Chromium-min paketini kontrol et
  const chromiumPath = path.join(__dirname, '../node_modules/@sparticuz/chromium-min');
  if (!fs.existsSync(chromiumPath)) {
    console.log('Chromium-min paketi bulunamadı, yeniden yükleniyor...');
    execSync('npm install @sparticuz/chromium-min --force', { stdio: 'inherit' });
  }

  // Statik linked Chromium binary kullan
  console.log('Chromium binary kontrol ediliyor...');
  const chromiumBinary = path.join(chromiumPath, 'bin/chromium');
  if (!fs.existsSync(chromiumBinary)) {
    throw new Error('Chromium binary bulunamadı!');
  }

  console.log('Bağımlılıklar başarıyla yüklendi');
} catch (error) {
  console.error('Kurulum hatası:', error);
  process.exit(1);
}
