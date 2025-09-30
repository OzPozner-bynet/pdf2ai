{
  "name": "pdf-to-bedrock-json",
  "version": "1.0.0",
  "description": "An application to convert PDF pages to images and extract data using AWS Bedrock.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  },
  "keywords": [
    "pdf",
    "aws",
    "bedrock",
    "node.js",
    "express"
  ],
  "author": "Gemini",
  "license": "ISC",
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.569.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "pdf2pic": "^3.1.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}