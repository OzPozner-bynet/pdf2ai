const request = require('supertest');
const app = require('../server');
const path = require('path');

describe('POST /api/sendtollm', () => {
  it('should fail if no PDF is uploaded', async () => {
    const res = await request(app).post('/api/sendtollm');
    if (res.statusCode == 500) { console.log(res.body.error)};
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch("Invalid PDF body format." );
  });

  it('should succeed with only PDF', async () => {
    const res = await request(app)
      .post('/api/sendtollm')
      .attach('pdf', path.join(__dirname, 'fixtures/sample.pdf'));
    if (res.statusCode == 500) { console.log(res.body.error)};  
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Data extracted successfully/);
    expect(res.body.data).toBeDefined();
  }, 160000);

  it('should include mapping and prompt if provided', async () => {
    const res = await request(app)
      .post('/api/sendtollm')
      .attach('pdf', path.join(__dirname, 'fixtures/sample.pdf'))
      .attach('mapping', path.join(__dirname, 'fixtures/mapping.json'))
      .attach('prompt', path.join(__dirname, 'fixtures/prompt.txt'));
    if (res.statusCode == 500) { console.log(res.body.error)};  
    if (res.statusCode == 500) { console.log(res.body.error)};  
    expect(res.statusCode).toBe(200);
     expect(res.body.mappingUsed).toBe(true);
     expect(res.body.promptUsed).toBe(true);
  }, 160000);

it('should use custom modelId from query', async () => {
  const res = await request(app)
    .post('/api/sendtollm?modelId=anthropic.claude-3-5-sonnet-20240620-v1:0')
    .attach('pdf', path.join(__dirname, 'fixtures/sample.pdf'));
  if (res.statusCode == 500) { console.log(res.body.error)};
  expect(res.statusCode).toBe(200);
  expect(res.body.modelUsed).toBe('anthropic.claude-3-5-sonnet-20240620-v1:0');
}, 160000);

it('should use custom modelId from header', async () => {
  const res = await request(app)
    .post('/api/sendtollm')
    .set('x-model-id', 'anthropic.claude-3-5-sonnet-20240620-v1:0')
    .attach('pdf', path.join(__dirname, 'fixtures/sample.pdf'));
  if (res.statusCode == 500) { console.log(res.body.error)};
  expect(res.statusCode).toBe(200);
  expect(res.body.modelUsed).toBe('anthropic.claude-3-5-sonnet-20240620-v1:0');
},16000);


});
