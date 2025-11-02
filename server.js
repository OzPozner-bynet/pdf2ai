<<<<<<< HEAD
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

=======
/**
 * @file server.js
 * @purpose This is the main entry point for the Node.js application. It sets up an Express server
 * to handle incoming HTTP requests. It defines a single endpoint for uploading a PDF file, which
 * is then processed by the pdfController.
 * @sources
 * - Express.js documentation: https://expressjs.com/
 * - Multer (file upload middleware) documentation: https://github.com/expressjs/multer
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const { processPdfAndExtractData } = require('./src/controllers/pdfController');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads. It will save files to a temporary directory.
const upload = multer({ dest: os.tmpdir() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * @route POST /api/extract-pdf-data
 * @description This endpoint accepts a single PDF file under the field name 'pdf'.
 * It uses multer to handle the file upload and then passes the file to the
 * controller for processing.
 * @returns {object} A JSON object containing the aggregated data extracted from all pages of the PDF.
 */
app.post('/api/extract-pdf-data', upload.single('pdf'), async (req, res) => {
    // Check if a file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded. Please upload a file with the key "pdf".' });
    }

    // Check if the uploaded file is a PDF
    if (path.extname(req.file.originalname).toLowerCase() !== '.pdf') {
        return res.status(400).json({ error: 'Invalid file type. Only PDF files are accepted.' });
    }

    try {
        console.log(`Processing uploaded file: ${req.file.path}`);
        const extractedData = await processPdfAndExtractData(req.file.path);
        res.status(200).json({
            message: 'Data extracted successfully.',
            data: extractedData
        });
    } catch (error) {
        console.error('Error during PDF processing:', error);
        res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
    }
});

// Simple health check endpoint
app.get('/', (req, res) => {
    res.send('PDF Data Extraction Service is running.');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app for testing purposes
>>>>>>> 6ec2fa46af6c6cbadd8ee0d5759e8f3464f292b0
module.exports = app;