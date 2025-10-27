const express = require('express');
const router = express.Router();
const { downloadServiceNowAttachmentBase64 } = require('../services/servicenow');
const { sendToBedrockWithDocument } = require('../services/bedrock');

router.post('/', async (req, res) => {
  let sys_id, userPrompt;

  if (typeof req.body === 'string') {
    try {
      const maybeJson = JSON.parse(req.body);
      sys_id = maybeJson.sys_id || req.query.sys_id;
      userPrompt = maybeJson.prompt || req.query.prompt;
    } catch {
      sys_id = req.body || req.query.sys_id;
      userPrompt = req.query.prompt;
    }
  } else {
    sys_id = req.body?.sys_id || req.query.sys_id;
    userPrompt = req.body?.prompt || req.query.prompt;
  }

  if (!sys_id || typeof sys_id !== 'string' || sys_id.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid sys_id' });
  }

  try {
    const { base64, contentType, fileName, size } = await downloadServiceNowAttachmentBase64(sys_id);
    console.log(`Downloaded attachment: name=${fileName}, type=${contentType}, size=${size} bytes`);

    const defaultInstruction = `You are given a file. Extract structured information and return ONLY valid JSON with this structure:
{
  "records": [
    {
      "fields": { /* key-value pairs extracted per record */ },
      "validation_score": 0.0
    }
  ],
  "detected_languages": ["en", "he"],
  "classification": "invoice | resume | contract | form | contacts | table | other"
}
- "validation_score" is a float between 0 and 1 indicating confidence the record is valid/well-formed.
- If no records are found, return an empty array.
- Do not include explanations—return only JSON.`;

    const instruction = userPrompt?.trim() || defaultInstruction;

    const result = await sendToBedrockWithDocument({
      instruction,
      base64,
      mediaType: contentType,
      fileName,
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Error in /sendfile:', err.message);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

module.exports = router;