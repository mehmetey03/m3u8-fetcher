const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

exports.handler = async (event) => {
  // Hata yönetimi için try-catch bloğu
  try {
    const id = event.queryStringParameters?.id;
    
    // ID parametresi kontrolü
    if (!id || isNaN(Number(id))) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          error: 'Geçersiz ID',
          message: 'Lütfen geçerli bir sayısal ID girin (örn: ?id=5062)',
          usage: 'https://your-site.netlify.app/fetch?id=STREAM_ID'
        })
      };
    }

    // Chromium başlatma
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 8000
    });

    const page = await browser.newPage();
    
    // Tarayıcı ayarları
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setDefaultNavigationTimeout(8000);

    // M3U8 URL'sini bulma
    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    let m3u8Url = null;

    // Response listener
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    // Sayfaya git
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 8000
    });

    // Fallback arama
    if (!m3u8Url) {
      const content = await page.content();
      const matches = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      m3u8Url = matches?.[0];
    }

    // Tarayıcıyı kapat
    await browser.close();

    if (!m3u8Url) {
      return {
        statusCode: 404,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          error: 'M3U8 akışı bulunamadı',
          suggestion: 'Farklı bir ID deneyin'
        })
      };
    }

    // Başarılı yanıt
    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        originalUrl: m3u8Url,
        id: id
      })
    };

  } catch (error) {
    console.error('Hata:', error);
    
    // Özel hata mesajları
    let errorMessage = error.message;
    if (errorMessage.includes('timeout')) {
      errorMessage = 'İşlem zaman aşımına uğradı, lütfen tekrar deneyin';
    } else if (errorMessage.includes('failed to launch')) {
      errorMessage = 'Tarayıcı başlatılamadı, lütfen daha sonra tekrar deneyin';
    }

    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        error: 'İç sunucu hatası',
        message: errorMessage,
        suggestion: 'Lütfen daha sonra tekrar deneyin veya farklı bir ID kullanın'
      })
    };
  }
};
