const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    url: 'https://genaigenaipov.service-now.com/api/now/attachment/e7662c95937f26509d4937e86cba1082/file',
    authHeader: 'Basic YWRtaW46MXEydzNlNHJUIQ==',
    outputDir: './downloads',
    filename: 'servicenow_attachment.json'
};

// Create downloads directory if it doesn't exist
if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
}

// Function to download file from ServiceNow
function downloadFromServiceNow() {
    return new Promise((resolve, reject) => {
        const url = new URL(config.url);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Authorization': config.authHeader,
                'Accept': '*/*',
                'User-Agent': 'Node.js ServiceNow Client'
            }
        };

        console.log('Downloading file from ServiceNow...');
        console.log('URL:', config.url);

        const req = https.request(options, (res) => {
            console.log('Response Status:', res.statusCode);
            console.log('Response Headers:', res.headers);

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
            }

            let data = '';
            let binaryData = [];

            // Handle different content types
            const contentType = res.headers['content-type'] || '';
            
            if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml')) {
                // Text-based content
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
            } else {
                // Binary content
                res.on('data', (chunk) => {
                    binaryData.push(chunk);
                });
            }

            res.on('end', () => {
                try {
                    let fileContent;
                    let fileExtension;

                    if (data) {
                        // Text-based content
                        fileContent = data;
                        fileExtension = getFileExtensionFromContent(data, contentType);
                    } else {
                        // Binary content
                        fileContent = Buffer.concat(binaryData);
                        fileExtension = getFileExtensionFromHeaders(res.headers);
                    }

                    // Save the original file
                    const originalFilePath = path.join(config.outputDir, `original_file${fileExtension}`);
                    fs.writeFileSync(originalFilePath, fileContent);
                    console.log(`Original file saved to: ${originalFilePath}`);

                    // Create JSON representation
                    const jsonData = createJsonRepresentation(fileContent, res.headers, contentType);
                    const jsonFilePath = path.join(config.outputDir, config.filename);
                    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
                    console.log(`JSON file saved to: ${jsonFilePath}`);

                    resolve({
                        originalFile: originalFilePath,
                        jsonFile: jsonFilePath,
                        data: jsonData
                    });

                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(30000, () => {
            req.abort();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Function to determine file extension from content
function getFileExtensionFromContent(content, contentType) {
    if (contentType.includes('json')) return '.json';
    if (contentType.includes('xml')) return '.xml';
    if (contentType.includes('csv')) return '.csv';
    if (contentType.includes('text')) return '.txt';
    
    // Try to detect from content
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return '.json';
    if (trimmed.startsWith('<')) return '.xml';
    
    return '.txt';
}

// Function to determine file extension from headers
function getFileExtensionFromHeaders(headers) {
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
            const filename = match[1].replace(/['"]/g, '');
            return path.extname(filename) || '.bin';
        }
    }
    
    const contentType = headers['content-type'] || '';
    if (contentType.includes('pdf')) return '.pdf';
    if (contentType.includes('image')) return '.img';
    if (contentType.includes('json')) return '.json';
    if (contentType.includes('xml')) return '.xml';
    
    return '.bin';
}

// Function to create JSON representation of the file
function createJsonRepresentation(content, headers, contentType) {
    const jsonData = {
        metadata: {
            downloadedAt: new Date().toISOString(),
            contentType: contentType,
            contentLength: headers['content-length'],
            server: headers['server'],
            lastModified: headers['last-modified']
        },
        headers: headers,
        content: null,
        contentInfo: {
            type: null,
            size: null,
            encoding: null
        }
    };

    // Handle different content types
    if (typeof content === 'string') {
        jsonData.contentInfo.type = 'text';
        jsonData.contentInfo.size = content.length;
        jsonData.contentInfo.encoding = 'utf-8';
        
        // Try to parse as JSON
        try {
            jsonData.content = JSON.parse(content);
            jsonData.contentInfo.format = 'json';
        } catch {
            jsonData.content = content;
            jsonData.contentInfo.format = 'text';
        }
    } else {
        // Binary content
        jsonData.contentInfo.type = 'binary';
        jsonData.contentInfo.size = content.length;
        jsonData.contentInfo.encoding = 'base64';
        jsonData.content = content.toString('base64');
        jsonData.contentInfo.format = 'binary';
    }

    return jsonData;
}

// Function to display upload instructions
function displayUploadInstructions(result) {
    console.log('\n=== UPLOAD INSTRUCTIONS ===');
    console.log('To upload this file to Claude:');
    console.log('1. Go to Claude.ai in your browser');
    console.log('2. Click the attachment/upload button (??)');
    console.log('3. Select one of these files:');
    console.log(`   - Original file: ${result.originalFile}`);
    console.log(`   - JSON version: ${result.jsonFile}`);
    console.log('4. Ask Claude to analyze or convert the content');
    console.log('\n=== FILE PREVIEW ===');
    console.log('JSON Preview:');
    console.log(JSON.stringify(result.data, null, 2).substring(0, 500) + '...');
}

// Main execution
async function main() {
    try {
        console.log('Starting ServiceNow file download...\n');
        
        const result = await downloadFromServiceNow();
        
        console.log('\n? Download completed successfully!');
        displayUploadInstructions(result);
        
    } catch (error) {
        console.error('? Error downloading file:', error.message);
        
        // Provide troubleshooting tips
        console.log('\n?? Troubleshooting Tips:');
        console.log('1. Check if the ServiceNow instance is accessible');
        console.log('2. Verify the authorization credentials are correct');
        console.log('3. Ensure the attachment sys_id exists');
        console.log('4. Check if your IP is allowed to access the ServiceNow instance');
        console.log('5. Verify the API endpoint is correct');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    downloadFromServiceNow,
    config
};
