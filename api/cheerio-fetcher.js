const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  try {
    // Zaman aşımı kontrolü
    const timeRemaining = context.getRemainingTimeInMillis();
    if (timeRemaining < 3000) {
      throw new Error('Fonksiyon zaman aşımına uğrayacak');
    }

    // ID parametresi kontrolü
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

    // HTTP isteği için timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const targetUrl = `https://macizlevip315.shop/match-center.php?id=${id}`;
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // M3U8 URL'sini bulma
    const potentialSources = [
      () => $('iframe[src*=".m3u8"]').attr('src'),
      () => {
        const scriptContent = $('script').html() || '';
        const match = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
        return match?.[0];
      },
      () => $('video source[src*=".m3u8"]').attr('src')
    ];

    let m3u8Url = null;
    for (const source of potentialSources) {
      m3u8Url = source();
      if (m3u8Url) break;
    }

    if (!m3u8Url) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'M3U8 akışı bulunamadı' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        id: id
      })
    };

  } catch (error) {
    console.error('HATA:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Fonksiyon hatası',
        message: error.message,
        type: error.name
      })
    };
  }
};
