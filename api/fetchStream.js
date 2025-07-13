const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  const { id = '5062' } = req.query;
  
  if (!id.match(/^\d+$/)) {
    return res.status(400).json({ 
      success: false,
      message: 'Geçersiz ID parametresi. Sadece sayı kabul edilir.'
    });
  }

  const url = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: 'new'
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    let m3u8Url = null;
    
    page.on('response', (response) => {
      const reqUrl = response.url();
      if (reqUrl.includes('.m3u8') && reqUrl.includes('chunklist')) {
        m3u8Url = reqUrl;
      }
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (!m3u8Url) {
      const pageContent = await page.content();
      const urlMatch = pageContent.match(/(https?:\/\/[^\s]+\.m3u8[^\s]*chunklist[^\s]*)/i);
      if (urlMatch) {
        m3u8Url = urlMatch[1];
      }
    }

    if (m3u8Url) {
      res.status(200).json({ 
        success: true,
        url: m3u8Url,
        id: id
      });
    } else {
      res.status(404).json({ 
        success: false,
        message: 'm3u8 yayın URLsi bulunamadı',
        id: id
      });
    }
  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ 
      success: false,
      message: 'Hata: ' + error.message,
      id: id
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};