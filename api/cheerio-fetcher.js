const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  try {
    const { id } = event.queryStringParameters || {};
    
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'ID gereklidir',
          usage: '/cheerio-fetch?id=STREAM_ID'
        })
      };
    }

    const response = await fetch(`https://macizlevip315.shop/match-center.php?id=${id}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 1. iframe src'lerinde ara
    let m3u8Url = $('iframe[src*=".m3u8"]').attr('src');
    
    // 2. script içeriklerinde ara
    if (!m3u8Url) {
      $('script').each((i, el) => {
        const scriptContent = $(el).html() || '';
        const matches = scriptContent.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
        if (matches) m3u8Url = matches[0];
      });
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
        originalUrl: m3u8Url,
        method: 'cheerio' // Hangi metodun çalıştığını belirtmek için
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Cheerio hatası',
        message: error.message
      })
    };
  }
};
