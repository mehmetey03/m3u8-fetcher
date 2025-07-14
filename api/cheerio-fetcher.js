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

    const AbortController = globalThis.AbortController || require('abort-controller');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://macizlevip315.shop/'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    const cfWorkerPatterns = [
      /https?:\/\/[a-z0-9.-]+\.workers\.dev\/[a-f0-9]+\/-\/\d+\/playlist\.m3u8\?verify=[a-f0-9~%]+/i,
      /https?:\/\/[a-z0-9.-]+\.workers\.dev\/[a-f0-9]+\/\d+\/[^"'\s]+\.m3u8/i,
      /"([a-zA-Z0-9+/=]+\.m3u8)"/i
    ];

    for (const pattern of cfWorkerPatterns) {
      const matches = html.match(pattern);
      if (matches && matches[0]) {
        let foundUrl = matches[0];
        // Base64 kontrolü:
        if (pattern.toString() === cfWorkerPatterns[2].toString()) {
          try {
            foundUrl = Buffer.from(matches[1], 'base64').toString('utf-8');
          } catch (e) {
            continue;
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ 
            url: `/.netlify/functions/proxy?url=${encodeURIComponent(foundUrl)}`,
            originalUrl: foundUrl,
            id: id,
            detectedBy: 'direct-pattern-match'
          })
        };
      }
    }

    const $ = cheerio.load(html);

    const iframeSrc = $('iframe[src*="workers.dev"], iframe[src*="m3u8"]').attr('src');
    if (iframeSrc && iframeSrc.includes('.m3u8')) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          url: `/.netlify/functions/proxy?url=${encodeURIComponent(iframeSrc)}`,
          originalUrl: iframeSrc,
          id: id,
          detectedBy: 'iframe-src'
        })
      };
    }

    const scripts = $('script:not([src])').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';
      const jsonMatch = content.match(/"stream_url":"(https?:\/\/[^"]+\.m3u8)"/i);
      if (jsonMatch) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            url: `/.netlify/functions/proxy?url=${encodeURIComponent(jsonMatch[1])}`,
            originalUrl: jsonMatch[1],
            id: id,
            detectedBy: 'script-json'
          })
        };
      }

      const rawMatch = content.match(/(https?:\/\/[^\s"']+\.workers\.dev[^\s"']*\.m3u8[^\s"']*)/i);
      if (rawMatch) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            url: `/.netlify/functions/proxy?url=${encodeURIComponent(rawMatch[0])}`,
            originalUrl: rawMatch[0],
            id: id,
            detectedBy: 'script-raw'
          })
        };
      }
    }

    const dataElems = $('[data-url],[data-src]').toArray();
    for (const elem of dataElems) {
      const url = $(elem).attr('data-url') || $(elem).attr('data-src');
      if (url && url.includes('workers.dev') && url.includes('.m3u8')) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            url: `/.netlify/functions/proxy?url=${encodeURIComponent(url)}`,
            originalUrl: url,
            id: id,
            detectedBy: 'data-attribute'
          })
        };
      }
    }

    const debugInfo = {
      patternsTried: cfWorkerPatterns.map(p => p.toString()),
      htmlSnippet: html.substring(0, 500) + '...',
      iframeCount: $('iframe').length,
      scriptCount: $('script').length,
      dataAttrCount: $('[data-url],[data-src]').length
    };

    return {
      statusCode: 404,
      body: JSON.stringify({ 
        error: 'M3U8 bulunamadı',
        debug: debugInfo,
        suggestions: [
          'Site yapısı değişmiş olabilir',
          'Farklı bir ID deneyin (5062 yerine 5061 gibi)',
          'HTML çıktısını inceleyin'
        ]
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
