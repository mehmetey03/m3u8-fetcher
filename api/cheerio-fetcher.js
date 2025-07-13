const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  try {
    // ID parametre kontrolü
    const { id } = event.queryStringParameters || {};
    if (!id || !/^\d+$/.test(id)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Geçersiz ID',
          message: 'Lütfen sayısal bir ID girin (örn: ?id=5062)'
        })
      };
    }

    // HTTP isteği
    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // HTML analizi
    const $ = cheerio.load(await response.text());
    
    // M3U8 arama
    const m3u8Url = findM3u8Url($);
    
    if (!m3u8Url) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'M3U8 bulunamadı' })
      };
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
        error: 'İşlem hatası',
        message: error.message
      })
    };
  }
};

function findM3u8Url($) {
  // 1. iframe kontrolü
  const iframeSrc = $('iframe[src*=".m3u8"]').attr('src');
  if (iframeSrc) return iframeSrc;

  // 2. script içerikleri
  const scripts = $('script').toArray();
  for (const script of scripts) {
    const match = ($(script).html() || '').match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
    if (match) return match[0];
  }

  // 3. video source
  return $('video source[src*=".m3u8"]').attr('src');
}
