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
      timeout: 10000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    
    // ÖNEMLİ: Direk HTML'de Cloudflare Worker patternini ara
    const cfWorkerPattern = /https?:\/\/[a-z0-9.-]+\.workers\.dev\/[a-f0-9]+\/-\/\d+\/playlist\.m3u8\?verify=[a-f0-9~%]+/gi;
    const cfMatches = html.match(cfWorkerPattern);
    
    if (cfMatches && cfMatches.length > 0) {
      // En uzun eşleşmeyi al (genellikle doğru olan bu)
      const m3u8Url = cfMatches.sort((a,b) => b.length - a.length)[0];
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          url: `/.netlify/functions/proxy?url=${encodeURIComponent(m3u8Url)}`,
          originalUrl: m3u8Url,
          id: id,
          detectedBy: 'direct-html-pattern'
        })
      };
    }

    // Cheerio ile detaylı arama
    const $ = cheerio.load(html);
    
    // 1. iframe'lerde worker URL ara
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('workers.dev') && src.includes('.m3u8')) {
        throw new FoundUrlException(src); // Özel exception ile çık
      }
    });

    // 2. script etiketlerinde ara
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      const match = content.match(/(https?:\/\/[^\s"']+\.workers\.dev[^\s"']*\.m3u8[^\s"']*)/i);
      if (match) throw new FoundUrlException(match[0]);
    });

    // 3. data-* attribute'larında ara
    $('[data-url],[data-src]').each((i, el) => {
      const url = $(el).attr('data-url') || $(el).attr('data-src');
      if (url && url.includes('workers.dev') && url.includes('.m3u8')) {
        throw new FoundUrlException(url);
      }
    });

    return {
      statusCode: 404,
      body: JSON.stringify({ 
        error: 'M3U8 bulunamadı',
        debug: {
          htmlSnippet: html.substring(0, 500) + '...',
          patternMatches: cfMatches || []
        }
      })
    };

  } catch (error) {
    if (error instanceof FoundUrlException) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          url: `/.netlify/functions/proxy?url=${encodeURIComponent(error.url)}`,
          originalUrl: error.url,
          id: id,
          detectedBy: error.source
        })
      };
    }

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

// Özel Exception Sınıfı
class FoundUrlException extends Error {
  constructor(url, source = 'cheerio-detection') {
    super('URL bulundu');
    this.url = url;
    this.source = source;
  }
}
