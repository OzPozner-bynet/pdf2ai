/**
 * @file app.test.js
 * @purpose Integration tests for Express server endpoints using Supertest.
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Import server and controller
const { httpServer, httpsServer, app } = require('../server'); // Ensure server.js exports `app`
jest.mock('../src/controllers/pdfController', () => ({
  processPdfAndExtractData: jest.fn(),
}));
const { processPdfAndExtractData } = require('../src/controllers/pdfController');

describe('PDF Extraction API', () => {
  const testPdfPath = path.join(__dirname, 'sample.pdf');

  beforeAll(() => {
    console.log(`Looking for or creating PDF: ${testPdfPath}`);
    if (!fs.existsSync(testPdfPath)) {
      const pdfContent = '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF';
      fs.writeFileSync(testPdfPath, pdfContent);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
   // httpServer.close();
   // httpsServer.close();
  });

  beforeEach(() => {
    processPdfAndExtractData.mockClear();
  });

  it('should return 400 if no file is uploaded', async () => {
    const response = await request(app).post('/api/extract-pdf-data');
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('No PDF file uploaded');
  });

  it('should return 400 if the uploaded file is not a PDF', async () => {
    const response = await request(app)
      .post('/api/extract-pdf-data')
      .attach('pdf', Buffer.from('this is not a pdf'), 'test.txt');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid file type');
  });

  it('should return 200 and extracted data on successful processing', async () => {
    const mockData = [{ page: 1, content: { title: 'Sample Document' } }];
    processPdfAndExtractData.mockResolvedValue(mockData);

    const response = await request(app)
      .post('/api/extract-pdf-data')
      .attach('pdf', testPdfPath);

    if (response.statusCode === 500) {
      console.log(response.body.error);
    }

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Data extracted successfully.');
    expect(response.body.data).toEqual(mockData);
    expect(processPdfAndExtractData).toHaveBeenCalledTimes(1);
  });

  it('should return 500 if the controller throws an error', async () => {
    const errorMessage = 'Bedrock service is down';
    processPdfAndExtractData.mockRejectedValue(new Error(errorMessage));

    const response = await request(app)
      .post('/api/extract-pdf-data')
      .attach('pdf', testPdfPath);

    if (response.statusCode === 500) {
      console.log(response.body.error);
    }

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('An internal server error occurred.');
    expect(response.body.details).toBe(errorMessage);
  });
});

describe('Bedrock Service (Unit Test Example)', () => {
  it('should correctly format the request payload for AWS Bedrock', () => {
    expect(true).toBe(true); // Placeholder
  });
});
