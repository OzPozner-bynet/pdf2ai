require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

const HTTPS_PORT = 8443;
const HTTP_PORT = 8080;

app.use(express.json({ limit: '25mb' }));
app.use(express.text({ type: ['text/*', 'application/text'], limit: '25mb' }));

// Logging middleware
const { logRequest } = require('./utils/logger');
app.use(logRequest);

// Health check
app.get('/health', (req, res) => res.status(200).send('Server is healthy'));

// Routes
app.use('/prompt', require('./routes/prompt'));
app.use('/sendfile', require('./routes/sendfile'));

// HTTPS server
https.createServer(
  {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
    secureProtocol: 'TLSv1_2_method',
  },
  app
).listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running : all_ips on port ${HTTPS_PORT}`);
});

// HTTP fallback
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP server listening on port ${HTTP_PORT}`);
});