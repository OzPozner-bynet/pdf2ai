<<<<<<< HEAD
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
winget install -e --id OpenJS.NodeJS -h
npm install
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365 -nodes -subj "/CN=localhost"
npx pm2 start server.js




curl -X POST  http://localhost:8080/api/extract-pdf-data  -F "pdf=@C:\tmp\s.pdf"  -o c:\tmp\output.json
=======
PDF Data Extraction with AWS Bedrock
This Node.js application provides a web service to extract structured data from PDF files. It works by converting each page of an uploaded PDF into a high-resolution PNG image and then uses a powerful multimodal model via AWS Bedrock (such as Claude 3 Sonnet) to analyze each image and return its content as JSON.

Features
RESTful API: Simple POST endpoint to upload and process PDF files.

High-Quality Conversion: Converts PDF pages to high-DPI PNGs for accurate analysis.

AI-Powered Data Extraction: Leverages AWS Bedrock's multimodal models to understand text, layout, and tables.

Structured JSON Output: Aggregates data from all pages into a single, structured JSON response.

Secure Configuration: Uses a .env file to manage AWS credentials securely.

Robust & Scalable: Built with Express.js, with error handling and cleanup of temporary files.

Testable: Includes unit and integration tests using Jest and Supertest.

Prerequisites
Node.js: Version 18.x or later.

npm: Node Package Manager (comes with Node.js).

AWS Account: An active AWS account with programmatic access.

AWS Bedrock Access: You must have access to the desired foundation model (e.g., Anthropic Claude 3 Sonnet) enabled in your AWS account region.

IAM Permissions: An IAM user with an Access Key and Secret Access Key. This user must have the bedrock:InvokeModel permission for the model you intend to use.

Installation & Setup
1. Clone the Repository

git clone <repository-url>
cd pdf-to-bedrock-json

2. Install Dependencies

npm install

3. Configure Environment Variables

Create a .env file in the root of the project by copying the provided example:

cp .env.example .env

Now, open the .env file and fill in your specific AWS details:

# .env

# The AWS region where Bedrock model access is enabled (e.g., us-east-1)
AWS_REGION="YOUR_AWS_REGION"

# Your IAM user's credentials
AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY"

# The Bedrock model to use. Claude 3 Sonnet is recommended.
BEDROCK_MODEL_ID="anthropic.claude-3-sonnet-20240229-v1:0"

# Optional: The port for the server to run on.
PORT=3000

Running the Application
0. run .install.ps1

1. Start the Server

npm start

The server will start and listen on the port defined in your .env file (default is 3000).

Server is running on http://localhost:3000

2. Run the Tests

To ensure everything is configured correctly, you can run the test suite:

npm test

Sample Run (API Usage)
You can use a tool like cURL or Postman to interact with the API endpoint.

cURL Example
Use the following command to upload a PDF named my-document.pdf and save the JSON output to output.json.

curl -X POST \
  http://localhost:3000/api/extract-pdf-data \
  -F "pdf=@/path/to/your/my-document.pdf" \
  -o output.json

-F "pdf=@/path/to/your/my-document.pdf": Specifies the file to upload.

-o output.json: Writes the server's response to output.json.

Expected Output (output.json)
The server will respond with a JSON object containing the data extracted from each page.

{
  "message": "Data extracted successfully.",
  "data": [
    {
      "page": 1,
      "content": {
        "title": "Invoice #12345",
        "date": "2024-09-30",
        "bill_to": {
          "name": "John Doe",
          "address": "123 Main St, Anytown, USA"
        },
        "items": [
          { "description": "Product A", "quantity": 2, "price": 50.00 },
          { "description": "Service B", "quantity": 1, "price": 150.00 }
        ],
        "total": 250.00
      }
    },
    {
      "page": 2,
      "content": {
        "section_title": "Terms and Conditions",
        "text": "Payment is due within 30 days..."
      }
    }
  ]
}

Note: The structure of the content object is determined by the AI model based on the content of your PDF page.

Project Structure
server.js: The main Express.js application entry point. Sets up the server and API routes.

package.json: Defines project metadata and dependencies.

.env: Stores confidential configuration like API keys.

src/controllers/pdfController.js: Handles the main workflow: PDF-to-image conversion, calling the Bedrock service, and aggregating results.

src/services/bedrockService.js: A dedicated module for all communication with the AWS Bedrock API.

__tests__/app.test.js: Contains integration and unit tests for the application.

README.md: This documentation file.
>>>>>>> 6ec2fa46af6c6cbadd8ee0d5759e8f3464f292b0
Using curl:
bash
curl -X POST http://localhost:8080/api/sendtollm  -F "pdf=@/path/to/document.pdf"  -F "mapping=@/path/to/mapping.json"  -F "prompt=@/path/to/prompt.txt"
Using JavaScript (e.g. in frontend):
js
const formData = new FormData();
formData.append('pdf', pdfInput.files[0]);
formData.append('mapping', mappingInput.files[0]);
formData.append('prompt', promptInput.files[0]);

fetch('/api/sendtollm', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data));


fixed tests
echo "PDF placeholder" > tests/fixtures/sample.pdf
echo '{ "Invoice Number": "SN.InvoiceID" }' > tests/fixtures/mapping.json
echo "Extract invoice details from this document." > tests/fixtures/prompt.txt


winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
winget install --id Google.CloudSDK -e
winget install --id GraphicsMagick.GraphicsMagick -e
winget install --id ArtifexSoftware.Ghostscript -e