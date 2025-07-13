export default async function handler(req, res) {
  const id = req.query.id || '5062';

  // Hedef sayfa
  const targetUrl = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;

  try {
    // Sayfayı çek
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html'
      }
    });

    const html = await response.text();

    // Sayfa içinde m3u8 linkini ara
    const match = html.match(/(https?:\/\/[^\s"'\\>]+\.m3u8[^\s"'\\<]*)/i);

    if (!match) {
      return res.status(404).json({ error: 'm3u8 linki bulunamadı', id });
    }

    const m3u8Url = match[1];

    // m3u8 içeriğini çek
    const m3u8Response = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': targetUrl
      }
    });

    if (!m3u8Response.ok) {
      return res.status(500).json({ error: 'm3u8 dosyası alınamadı', id });
    }

    let m3u8Content = await m3u8Response.text();

    // İçindeki .ts linklerini yeniden yaz (proxy gibi)
    m3u8Content = m3u8Content.split('\n').map(line => {
      if (line.trim().startsWith('http')) {
        return `/api/stream-proxy?url=${encodeURIComponent(line.trim())}`;
      }
      return line;
    }).join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8Content);
  } catch (err) {
    res.status(500).json({ error: err.message, id });
  }
}
