const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');

exports.handler = async (event) => {
  const { id } = event.pathParameters || {};
  
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'ID parametresi gereklidir' })
    };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setDefaultNavigationTimeout(10000);

    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    let m3u8Url = null;

    // Response'lardan M3U8 URL'sini yakala
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 15000
    });

    // Sayfa içeriğinde M3U8 ara
    if (!m3u8Url) {
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
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  } finally {
    if (browser) await browser.close();
  }
};
