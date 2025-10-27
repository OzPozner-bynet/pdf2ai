const https = require('https');

function basicAuthHeader(user, pass) {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

function parseContentDispositionFilename(headerValue) {
  if (!headerValue) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i.exec(headerValue);
  return match ? decodeURIComponent(match[1]) : null;
}

function downloadServiceNowAttachmentBase64(sys_id) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${process.env.SNOW_API_URL}${encodeURIComponent(sys_id)}/file`);
    console.log(`getting file from ${url}`);
    const options = {
      method: 'GET',
      headers: {
        Authorization: basicAuthHeader(process.env.SNOW_API_USER, process.env.SNOW_API_PASSWORD),
        Accept: '*/*',
      },
    };

    const req = https.request(url, options, (resp) => {
      const { statusCode, headers } = resp;

      if (statusCode >= 400) {
        const chunks = [];
        resp.on('data', (d) => chunks.push(d));
        resp.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`ServiceNow download failed: ${statusCode}. Headers=${JSON.stringify(headers)}. Body=${body.slice(0, 500)}`));
        });
        return;
      }

      const chunks = [];
      resp.on('data', (d) => chunks.push(d));
      resp.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const contentType = (headers['content-type'] || 'application/octet-stream').split(';')[0];
        const fileName = parseContentDispositionFilename(headers['content-disposition']) || 'attachment';
        resolve({
          base64,
          contentType,
          fileName,
          size: buffer.length,
        });
        console.log(`Downloaded: ${fileName}, type=${contentType}, size=${buffer.length}`);
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

module.exports = {
  downloadServiceNowAttachmentBase64,
};
