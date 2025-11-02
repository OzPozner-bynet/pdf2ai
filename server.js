// ==================== Node.js Server (Express) ====================
// Path: server.js (main server file)

require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { processPdfAndExtractData } = require('./src/controllers/pdfController');

const app = express();
const PORT = process.env.PORT || 8080;
const PORT2 = process.env.PORT2 || 8443;

app.use(bodyParser.raw({ type: 'application/pdf', limit: '100mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve /robots.txt directly from ./public
app.get('/robots.txt', (req, res) => {
  const myfile = path.join(__dirname, 'public', 'robots.txt');
  console.log(`trying to send file:${myfile}`);
  res.sendFile(myfile);
});

// Serve static files from ./public under /files route
app.use('/files', express.static(path.join(__dirname, 'public'), {
  index: false,
  setHeaders: (res, filePath) => {
    console.log(`trying to serve file:${filePath}`);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  }
}));

app.get('/api/recieve', (req, res) => {
  const { sys_id } = req.query;
  if (!sys_id) {
    return res.status(400).json({ error: 'Missing sys_id parameter in query.' });
  }
  res.status(200).json({ sys_id });
});

app.post('/api/extract-pdf-data', async (req, res) => {
  try {
    const encoding = req.headers['x-content-transfer-encoding'] || 'binary';
    const filename = req.headers['x-filename'] || 'uploaded.pdf';

    let buffer;
    if (encoding === 'base64') {
      if (typeof req.body === 'object') {
        buffer = Buffer.from(req.body.toString(), 'base64');
      } else {
        buffer = Buffer.from(req.body, 'base64');
      }
    } else {
      buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    }

    const tempPath = path.join(__dirname, 'temp', `${Date.now()}-${filename}`);
    fs.writeFileSync(tempPath, buffer);

    const data = await processPdfAndExtractData(tempPath);
    res.status(200).json({ message: 'Data extracted successfully.', data });

    fs.unlink(tempPath, () => {});
  } catch (error) {
    console.error('Error during PDF processing:', error);
    res.status(500).json({ error: 'PDF processing failed', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('PDF Data Extraction Service is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

app.listen(PORT2, () => {
  console.log(`Server is running on https://0.0.0.0:${PORT2}`);
});

module.exports = app;