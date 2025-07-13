const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

// Chromium için özel yapılandırma
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

exports.handler = async (event) => {
  try {
    // ID parametresini al
    const id = event.queryStringParameters?.id;
    
    if (!id || isNaN(Number(id))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Geçersiz ID',
          message: 'Lütfen geçerli bir sayısal ID girin (örn: ?id=5062)'
        })
      };
    }

    // Chromium yolunu al
    const chromiumPath = await chromium.executablePath();
    console.log('Chromium executable path:', chromiumPath);

    // Tarayıcıyı başlat
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote',
        '--disable-gpu'
      ],
      executablePath: chromiumPath,
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 8000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setDefaultNavigationTimeout(10000);

    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    let m3u8Url = null;

    // M3U8 URL'sini yakala
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Fallback kontrol
    if (!m3u8Url) {
      const content = await page.content();
      const matches = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      m3u8Url = matches?.[0];
    }

    await browser.close();

    if (!m3u8Url) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'M3U8 akışı bulunamadı' })
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
    console.error('HATA DETAYI:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Tarayıcı başlatılamadı',
        message: 'Sistem kütüphaneleri eksik veya yapılandırma hatası',
        solution: 'Lütfen alternatif yöntem deneyin (Cheerio) veya destek ekibine başvurun'
      })
    };
  }
};
