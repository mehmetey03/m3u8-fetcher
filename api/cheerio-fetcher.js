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
    const $ = cheerio.load(html);
    
    // Cloudflare Worker Pattern'ini destekleyen arama
    const findStreamUrl = () => {
      // 1. Cloudflare Worker URL pattern'i
      const cfWorkerPattern = /https?:\/\/[a-z0-9.-]+\.workers\.dev\/[a-f0-9]+\/-\/\d+\/playlist\.m3u8\?verify=[^"']+/i;
      const cfMatch = html.match(cfWorkerPattern);
      if (cfMatch) return cfMatch[0];

      // 2. iframe src'leri (özellikle .workers.dev içerenler)
      const iframes = $('iframe[src*="workers.dev"]').toArray();
      for (const iframe of iframes) {
        const src = $(iframe).attr('src');
        if (src && src.includes('playlist.m3u8')) {
          return src;
        }
      }

      // 3. Script içindeki özel pattern
      const scripts = $('script:not([src])').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';
        const workerUrlMatch = content.match(/"(https?:\/\/[^"]+\.workers\.dev[^"]+\.m3u8[^"]*)"/i);
        if (workerUrlMatch) return workerUrlMatch[1];
      }

      // 4. data-* attribute'ları
      const dataElems = $('[data-stream],[data-url]').toArray();
      for (const elem of dataElems) {
        const url = $(elem).attr('data-stream') || $(elem).attr('data-url');
        if (url && url.includes('workers.dev') && url.includes('.m3u8')) {
          return url;
        }
      }

      return null;
    };

    let streamUrl = findStreamUrl();

    // URL doğrulama
    if (streamUrl && !streamUrl.startsWith('http')) {
      try {
        streamUrl = new URL(streamUrl, targetUrl).toString();
      } catch (e) {
        console.error('URL parse hatası:', e);
        streamUrl = null;
      }
    }

    if (!streamUrl) {
      // Debug için önemli HTML kısımları
      const debugSections = {
        iframes: $('iframe').map((i, el) => $(el).attr('src')).get(),
        scripts: $('script').map((i, el) => $(el).html().substring(0, 100)).get(),
        metaTags: $('meta[content*="m3u8"]').map((i, el) => $(el).attr('content')).get()
      };

      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Akış URLsi bulunamadı',
          debug: debugSections,
          suggestions: [
            'Site yapısı değişmiş olabilir',
            'Cloudflare Worker URL patternini kontrol edin',
            'Farklı bir ID deneyin (5062 yerine 5063 gibi)'
          ]
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(streamUrl)}`,
        originalUrl: streamUrl,
        id: id,
        source: 'cloudflare-worker'
      })
    };

  } catch (error) {
    console.error('HATA:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'İşlem hatası',
        message: error.message.replace(/https?:\/\/[^\s]+/g, '***URL_SCRUBBED***'),
        type: error.name
      })
    };
  }
};
