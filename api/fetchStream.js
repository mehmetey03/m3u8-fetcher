const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// Middleware for JSON responses
app.use(express.json());

app.get('/fetch', async (req, res) => {
  const { id = '5062' } = req.query;
  
  // Enhanced ID validation
  if (!id.match(/^\d+$/)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Geçersiz ID. Sadece sayısal değer kabul edilir.' 
    });
  }

  const url = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      timeout: 15000 // 15 second timeout for launch
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set page timeout
    await page.setDefaultNavigationTimeout(10000); // 10 seconds
    
    // Navigate with more reliable waitUntil
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Wait for potential dynamic content
    await page.waitForTimeout(3000); // Additional 3 seconds wait

    // Multiple URL pattern matching
    const content = await page.content();
    const urlPatterns = [
      /(https?:\/\/[^\s"']+\.m3u8[^\s"']*chunklist[^\s"']*)/i,
      /(https?:\/\/[^\s"']+\.m3u8[^\s"']*index[^\s"']*)/i,
      /(https?:\/\/[^\s"']+\.m3u8)/i
    ];

    let m3u8Url = null;
    for (const pattern of urlPatterns) {
      const match = content.match(pattern);
      if (match) {
        m3u8Url = match[1];
        break;
      }
    }

    if (m3u8Url) {
      res.json({ 
        success: true, 
        url: m3u8Url,
        id: id
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'm3u8 URL bulunamadı',
        content: content // For debugging (remove in production)
      });
    }

  } catch (e) {
    console.error('Hata:', e);
    res.status(500).json({ 
      success: false, 
      error: e.message,
      stack: e.stack // For debugging (remove in production)
    });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}/fetch?id=5062`));
