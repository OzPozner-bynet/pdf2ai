require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const MODEL_ID = process.env.MODEL_ID;
const REGION = "eu-central-1";

const bedrock = new AWS.BedrockRuntime({
  region: REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

async function testPrompt() {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is the capital of France?' }
        ]
      }
    ]
  };

  try {
    console.log('Sending prompt...');
    const response = await bedrock.invokeModel({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    }).promise();

    const parsed = JSON.parse(response.body);
    console.log('Prompt response:', JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error('Prompt error:', err.message);
    if (err?.response?.body) {
      const raw = await streamToString(err.response.body);
      console.error('Raw error body:', raw);
    }
  }
}

async function testFile() {
  const filePath = path.join(__dirname, 'sample.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('Missing sample.pdf in current directory');
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const mediaType = 'application/pdf';

  const instruction = `You are given a PDF file. Extract structured information and return ONLY valid JSON with this structure:
{
  "records": [
    {
      "fields": { /* key-value pairs extracted per record */ },
      "validation_score": 0.0
    }
  ],
  "detected_languages": ["en"],
  "classification": "invoice | resume | contract | form | contacts | table | other"
}
Return only JSON.`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'document', media_type: mediaType, data: base64 }
        ]
      }
    ]
  };

  try {
    console.log('Sending file...');
    const response = await bedrock.invokeModel({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    }).promise();

    const parsed = JSON.parse(response.body);
    console.log('File response:', JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error('File error:', err.message);
    if (err?.response?.body) {
      const raw = await streamToString(err.response.body);
      console.error('Raw error body:', raw);
    }
  }
}

(async () => {
  await testPrompt();
  await testFile();
})();
