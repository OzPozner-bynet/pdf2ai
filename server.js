// ==================== Node.js Server (Express) ====================
// Path: server.js (main server file)

require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const { processPdfAndExtractData } = require('./src/controllers/pdfController');

const app = express();
const PORT = process.env.PORT || 8080;
const PORT2 = process.env.PORT2 || 8443;

const upload = multer({ dest: path.join(__dirname, 'temp') });

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

// ✅ Original PDF extraction route


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


//const multer = require('multer');
//const upload = multer({ dest: path.join(__dirname, 'temp') });

app.post('/api/sendtollm', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'mapping', maxCount: 1 },
  { name: 'prompt', maxCount: 1 }
]), async (req, res) => {
  try {
    let pdfPath;
    const mappingPath = req.files?.mapping?.[0]?.path || path.join(__dirname, 'mapping.xml');
    const promptPath = req.files?.prompt?.[0]?.path || path.join(__dirname, 'prompt.txt');

    // Handle PDF from multipart upload
    if (req.files?.pdf?.[0]) {
      pdfPath = req.files.pdf[0].path;
    } else {
      // Handle raw or base64-encoded PDF in body
      const encoding = req.headers['x-content-transfer-encoding'] || 'binary';
      const filename = req.headers['x-filename'] || 'uploaded.pdf';

      let buffer;
      if (encoding === 'base64') {
        const base64String = Buffer.isBuffer(req.body)
          ? req.body.toString('utf-8')
          : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);
        buffer = Buffer.from(base64String, 'base64');
      } else {
        buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      }

      pdfPath = path.join(__dirname, 'temp', `${Date.now()}-${filename}`);
      fs.writeFileSync(pdfPath, buffer);
    }

    // Read prompt text if available
    let promptText = null;
    if (fs.existsSync(promptPath)) {
      try {
        promptText = fs.readFileSync(promptPath, 'utf-8');
      } catch (err) {
        return res.status(500).json({ error: 'Failed to read prompt.txt', details: err.message });
      }
    }

    // Process PDF
    const data = await processPdfAndExtractData2(pdfPath, mappingPath, promptText);

    res.status(200).json({
      message: 'Data extracted successfully.',
      data,
      promptUsed: !!promptText,
      mappingUsed: fs.existsSync(mappingPath)
    });

    // Cleanup
    if (req.files?.pdf?.[0] === undefined) fs.unlink(pdfPath, () => {});
  } catch (error) {
    console.error('Error in /api/sendtollm:', error);
    res.status(500).json({ error: 'Processing failed', details: error.message });
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
