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
        }),
      };
    }

    const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://macizlevip315.shop/',
    };

    const response = await fetch(targetUrl, { headers });

    if (!response.ok)
      throw new Error(`Sayfa getirilemedi, HTTP status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const foundLinks = new Set();

    const globalM3u8Regex = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi;
    const globalMatches = html.match(globalM3u8Regex);
    if (globalMatches) globalMatches.forEach((link) => foundLinks.add(link));

    $('iframe[src], a[href], video source[src], video[src]').each((_, el) => {
      const url = $(el).attr('src') || $(el).attr('href');
      if (url && url.includes('.m3u8')) foundLinks.add(url);
    });

    $('[data-url], [data-src]').each((_, el) => {
      const url = $(el).attr('data-url') || $(el).attr('data-src');
      if (url && url.includes('.m3u8')) foundLinks.add(url);
    });

    $('script:not([src])').each((_, el) => {
      const content = $(el).html();
      if (!content) return;
      const jsonUrlMatch = content.match(/"stream_url"\s*:\s*"([^"]+\.m3u8)"/i);
      if (jsonUrlMatch) foundLinks.add(jsonUrlMatch[1]);
      const rawLinks = content.match(globalM3u8Regex);
      if (rawLinks) rawLinks.forEach((link) => foundLinks.add(link));
    });

    const allLinks = Array.from(foundLinks);
    if (allLinks.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'M3U8 bulunamadı',
          id,
          suggestions: ['ID yanlış olabilir', 'Site JS ile yükleniyor olabilir'],
          htmlSnippet: html.substring(0, 1000) + '...',
        }),
      };
    }

    const bestLink = allLinks[0];
    return {
      statusCode: 200,
      body: JSON.stringify({
        id,
        url: `/.netlify/functions/proxy?url=${encodeURIComponent(bestLink)}`,
        originalUrl: bestLink,
        allFound: allLinks,
        detectedBy: 'cheerio-scan',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'İşlem hatası', message: error.message }),
    };
  }
};
