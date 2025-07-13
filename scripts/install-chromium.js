const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Chromium kurulumu başlatılıyor...');

try {
  // Chromium paketini kontrol et
  const chromiumPath = path.join(__dirname, '../node_modules/@sparticuz/chromium');
  if (!fs.existsSync(chromiumPath)) {
    console.log('@sparticuz/chromium paketi bulunamadı, yeniden yükleniyor...');
    execSync('npm install @sparticuz/chromium --force', { stdio: 'inherit' });
  }

  // Chromium binary kontrolü
  const binPath = path.join(chromiumPath, 'bin');
  if (!fs.existsSync(binPath)) {
    console.log('Chromium binary bulunamadı, yeniden yükleniyor...');
    execSync('npx @sparticuz/chromium install', { stdio: 'inherit' });
  }

  console.log('Chromium kurulumu tamamlandı');
} catch (error) {
  console.error('Chromium kurulum hatası:', error);
  process.exit(1);
}
