const request = require('supertest');
const app = require('../server');
const path = require('path');

describe('POST /api/sendtollm', () => {
  it('should fail if no PDF is uploaded', async () => {
    const res = await request(app).post('/api/sendtollm');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/PDF file is required/);
  });

  it('should succeed with only PDF', async () => {
    const res = await request(app)
      .post('/api/sendtollm')
      .attach('pdf', path.join(__dirname, 'fixtures/sample.pdf'));
    expect(res.statusCode).toBe(200);
    expect(res.body.payload.pdfPath).toBeDefined();
  });

  it('should include mapping and prompt if provided', async () => {
    const res = await request(app)
      .post('/api/sendtollm')
      .attach('pdf', path.join(__dirname, 'fixtures/sample.pdf'))
      .attach('mapping', path.join(__dirname, 'fixtures/mapping.xml'))
      .attach('prompt', path.join(__dirname, 'fixtures/prompt.txt'));
    expect(res.statusCode).toBe(200);
    expect(res.body.payload.mappingPath).toBeDefined();
    expect(res.body.payload.promptText).toContain('Example prompt');
  });
});
