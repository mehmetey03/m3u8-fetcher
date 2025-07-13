const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch').default;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// M3U8 Proxy Endpoint
app.get('/proxy', async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({ error: 'URL parametresi gereklidir' });
    }

    const targetUrl = decodeURIComponent(req.query.url);
    const allowedDomains = ['macizlevip315.shop', 'example.com'];
    const urlObj = new URL(targetUrl);

    if (!allowedDomains.includes(urlObj.hostname)) {
      return res.status(403).json({ error: 'İzin verilmeyen domain' });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': urlObj.origin,
        'Accept': '*/*'
      },
      timeout: 5000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');

    if (isM3U8) {
      let text = await response.text();
      
      text = text.split('\n').map(line => {
        if (line.trim() && !line.startsWith('#') && (line.endsWith('.ts') || line.startsWith('http'))) {
          return `/proxy?url=${encodeURIComponent(line.trim())}`;
        }
        return line;
      }).join('\n');

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(text);
    }

    res.set('Content-Type', contentType);
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: `Proxy hatası: ${error.message}` });
  }
});

// Stream Bulucu Endpoint
app.get('/stream/:id', async (req, res) => {
  const { id } = req.params;
  const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
      timeout: 30000
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(15000);
    await page.setDefaultTimeout(10000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    let m3u8Url = null;

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

    // 5 saniye bekleyerek m3u8 URL'sinin bulunmasını sağla
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (!m3u8Url) {
      const content = await page.content();
      const urlMatch = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      m3u8Url = urlMatch?.[1];
    }

    if (!m3u8Url) {
      return res.status(404).json({ error: 'M3U8 URL bulunamadı' });
    }

    res.json({ 
      url: `/proxy?url=${encodeURIComponent(m3u8Url)}`,
      originalUrl: m3u8Url,
      id: id
    });

  } catch (error) {
    console.error('Stream Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Ana Endpoint
app.get('/fetch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Stream endpointini çağır
    const streamResponse = await fetch(`http://${req.headers.host}/stream/${id}`);
    if (!streamResponse.ok) {
      throw new Error(await streamResponse.text());
    }

    const { url } = await streamResponse.json();
    
    // Proxy endpointini çağır
    const m3u8Response = await fetch(`http://${req.headers.host}${url}`);
    if (!m3u8Response.ok) {
      throw new Error('M3U8 içeriği alınamadı');
    }

    const m3u8Content = await m3u8Response.text();
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8Content);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vercel için export
module.exports = app;

// Lokal geliştirme için
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`Test Endpoint: http://localhost:${PORT}/fetch/5062`);
  });
}
