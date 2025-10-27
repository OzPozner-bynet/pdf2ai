const express = require('express');
const router = express.Router();
const { sendPromptToBedrock } = require('../services/bedrock');

router.post('/', async (req, res) => {
  const prompt = typeof req.body === 'string' ? req.body : req.body?.prompt;
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  try {
    const result = await sendPromptToBedrock(prompt);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Unexpected error in /prompt:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;