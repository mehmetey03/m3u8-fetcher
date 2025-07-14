const fetch = require('node-fetch');

exports.handler = async (event) => {
  const targetUrl = event.queryStringParameters?.url;
  
  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'URL parametresi eksik',
        usage: '/proxy?url=ENCODED_URL'
      })
    };
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    
    // Cloudflare Worker için özel headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Referer': 'https://macizlevip315.shop/',
      'Origin': 'https://macizlevip315.shop',
      'Accept': 'application/x-mpegURL, */*'
    };

    // Timeout kontrolü (8 saniye)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(decodedUrl, {
      headers: headers,
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    // MIME type kontrolü
    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || 
                   contentType.includes('application/vnd.apple.mpegurl') || 
                   decodedUrl.includes('.m3u8');

    if (!isM3U8) {
      throw new Error('Geçersiz içerik tipi: ' + contentType);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*'
      },
      body: await response.text()
    };

  } catch (error) {
    console.error('Proxy Hatası:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Proxy hatası',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
