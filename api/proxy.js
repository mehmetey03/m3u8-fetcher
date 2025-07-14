const fetch = require('node-fetch');

exports.handler = async (event) => {
  const targetUrl = event.queryStringParameters?.url;
  
  if (!targetUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parametresi eksik' })
    };
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    
    // Cloudflare Worker için özel headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Referer': 'https://macizlevip315.shop/',
      'Origin': 'https://macizlevip315.shop',
      'Accept': 'application/x-mpegURL'
    };

    const response = await fetch(decodedUrl, {
      headers: headers,
      timeout: 8000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*'
      },
      body: await response.text()
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Proxy hatası',
        message: error.message
      })
    };
  }
};
