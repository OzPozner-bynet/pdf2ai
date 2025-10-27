// Required modules
const fs = require('fs');
const path = require('path');
const https = require('https');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

// AWS Bedrock client setup
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'eu-central-1', // ✅ Use supported region
});

// Utility: Extract filename from headers
function getFileNameFromHeaders(headers) {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      return match[1].replace(/['"]/g, '');
    }
  }
  return null;
}

// Step 1: Download PDF from ServiceNow
async function downloadFromServiceNow(attachmentId) {
  const url = `${process.env.SNOW_API_URL}/api/now/attachment/${attachmentId}/file`;
  const auth = Buffer.from(`${process.env.SNOW_API_USER}:${process.env.SNOW_API_PASSWORD}`).toString('base64');

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: '*/*',
      },
    }, (res) => {
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const fileName = getFileNameFromHeaders(res.headers) || `${attachmentId}.pdf`;
        resolve({
          buffer,
          contentType: res.headers['content-type'],
          fileName,
        });
      });
    }).on('error', reject);
  });
}

// Step 2: Send to Claude 4 Opus via Bedrock
async function sendToBedrockAPI(buffer, contentType, fileName) {
  console.log('Sending to AWS Bedrock for parsing...');
  const modelId = process.env.MODEL_ID || 'anthropic.claude-4-opus-v1:0';

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    temperature: 0.5,
    messages: [
      {
        role: 'user',
        content: `Please summarize the contents of the attached PDF file named "${fileName}".`,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  try {
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    return responseBody;
  } catch (error) {
    throw new Error(`Bedrock API error ${error.$metadata?.httpStatusCode || ''}: ${error.message}`);
  }
}

// Step 3: Parse Bedrock response
function parseBedrockResponse(response, fileName) {
  return {
    fileName,
    summary: response?.content || 'No summary returned.',
    timestamp: new Date().toISOString(),
  };
}

// Step 4: Save results to disk
function saveResults(data) {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const outputPath = path.join(outputDir, `${data.fileName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  return outputPath;
}

// Main automation workflow
async function automateFullWorkflow(attachmentId) {
  console.log('Starting automated ServiceNow PDF processing with AWS Bedrock...');
  console.log('='.repeat(60));

  const requiredVars = [
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
    'MODEL_ID', 'SNOW_API_USER', 'SNOW_API_PASSWORD', 'SNOW_API_URL'
  ];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  try {
    console.log('\n1/4 Downloading from ServiceNow...');
    const downloadResult = await downloadFromServiceNow(attachmentId);

    console.log('\n2/4 Processing with AWS Bedrock...');
    const bedrockResponse = await sendToBedrockAPI(
      downloadResult.buffer,
      downloadResult.contentType,
      downloadResult.fileName
    );

    console.log('\n3/4 Parsing response...');
    const structuredData = parseBedrockResponse(bedrockResponse, downloadResult.fileName);

    console.log('\n4/4 Saving results...');
    const outputPath = saveResults(structuredData);

    console.log('\n✅ AUTOMATION COMPLETED SUCCESSFULLY!');
    console.log('Structured JSON available at:', outputPath);

    return {
      success: true,
      outputPath,
      data: structuredData,
    };

  } catch (error) {
    console.error('\n❌ AUTOMATION FAILED:', error.message);
    console.log('\nTROUBLESHOOTING:');

    if (error.message.includes('Bedrock') || error.message.includes('AWS')) {
      console.log('- Check AWS credentials and region');
      console.log('- Verify Bedrock model access in your AWS account');
      console.log('- Ensure Claude model is available in your region');
    } else if (error.message.includes('ServiceNow')) {
      console.log('- Verify ServiceNow credentials');
      console.log('- Check attachment ID exists');
      console.log('- Ensure network connectivity');
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Export for module use
module.exports = {
  automateFullWorkflow,
  downloadFromServiceNow,
  sendToBedrockAPI,
};

// Run if called directly
if (require.main === module) {
  const attachmentId = process.argv[2] || 'e7662c95937f26509d4937e86cba1082';
  console.log('Processing attachment ID:', attachmentId);
  automateFullWorkflow(attachmentId);
}
