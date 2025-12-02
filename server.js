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

// ==============================
// GLOBAL PARSERS (IMPORTANT)
// ==============================
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(bodyParser.raw({ type: 'application/pdf', limit: '200mb' }));

const upload = multer({ dest: path.join(__dirname, 'temp') });

// ==============================
// PORT UTILITIES
// ==============================

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', err => resolve(err.code === 'EADDRINUSE'))
      .once('listening', () => tester.close(() => resolve(false)))
      .listen(port);
  });
}

function waitForPortRelease(port, retries = 5, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = async () => {
      const inUse = await isPortInUse(port);
      if (!inUse) return resolve();
      if (++attempts >= retries) return reject(new Error('Port ' + port + ' still in use after ' + retries + ' attempts.'));
      setTimeout(check, delay);
    };
    check();
  });
}

// ==============================
// START SERVERS
// ==============================

async function startServers() {
  try {
    if (await isPortInUse(HTTP_PORT)) {
      console.log('HTTP port ' + HTTP_PORT + ' is in use. Waiting for release...');
      await waitForPortRelease(HTTP_PORT);
    }

    httpServer = http.createServer(app).listen(HTTP_PORT, '0.0.0.0', function() {
      console.log('Server is running on http://0.0.0.0:' + HTTP_PORT);
    });

    if (await isPortInUse(HTTPS_PORT)) {
      console.log('HTTPS port ' + HTTPS_PORT + ' is in use. Waiting for release...');
      await waitForPortRelease(HTTPS_PORT);
    }

    httpsServer = https.createServer(credentials, app).listen(HTTPS_PORT, '0.0.0.0', function() {
      console.log('Server is running on https://0.0.0.0:' + HTTPS_PORT);
    });

  } catch (err) {
    console.error('Failed to start servers:', err.message);
    process.exit(1);
  }
}

startServers();
module.exports = { httpServer: httpServer, httpsServer: httpsServer, app: app };


function escapeJsonString(input) {
    // Ensure input is treated as a string
    const str = String(input);

    // Escape backslashes, quotes, and control characters
    return str
        .replace(/\\/g, "\\\\")   // escape backslashes
        .replace(/"/g, '\\"')     // escape double quotes
        .replace(/\n/g, "\\n")    // escape newlines
        .replace(/\r/g, "\\r")    // escape carriage returns
        .replace(/\t/g, "\\t");   // escape tabs
}




// ==============================
// STATIC + BASIC ROUTES
// ==============================

app.get('/robots.txt', function(req, res) {
  var robotsFilePath = path.join(__dirname, 'public', 'robots.txt');
  res.sendFile(robotsFilePath);
});

app.use('/files', express.static(path.join(__dirname, 'public'), {
  index: false,
  setHeaders: function(res, filePath) {
    res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(filePath) + '"');
  }
}));

app.get('/api/recieve', function(req, res) {
  var sysId = req.query.sys_id;
  if (!sysId) {
    return res.status(400).json({ error: 'Missing sys_id parameter in query.' });
  }
  res.status(200).json({ sys_id: sysId });
});

// ==============================
// WORKING ROUTE: /api/extract-pdf-data (UNCHANGED)
// ==============================

app.post('/api/extract-pdf-data', async function(req, res) {
  try {
    var encoding = req.headers['x-content-transfer-encoding'] || 'binary';
    var filename = req.headers['x-filename'] || 'uploaded.pdf';

    var buffer;

    if (encoding === 'base64') {
      var bodyStr = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
      buffer = Buffer.from(bodyStr, 'base64');
    } else {
      buffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body, 'binary');
    }

    var tempPath = path.join(__dirname, 'temp', String(Date.now()) + '-' + filename);
    fs.writeFileSync(tempPath, buffer);

    var data = await processPdfAndExtractData(tempPath);
    res.status(200).json({ message: 'Data extracted successfully.', data: data });
    console.log(`returned 200 data: \n ${data} `);
    fs.unlink(tempPath, function() {});
  } catch (error) {
    res.status(500).json({ error: 'PDF processing failed', details: error.message });
    console.log(`{ "error: 'PDF processing failed', details:" ${error.message }`);
  }
});

// ==============================
// FIXED /api/sendtollm ROUTE
// JSON BODY WITH BASE64 PDF + PROMPT + MAPPING
// ==============================

app.post('/api/sendtollm', async function(req, res) {
  var pdfPath = null;

  try {
    console.log('🔹 /api/sendtollm called');
    
    var body = req.body || {};
    var fileName = body.file_name || 'uploaded.pdf';
    var pdfBase64 = body.pdf_base64;
    var promptText = body.prompt || '';
    var mappingText = escapeJsonString(body.mapping) || '';
    var modal = body.modal || null;

 
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdf_base64 in request body.' });
    }

    var pdfBuffer = Buffer.from(pdfBase64, 'base64');
    pdfPath = path.join(__dirname, 'temp', String(Date.now()) + '-' + fileName);
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`THIS IS LINE 180 PROMPT TEXT :\n ${promptText} ` );
    console.log(`THIS IS LINE 181 Mapping JSON :\n ${mappingText} ` );
    var data = await processPdfAndExtractData2(pdfPath, promptText, mappingText, modal);

    fs.unlink(pdfPath, function() {});

    return res.status(200).json({
      message: 'Data extracted successfully (JSON mode).',
      data: data,
      promptUsed: promptText,
      mappingUsed: mappingText,
      modalUsed: modal,
    });
    console.log(`returned 200 data: \n ${data} `);
  } catch (err) {
    console.error('195❌ Error in /api/sendtollm:', err);
    res.status(500).json({ error: 'Processing failed', details: err.message });
  }
});

// ==============================

app.get('/', function(req, res) {
  res.send('PDF Data Extraction Service is running.');
});
