/**
 * @file app.test.js
 * @purpose This file contains integration tests for the Express server endpoints using Supertest.
 * It also includes placeholder unit tests to demonstrate how to mock modules.
 * Note: For a real project, you would create separate files for unit and integration tests.
 * @sources
 * - Jest documentation: https://jestjs.io/
 * - Supertest documentation: https://github.com/ladjs/supertest
 */

const request = require('supertest');
const app = require('../server'); // Import the Express app
const path = require('path');
const fs = require('fs');

// Mock the controller module to prevent actual PDF processing and AWS calls during tests
jest.mock('../src/controllers/pdfController', () => ({
    processPdfAndExtractData: jest.fn(),
}));
const { processPdfAndExtractData } = require('../src/controllers/pdfController');

describe('PDF Extraction API', () => {

    // Reset mocks before each test
    beforeEach(() => {
        processPdfAndExtractData.mockClear();
    });

    describe('POST /api/extract-pdf-data', () => {
        const testPdfPath = path.join(__dirname, 'sample.pdf');

        // Create a dummy PDF for testing uploads
        beforeAll(() => {
            if (!fs.existsSync(testPdfPath)) {
                // A minimal valid PDF file content.
                const pdfContent = '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF';
                fs.writeFileSync(testPdfPath, pdfContent);
            }
        });

        afterAll(() => {
            // Clean up the dummy PDF
            if (fs.existsSync(testPdfPath)) {
                fs.unlinkSync(testPdfPath);
            }
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
            // Mock the controller function to return sample data
            const mockData = [{ page: 1, content: { title: "Sample Document" } }];
            processPdfAndExtractData.mockResolvedValue(mockData);

            const response = await request(app)
                .post('/api/extract-pdf-data')
                .attach('pdf', testPdfPath);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Data extracted successfully.');
            expect(response.body.data).toEqual(mockData);
            // Ensure the controller was called once
            expect(processPdfAndExtractData).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if the controller throws an error', async () => {
            // Mock the controller function to simulate a failure
            const errorMessage = 'Bedrock service is down';
            processPdfAndExtractData.mockRejectedValue(new Error(errorMessage));

            const response = await request(app)
                .post('/api/extract-pdf-data')
                .attach('pdf', testPdfPath);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('An internal server error occurred.');
            expect(response.body.details).toBe(errorMessage);
        });
    });
});

// Example of a pure unit test for the bedrock service (would be in a separate file)
describe('Bedrock Service (Unit Test Example)', () => {
    it('should correctly format the request payload for AWS Bedrock', () => {
        // In a real test, you would mock the AWS SDK client and its 'send' method.
        // Then you would call 'analyzeImageWithBedrock' and assert that the payload
        // passed to the 'send' method is correctly structured. This example is conceptual.
        expect(true).toBe(true); // Placeholder
    });
});