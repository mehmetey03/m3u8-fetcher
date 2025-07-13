const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  try {
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

    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://macizlevip315.shop/'
      },
      timeout: 8000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Gelişmiş M3U8 arama algoritması
    const findM3u8 = () => {
      // 1. Doğrudan iframe src'leri
      const iframes = $('iframe[src*=".m3u8"], iframe[src*="stream"]').toArray();
      for (const iframe of iframes) {
        const src = $(iframe).attr('src');
        if (src && (src.includes('.m3u8') || src.includes('stream'))) {
          return src;
        }
      }

      // 2. Scriptlerde JSON verisi içinde arama
      const scripts = $('script:not([src])').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';
        
        // JSON verisi içinde M3U8 ara
        const jsonMatch = content.match(/"url":"(https?:\/\/[^"]+\.m3u8[^"]*)"/i);
        if (jsonMatch) return jsonMatch[1];
        
        // Base64 kodlu URL'ler
        const base64Match = content.match(/"([a-zA-Z0-9+/=]+\.m3u8)"/i);
        if (base64Match) {
          try {
            return Buffer.from(base64Match[1], 'base64').toString('utf-8');
          } catch (e) {}
        }
      }

      // 3. Video player bileşenleri
      const videoSources = $('video source, audio source').toArray();
      for (const source of videoSources) {
        const src = $(source).attr('src');
        if (src && src.includes('.m3u8')) return src;
      }

      // 4. data-src, data-url gibi özellikler
      const dataAttrs = $('[data-src*=".m3u8"], [data-url*=".m3u8"]').toArray();
      for (const elem of dataAttrs) {
        const src = $(elem).attr('data-src') || $(elem).attr('data-url');
        if (src) return src;
      }

      return null;
    };

    let m3u8Url = findM3u8();

    // URL normalleştirme
    if (m3u8Url && !m3u8Url.startsWith('http')) {
      m3u8Url = new URL(m3u8Url, targetUrl).toString();
    }

    if (!m3u8Url) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'M3U8 bulunamadı',
          debug: {
            searchedElements: {
              iframes: $('iframe').length,
              scripts: $('script').length,
              videoSources: $('video source, audio source').length
            }
          }
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
        message: error.message
      })
    };
  }
};
