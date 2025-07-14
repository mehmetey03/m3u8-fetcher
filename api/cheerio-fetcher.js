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

    const $ = cheerio.load(html);

    // 1. Geniş .m3u8 linki araması (workers.dev, veya genel)
    let m3u8Links = [];

    // a) Direkt HTML içi tüm m3u8 linklerini yakala
    const generalMatches = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
    if (generalMatches && generalMatches.length) {
      m3u8Links.push(...generalMatches);
    }

    // b) iframe içi kontrol
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('.m3u8')) m3u8Links.push(src);
    });

    // c) data-url veya data-src attribute'ları
    $('[data-url],[data-src]').each((i, el) => {
      const url = $(el).attr('data-url') || $(el).attr('data-src');
      if (url && url.includes('.m3u8')) m3u8Links.push(url);
    });

    // d) script içindeki JSON veya raw link araması
    $('script:not([src])').each((i, el) => {
      const content = $(el).html() || '';
      // JSON içindeki stream_url
      const jsonMatch = content.match(/"stream_url"\s*:\s*"([^"]+\.m3u8)"/i);
      if (jsonMatch) m3u8Links.push(jsonMatch[1]);

      // Raw m3u8 linki
      const rawMatch = content.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
      if (rawMatch) m3u8Links.push(rawMatch[0]);
    });

    // Tekrarlayan linkleri temizle
    m3u8Links = [...new Set(m3u8Links)];

    if (m3u8Links.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'M3U8 bulunamadı',
          suggestions: [
            'ID yanlış olabilir veya',
            'Site yapısı değişmiş olabilir.',
            'HTML çıktısını inceleyin.'
          ],
          htmlSnippet: html.substring(0, 500) + '...'
        })
      };
    }

    // İlk bulduğumuz linki döndür
    const foundUrl = m3u8Links[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(foundUrl)}`,
        originalUrl: foundUrl,
        id: id,
        allFound: m3u8Links,
        detectedBy: 'general-scan'
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
