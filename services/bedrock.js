const AWS = require('aws-sdk');

const MODEL_ID = process.env.MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const REGIONS = [process.env.AWS_REGION, 'eu-central-1'];

// Helper to read error stream
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// Text-only prompt invocation
async function sendPromptToBedrock(prompt) {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt }
        ]
      }
    ]
  };

  for (const region of REGIONS) {
    const bedrock = new AWS.BedrockRuntime({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region,
    });

    try {
      console.log(`Invoking Bedrock in ${region} with model ${MODEL_ID}`);
      console.log('Invoking Bedrock with:', {
        modelId: MODEL_ID,  region,  payload: JSON.stringify(payload, null, 2),
      });
      const response = await bedrock.invokeModel({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      }).promise();

      const parsed = JSON.parse(response.body);
      return { status: 200, body: parsed };
    } catch (err) {
      console.error(`Error invoking Bedrock in ${region}:`, err.message);
      if (err?.response?.body) {
        try {
          const rawBody = await streamToString(err.response.body);
          console.error(`Raw Bedrock error body from ${region}:`, rawBody);
        } catch (streamErr) {
          console.error(`Failed to read error body stream:`, streamErr.message);
        }
      }
    }
  }

  return { status: 404, body: { error: 'Prompt All regions failed or unreachable' } };
}

// Document + prompt invocation
async function sendToBedrockWithDocument({ instruction, base64, mediaType, fileName }) {
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

  for (const region of REGIONS) {
    const bedrock = new AWS.BedrockRuntime({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region,
    });

    try {
      console.log(`Invoking Bedrock in ${region} with model ${MODEL_ID}`);
      const response = await bedrock.invokeModel({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      }).promise();

      const parsed = JSON.parse(response.body);
      return { status: 200, body: parsed };
    } catch (err) {
      console.error(`Error invoking Bedrock in ${region}:`, {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
        region,
        stack: err.stack,
        requestId: err.requestId,
        retryable: err.retryable,
      });

      if (err?.response?.body) {
        try {
          const rawBody = await streamToString(err.response.body);
          console.error(`Raw Bedrock error body from ${region}:`, rawBody);
        } catch (streamErr) {
          console.error(`Failed to read error body stream:`, streamErr.message);
        }
      }
    }
  }

  return { status: 404, body: { error: 'Sendfile All regions failed or unreachable' } };
}

module.exports = {
  sendPromptToBedrock,
  sendToBedrockWithDocument,
};
