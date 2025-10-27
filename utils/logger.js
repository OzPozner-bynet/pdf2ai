function logRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  console.log('Headers:', JSON.stringify(req.headers, null, 2));

  const bodyPreview = typeof req.body === 'string'
    ? (req.body.length > 500 ? req.body.slice(0, 500) + '…[truncated]' : req.body)
    : JSON.stringify(req.body).slice(0, 500);

  console.log('Body (preview):', bodyPreview);

  next();
}

module.exports = { logRequest };

