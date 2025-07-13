const fetch = require('node-fetch');

exports.handler = async (event) => {
  const targetUrl = event.queryStringParameters.url;
  
  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parametresi eksik' })
    };
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://macizlevip315.shop/',
        'Accept': '*/*'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || decodedUrl.includes('.m3u8');

    if (isM3U8) {
      const text = await response.text();
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*'
        },
        body: text
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Geçersiz M3U8 akışı' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
