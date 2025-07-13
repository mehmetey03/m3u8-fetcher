const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

exports.handler = async (event) => {
  try {
    // Chromium executable path kontrolü
    let chromiumPath;
    try {
      chromiumPath = await chromium.executablePath();
      console.log('Chromium path:', chromiumPath);
    } catch (err) {
      console.error('Chromium path hatası:', err);
      throw new Error('Chromium başlatılamadı: Yol bulunamadı');
    }

    const id = event.queryStringParameters?.id;
    
    if (!id || isNaN(Number(id))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Geçerli bir ID parametresi gereklidir',
          usage: '/fetch?id=5062'
        })
      };
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: chromiumPath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
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
      timeout: 8000
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
        body: JSON.stringify({ error: 'M3U8 URL bulunamadı' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        originalUrl: m3u8Url,
        id: id
      })
    };
  } catch (error) {
    console.error('Hata detayı:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Sunucu hatası',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
