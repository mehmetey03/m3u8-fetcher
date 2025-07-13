app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('url parametresi zorunludur.');

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://macizlevip315.shop/',
        'Origin': 'https://macizlevip315.shop'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('vnd.apple.mpegurl') || targetUrl.endsWith('.m3u8')) {
      let body = await response.text();

      const proxyBase = `${req.protocol}://${req.get('host')}/proxy?url=`;

      body = body.replace(/(https?:\/\/[^\s]+)/g, (match) => {
        return proxyBase + encodeURIComponent(match);
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      // Dosya indirme için:
      res.setHeader('Content-Disposition', 'attachment; filename="stream.m3u8"');
      return res.send(body);
    } else {
      res.setHeader('Content-Type', contentType);
      // Diğer dosyalar için (örneğin segmentler)
      response.body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Proxy hatası: ' + err.message);
  }
});
