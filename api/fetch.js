const puppeteer = require('puppeteer');

exports.handler = async (event) => {
  const { id } = event.pathParameters || {};
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(`https://macizlevip315.shop/match-center.php?id=${id}`, {
      waitUntil: 'networkidle2',
      timeout: 8000
    });

    let m3u8Url = null;
    
    // 1. Response'lardan M3U8 bulma
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    // 2. Sayfa içeriğinde arama
    const content = await page.content();
    const urlMatch = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
    m3u8Url = m3u8Url || urlMatch?.[0];

    await browser.close();

    if (!m3u8Url) {
      throw new Error('M3U8 URL bulunamadı');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        originalUrl: m3u8Url
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
  }
};
