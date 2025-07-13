import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { URL } from 'url';

export const handler = async (event) => {
  try {
    // ID parametresini al ve doğrula
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

    // HTTP isteği yap
    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
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
    
    // M3U8 URL'sini ara
    const findM3u8 = () => {
      // 1. iframe'lerde ara
      const iframeSrc = $('iframe[src*=".m3u8"]').attr('src');
      if (iframeSrc) return iframeSrc;

      // 2. script içeriklerinde ara
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';
        const match = content.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
        if (match) return match[0];
      }

      // 3. video source'larında ara
      return $('video source[src*=".m3u8"]').attr('src');
    };

    const m3u8Url = findM3u8();

    if (!m3u8Url) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'M3U8 akışı bulunamadı',
          suggestion: 'Farklı bir ID deneyin veya site yapısı değişmiş olabilir'
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
        originalUrl: m3u8Url,
        id: id
      })
    };

  } catch (error) {
    console.error('HATA:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'İşlem hatası',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
