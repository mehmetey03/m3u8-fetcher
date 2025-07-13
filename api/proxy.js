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
    const response = await fetch(decodeURIComponent(targetUrl), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://macizlevip315.shop/'
      },
      timeout: 5000
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
        body: await response.text()
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Geçersiz akış formatı' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
