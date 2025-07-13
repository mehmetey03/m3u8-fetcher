const { execSync } = require('child_process');
const fs = require('fs');

console.log('Gerekli kütüphaneler yükleniyor...');

try {
  // Gerekli sistem kütüphanelerini yükle
  execSync('apt-get update && apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2', { 
    stdio: 'inherit' 
  });

  // Chromium'u yükle
  execSync('npx @sparticuz/chromium install', { stdio: 'inherit' });

  console.log('Bağımlılıklar başarıyla yüklendi');
} catch (error) {
  console.error('Kurulum hatası:', error);
  process.exit(1);
}
