const puppeteer = require('puppeteer');

exports.handler = async (event) => {
  const { id } = event.pathParameters || {};
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(`https://macizlevip315.shop/match-center.php?id=${id}`);
    
    // M3U8 URL'sini bulma kodu buraya
    const m3u8Url = await findM3U8Url(page);
    
    await browser.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url: m3u8Url })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function findM3U8Url(page) {
  // M3U8 bulma mantığınız burada
}
