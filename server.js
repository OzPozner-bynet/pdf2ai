// ==================== Node.js Server (Express) ====================
// Path: server.js (main server file)

require('dotenv').config();

const bodyParser = require('body-parser');
const multer = require('multer');
const { processPdfAndExtractData, processPdfAndExtractData2 } = require('./src/controllers/pdfController');


const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const net = require('net');

const app = express();
const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;
let httpServer = null;  
let httpsServer = null;
const credentials = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt'))
};

// Utility to check if a port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', err => resolve(err.code === 'EADDRINUSE'))
      .once('listening', () => tester.close(() => resolve(false)))
      .listen(port);
  });
}

// Utility to wait for a port to become free
function waitForPortRelease(port, retries = 5, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = async () => {
      const inUse = await isPortInUse(port);
      if (!inUse) return resolve();
      if (++attempts >= retries) return reject(new Error(`Port ${port} still in use after ${retries} attempts.`));
      setTimeout(check, delay);
    };
    check();
  });
}

// Start servers with port conflict handling
async function startServers() {
  try {
    if (await isPortInUse(HTTP_PORT)) {
      console.log(`HTTP port ${HTTP_PORT} is in use. Waiting for release...`);
      await waitForPortRelease(HTTP_PORT);
    }
    ttpServer = http.createServer(app).listen(HTTP_PORT, () => {
      console.log(`Server is running on http://0.0.0.0:${HTTP_PORT}`);
    });

    if (await isPortInUse(HTTPS_PORT)) {
      console.log(`HTTPS port ${HTTPS_PORT} is in use. Waiting for release...`);
      await waitForPortRelease(HTTPS_PORT);
    }
    httpsServer = https.createServer(credentials, app).listen(HTTPS_PORT, () => {
      console.log(`Server is running on https://0.0.0.0:${HTTPS_PORT}`);
    });


  } catch (err) {
    console.error('Failed to start servers:', err.message);
    process.exit(1);
  }
}

startServers();
module.exports = { httpServer, httpsServer, app };



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
    if (!(encoding === 'base64')) {
      if (!req.files?.pdf?.[0]) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const file = req.files?.pdf?.[0];
      if (!file || file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Invalid file type' });
      }
    }

    let buffer;
    if (encoding === 'base64') {
      if (typeof req.body === 'object') {
        buffer = Buffer.from(req.body.toString(), 'base64');
      } else {
        buffer = Buffer.from(req.body, 'base64');
      }
    } else {
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (typeof req.body === 'string') {
        buffer = Buffer.from(req.body, 'binary');
      } else if (typeof req.body === 'object') {
        buffer = Buffer.from(JSON.stringify(req.body), 'binary');
      } else {
        throw new Error('Invalid PDF body format.');
      }
    }

    const tempPath = path.join(__dirname, 'temp', `${Date.now()}-${filename}`);
    fs.writeFileSync(tempPath, buffer);

    const data = await processPdfAndExtractData(tempPath);
    res.status(200).json({ message: 'Data extracted successfully.', data });

    fs.unlink(tempPath, () => { });
  } catch (error) {
    console.error('Error during PDF processing:', error);
    res.status(500).json({ error: 'PDF processing failed', details: error.message });
  }
});


app.post('/api/sendtollm', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'mapping', maxCount: 1 },
  { name: 'prompt', maxCount: 1 }
]), async (req, res) => {
  try {
    let pdfPath;
    const mappingPath = req.files?.mapping?.[0]?.path || path.join(__dirname, 'mapping.json');
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
        if (Buffer.isBuffer(req.body)) {
          buffer = req.body;
        } else if (typeof req.body === 'string') {
          buffer = Buffer.from(req.body, 'binary');
        } else {
          return res.status(400).json({ error: 'Invalid PDF body format.' });
        }
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

    // Read mapping content if available
    let mappingText = null;
    if (fs.existsSync(mappingPath)) {
      try {
        mappingText = fs.readFileSync(mappingPath, 'utf-8');
      } catch (err) {
        return res.status(500).json({ error: 'Failed to read mapping.json', details: err.message });
      }
    }

    // Get modelId from query or header
    const modelId = req.query.modelId || req.headers['x-model-id'] || null;

    // Process PDF with dynamic model
    const { analyzeImageWithBedrock2, analyzeImageWithBedrockDynamic } = require('./services/bedrockService');
    if (!modelId) {
      const data = await analyzeImageWithBedrock2(pdfPath, promptText, mappingText);
    } else {
      const data = await analyzeImageWithBedrockDynamic(pdfPath, promptText, mappingText, modelId);
    }
    res.status(200).json({
      message: 'Data extracted successfully.',
      data,
      promptUsed: !!promptText,
      mappingUsed: fs.existsSync(mappingPath),
      modelUsed: modelId || process.env.BEDROCK_MODEL_ID
    });

    if (!req.files?.pdf?.[0]) fs.unlink(pdfPath, () => { });
  } catch (error) {
    console.error('Error in /api/sendtollm:', error);
    res.status(500).json({ error: 'Processing failed', details: error.message });
  }
});



app.post('/api/sendtollm_delme', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'mapping', maxCount: 1 },
  { name: 'prompt', maxCount: 1 }
]), async (req, res) => {
  try {
    let pdfPath;
    const mappingPath = req.files?.mapping?.[0]?.path || path.join(__dirname, 'mapping.json');
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
            : JSON.stringify(req.body); // fallback for object

        buffer = Buffer.from(base64String, 'base64');
      } else {
        if (Buffer.isBuffer(req.body)) {
          buffer = req.body;
        } else if (typeof req.body === 'string') {
          buffer = Buffer.from(req.body, 'binary');
        } else {
          return res.status(400).json({ error: 'Invalid PDF body format.' });
        }
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


    // Cleanup if PDF was not uploaded via multipart
    //    if (!req.files?.pdf?.[0]) fs.unlink(pdfPath, () => {});


    // Cleanup
    if (req.files?.pdf?.[0] === undefined) fs.unlink(pdfPath, () => { });
  } catch (error) {
    console.error('Error in /api/sendtollm:', error);
    res.status(500).json({ error: 'Processing failed', details: error.message });
  }
});



app.get('/', (req, res) => {
  res.send('PDF Data Extraction Service is running.');
});

