require('dotenv').config();
const fs = require('fs');
const https = require('https');
const express = require('express');
const AWS = require('aws-sdk');

const app = express();
app.use(express.text());

const PORT = 8443;
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const REGIONS = [process.env.AWS_REGION || 'eu-central-1'];

// Validate AWS credentials
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Missing AWS credentials in .env');
  process.exit(1);
}

// Log every incoming request
app.use((req, res, next) => {
  console.log(`\n📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', req.body);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log('✅ Health check triggered');
  res.status(200).send('Server is healthy');
});

// Prompt handler
app.post('/prompt', async (req, res) => {
  const prompt = req.body;
  console.log('🔍 Received prompt:', prompt);

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.warn('⚠️ Invalid or empty prompt');
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  try {
    const result = await sendToBedrock(prompt);
    console.log(`📤 Responding with status ${result.status}`);
    console.log('📦 Response body:', JSON.stringify(result.body, null, 2));
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('❌ Unexpected error in /prompt:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send prompt to AWS Bedrock
async function sendToBedrock(prompt) {
  const payload = {
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: 1024,
    anthropic_version: 'bedrock-2023-05-31'
  };

  console.log('📨 Constructed payload:', JSON.stringify(payload, null, 2));

  for (const region of REGIONS) {
    console.log(`🌍 Trying region: ${region}`);

    const bedrock = new AWS.BedrockRuntime({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region,
    });

    try {
      const response = await bedrock.invokeModel({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      }).promise();

      console.log('📡 Raw Bedrock response:', response);
      const parsed = JSON.parse(response.body);
      console.log('🧾 Parsed Bedrock response:', JSON.stringify(parsed, null, 2));

      if (parsed.error || parsed.Error || parsed.status === 'error') {
        console.warn('⚠️ Bedrock returned error payload');
        return { status: 404, body: parsed };
      }

      return { status: 200, body: parsed };
    } catch (err) {
      console.error(`❌ Error invoking Bedrock in ${region}:`, err.message);
    }
  }

  console.error('🚫 All regions failed or unreachable');
  return { status: 404, body: { error: 'All regions failed or unreachable' } };
}

// Start HTTPS server
https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
  secureProtocol: 'TLSv1_2_method'
}, app).listen(PORT, () => {
  console.log(`✅ HTTPS server running at https://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ HTTPS server failed to start:', err.message);
});
