const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium-min');

exports.handler = async (event) => {
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

  let browser;
  try {
    // Chromium ayarları
    const chromiumPath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: chromiumPath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setDefaultNavigationTimeout(10000);

    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    let m3u8Url = null;

    // Response listener
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Fallback kontrol
    if (!m3u8Url) {
      await page.waitForTimeout(3000); // Ek bekleme süresi
      const content = await page.content();
      const urlMatch = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      m3u8Url = urlMatch?.[0];
    }

    if (!m3u8Url) {
      throw new Error('M3U8 URL bulunamadı');
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
    console.error('Hata:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        suggestion: 'Lütfen farklı bir ID deneyin veya daha sonra tekrar deneyin'
      })
    };
  } finally {
    if (browser) await browser.close();
  }
};
