const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

// Chromium ayarları
chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;

exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id;
    
    if (!id || isNaN(Number(id))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Geçerli ID gereklidir',
          usage: '/fetch?id=STREAM_ID'
        })
      };
    }

    // Chromium yolunu al
    const chromiumPath = process.env.CHROMIUM_PATH || await chromium.executablePath();
    console.log('Chromium path:', chromiumPath);

    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
      ],
      executablePath: chromiumPath,
      headless: true,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setDefaultNavigationTimeout(8000);

    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    let m3u8Url = null;

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    if (!m3u8Url) {
      const content = await page.content();
      const matches = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      m3u8Url = matches?.[0];
    }

    await browser.close();

    if (!m3u8Url) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Akış bulunamadı' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        originalUrl: m3u8Url
      })
    };

  } catch (error) {
    console.error('HATA:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Tarayıcı hatası',
        message: error.message.includes('libnspr4.so') 
          ? 'Sistem bağımlılıkları yüklenemedi' 
          : error.message
      })
    };
  }
};
