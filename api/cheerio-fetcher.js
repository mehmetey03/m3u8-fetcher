const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');

exports.handler = async (event) => {
  try {
    // ID parametresini al
    const { id } = event.queryStringParameters || {};
    
    if (!id || !/^\d+$/.test(id)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Geçersiz ID',
          message: 'Lütfen sayısal bir ID girin',
          example: 'https://metvmetv.netlify.app/.netlify/functions/cheerio-fetcher?id=5062'
        })
      };
    }

    // Hedef URL
    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    
    // Sayfayı çek
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://macizlevip315.shop/'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP Hatası: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    let m3u8Url = null;

    // 1. iframe'lerde ara
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('.m3u8')) {
        m3u8Url = src;
        return false; // Döngüyü sonlandır
      }
    });

    // 2. script etiketlerinde ara
    if (!m3u8Url) {
      $('script').each((i, el) => {
        const scriptContent = $(el).html() || '';
        const matches = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
        if (matches && matches[0]) {
          m3u8Url = matches[0];
          return false;
        }
      });
    }

    // 3. video source'larında ara
    if (!m3u8Url) {
      $('video source').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.includes('.m3u8')) {
          m3u8Url = src;
          return false;
        }
      });
    }

    if (!m3u8Url) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'M3U8 bulunamadı',
          suggestion: 'Farklı bir ID deneyin veya site yapısı değişmiş olabilir'
        })
      };
    }

    // URL'yi doğrula
    try {
      new URL(m3u8Url);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Geçersiz URL formatı',
          url: m3u8Url
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        originalUrl: m3u8Url,
        id: id,
        method: 'cheerio'
      })
    };

  } catch (error) {
    console.error('CHEERIO HATA:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'İşlem hatası',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
