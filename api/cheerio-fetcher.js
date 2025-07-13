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
    
    // 1. Gelişmiş M3U8 Arama Fonksiyonu
    const findM3u8Url = ($) => {
      // Strateji 1: iframe src'leri
      const iframes = $('iframe').toArray();
      for (const iframe of iframes) {
        const src = $(iframe).attr('src');
        if (src && (src.includes('m3u8') || src.includes('stream'))) {
          return src;
        }
      }

      // Strateji 2: Script içindeki JSON verileri
      const scripts = $('script:not([src])').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';
        
        // JSON formatında URL ara
        const jsonMatches = content.match(/(?:"|')(https?:\/\/[^"']+\.m3u8[^"']*)(?:"|')/gi);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            const url = match.replace(/["']/g, '');
            if (url.includes('m3u8')) return url;
          }
        }
      }

      // Strateji 3: Video/Audio source'ları
      const mediaSources = $('video source, audio source').toArray();
      for (const source of mediaSources) {
        const src = $(source).attr('src');
        if (src && src.includes('m3u8')) return src;
      }

      // Strateji 4: data-* attribute'ları
      const dataElements = $('[data-src],[data-url]').toArray();
      for (const elem of dataElements) {
        const src = $(elem).attr('data-src') || $(elem).attr('data-url');
        if (src && src.includes('m3u8')) return src;
      }

      // Strateji 5: JavaScript değişkenleri
      const jsVars = html.match(/var\s+\w+\s*=\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
      if (jsVars) return jsVars[1];

      // Strateji 6: Sayfa içindeki raw URL'ler
      const rawUrlMatch = html.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      if (rawUrlMatch) return rawUrlMatch[0];

      return null;
    };

    let m3u8Url = findM3u8Url($);

    // 2. URL Normalleştirme
    if (m3u8Url) {
      try {
        if (!m3u8Url.startsWith('http')) {
          m3u8Url = new URL(m3u8Url, targetUrl).toString();
        }
      } catch (e) {
        console.error('URL normalleştirme hatası:', e);
        m3u8Url = null;
      }
    }

    if (!m3u8Url) {
      // 3. Debug Bilgileri
      const debugInfo = {
        searchedElements: {
          iframes: $('iframe').length,
          scripts: $('script').length,
          videoSources: $('video source, audio source').length,
          dataElements: $('[data-src],[data-url]').length
        },
        htmlSnippet: html.substring(0, 500) + '...' // İlk 500 karakter
      };

      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'M3U8 bulunamadı',
          debug: debugInfo,
          suggestions: [
            'Site yapısı değişmiş olabilir',
            'Farklı bir ID deneyin',
            'HTML çıktısını kontrol edin'
          ]
        })
      };
    }

    // 4. Güvenlik Kontrolü
    const allowedDomains = ['macizlevip315.shop', 'cdn.macizle.com'];
    const urlDomain = new URL(m3u8Url).hostname;
    if (!allowedDomains.some(domain => urlDomain.includes(domain))) {
      throw new Error('İzin verilmeyen domain: ' + urlDomain);
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
