const express = require('express');
const app = express();
const puppeteer = require('puppeteer');

app.get('/fetch', async (req, res) => {
  // fetchStream.js'deki kodunuzu buraya kopyalayın
});

const PORT = 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}/fetch?id=5062`));