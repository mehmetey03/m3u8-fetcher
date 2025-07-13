export default async function handler(req, res) {
  const url = decodeURIComponent(req.query.url || '');

  if (!url.startsWith('http')) {
    return res.status(400).json({ error: 'Geçersiz URL' });
  }

  try {
    const streamRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!streamRes.ok) {
      throw new Error(`HTTP ${streamRes.status}`);
    }

    res.setHeader('Content-Type', streamRes.headers.get('content-type') || 'application/octet-stream');
    streamRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
