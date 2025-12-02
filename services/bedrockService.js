const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { error } = require("console");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");


// Generate log file name with current date
const currentDate = new Date().toISOString().split("T")[0]; // e.g., "2025-09-30"
const logFilePath = path.join(__dirname, '../../logs/', `bedrock-${currentDate}.log`);

// Helper function to log to both console and file
async function log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    await fs.appendFile(logFilePath, logEntry + "\n");
}

// Ensure required environment variables are set
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials and region must be configured in the .env file.");
}

// Initialize the Bedrock Runtime client
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";

/**
 * Analyzes an image using AWS Bedrock with a multimodal model.
 * @param {string} imagePath - The file path to the image to be analyzed.
 * @returns {Promise<object>} A promise that resolves to the JSON object extracted from the image.
 */
async function analyzeImageWithBedrock(imagePath) {
    try {
        await log(`Starting analysis for image: ${imagePath}`);

        const imageBytes = await fs.readFile(imagePath);
        const base64Image = imageBytes.toString("base64");
        let promptText = null;
        const prompt0 = `   
            You are an expert data extraction agent.
            Analyze the following image(s) of a document page(s) and send a combined response only after you get all page(s).
            make sure you return a well formed valid combined JSON for easy API integration ServiceNow.
            Extract all text, tables, and structured data from the image(s). Do not skip or ommit any content.
            Do not hallucinate or infer information that is not explicitly present. if data for label is not found / unclear state no data found for label.
            For each extracted object / section / record / label, show a validity score indicating confidence in the accuracy of the parsed data, 
            show detected language;validity score should be between 0 to 1 e.g. 0.95. for each key / label state the source key, the ServiceNow s2p relevent standard label/key and sample data.
            show detected currency and the value for records showing money, currency symbols or currencies letters;
            if unsure add subs section with validty score for the top 3 options you think are valid for the sepcific value.

            Use ServiceNow Source to Pay (S2P) headers as JSON labels. At the end of the JSON output, include a separate mapping object that shows the relationship and assumptio you used to
            replace "The original labels or headers" found in the document and the corresponding standardized Servicenow labels used for future easy ServiceNow integration which replaced them.
            if tables is detected show headers, rows as seperated sub section with validity score for each record and for the entire row.
            check your self and validate the sums you extracted matches the sums in the document, no need to show the validity and assumption used.

            Your output must be a single, well-formed JSON object.  
            dates should be in format yyyy-mm-dd. The structure should logically representing the layout and hierarchy of the entire document content / chat / pages / images.
            Do not ommit any data , if unsure take best option and also state alternatives with validity score for each option.
            Please include any text, commentary, or explanation in a sperated section of the JSON object with json headers for each section / data you added.
            check your self and the combined json, make sure each json object / part contains validity score add as seperated tag for each record / section / row / value / ... .
            as a seperated sub section in the json include modal_id used, date and time, prompt and all relevent meta-data.
            verify and make sure all data you return is wrapped inside a well from valid json combining all pages , images and meta-data , validations , comments or any other data you created.
            when you return a json make sure to merge it with responses for previous images / pages in this chat / session. this my prompt version 2.1
         `;
        const promptPath = path.join(__dirname, 'prompt.txt');
        console.log(`path for prompt is ${promptPath}`)
        // Read prompt

        if (fsSync.existsSync(promptPath)) {
            try {
                promptText = await fs.readFile(promptPath, 'utf-8');
            } catch (err) {
                return res.status(500).json({ error: 'Failed to read prompt.txt', details: err.message });
            }
        } else {
            promptText = prompt0;
        }
    console.log(`85 prompt being used ${promptText}`);

        const payload = {
            modelId: modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 16000,
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/png",
                                data: base64Image,
                            },
                        },
                        {
                            type: "text",
                            text: promptText,
                        },
                    ],
                }],
            }),
        };

        await log(`Invoking Bedrock model: ${modelId}`);
        const command = new InvokeModelCommand(payload);
        const apiResponse = await bedrockClient.send(command);

        const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
        const responseJson = JSON.parse(decodedResponseBody);
        const modelOutput = responseJson.content[0].text;

        try {
            const parsedOutput = JSON.parse(modelOutput);
            await log(`Successfully parsed model output for image: ${imagePath}`);
            return parsedOutput;
        } catch (parseError) {
            await log(`Failed to parse JSON from model output: ${modelOutput}`);
            return { error: "Model did not return valid JSON.", raw_response: modelOutput };
        }

        // } catch (error) {
        //     await log(`Error during Bedrock invocation: ${error.message}`);
        //    throw new Error("Failed to get data from AWS Bedrock.");
        // }
    } catch (error) {
        await log(`Bedrock invocation failed msg ${error.message} \n stack: ${error.stack}`);
        throw new Error(`Bedrock service is currently unavailable. ${error.message} \n stack: ${error.stack}`);
    }



}


async function analyzeImageWithBedrock2(imagePath, prompt, mapping) {
    try {
        await log(`130 Starting analysis for image: ${imagePath}`);

        const imageBytes = await fs.readFile(imagePath);
        const base64Image = imageBytes.toString("base64");

        const prompt1 = `You are an OCR-to-JSON extraction engine.

Extract only what is explicitly visible in the document image.

Do not guess, infer, assume, complete, hallucinate, correct, or fix any text.

Your output must be a fully structured and consistent JSON object.

If a field does not appear or is unclear, return:

"value": "NOT_FOUND"

"source_text": "NOT_FOUND"

"alternatives": []

"validity_score": 0

Double-check every extracted value against the document.

If you are unsure, provide up to three alternative interpretations with individual validity scores.

STRICT RULES:

1. No hallucination. No external knowledge. No assumptions.
2. Extract only text that is visible. Copy text exactly as written.
3. Output must be valid JSON only. No markdown. No code fences.
4. Every field must include:
    - value
    - source_text
    - validity_score (0 to 1, decimals allowed)
    - alternatives (up to three values, each with a validity score)
5. Detect currency when relevant.
6. Provide a per-line validity score for line items.
7. Provide an overall_validity_score for the entire invoice.
8. Every field must exist in the JSON even when missing.
9. If a section contains no content, return all fields inside it as NOT_FOUND with validity_score: 0.
10. model_id must match the actual model used.
11. Dates extracted from the document must be normalized to YYYY-MM-DD format when possible.
12. Do not merge this extraction with previous messages. Each extraction is isolated.

OUTPUT FORMAT (must always follow this structure):

{

"vendor": {

"name": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"address": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"phone": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"email": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 }

},

"invoice": {

"invoice_number": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"invoice_date": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"payment_due_date": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"po_number": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 }

},

"amounts": {

"subtotal": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"tax_amount": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"tax_rate": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"total_amount_due": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 }

},

"line_items": [

{

"description": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"quantity": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"unit_price": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"line_total": { "value": "", "source_text": "", "alternatives": [], "validity_score": 0 },

"validity_score": 0

}

],

"overall_validity_score": 0,

"meta": {

"model_id": "<MODEL_NAME>",

"timestamp": "<UTC_TIMESTAMP>",

"prompt_version": "3.0"

}

}

Additional instructions:

- Output must be a single valid JSON object.
- Do not wrap the JSON in quotes, markdown, or code blocks.

- All fields must appear exactly as defined above.      `;

        const prompt2 = `You are an expert invoice OCR extraction agent.

Analyze the supplied document image(s) and extract all visible information exactly as it appears, without omission and without hallucination. Extract all text, all numeric values, all labels, all headers and footers, all table rows, all line items, all metadata, and all invoice fields defined below. If you are unsure about a value, return it exactly as written in the document. Never guess, infer, or create values.

Do not omit any text from any page. Preserve the exact formatting and spelling of any extracted value. Dates should be returned in YYYY-MM-DD format when clearly identifiable. Numeric values must include currency when currency is shown. Return a single JSON object combining all pages.

Use the following keys exactly as written. These represent the standard_field names from the mapping table. For every key return an object with “value” and “validity_score”. “value” must contain the extracted value or “data_not_found” if the field does not appear in the document. “validity_score” must be a confidence value between 0 and 1. Do not rename keys. Do not remove keys.

Mandatory fields that must always appear, even if missing: invoice_number, invoice_date, vendor_name, total_amount_due, currency. If a mandatory field is missing, return “data_not_found”.

Fields to extract:

invoice_number

invoice_date

due_date

vendor_name

vendor_id

bill_to_address

account_number

billing_period

total_amount_due

subtotal_amount

tax_amount

tax_rate

purchase_order_number

ship_to_address

currency

(Include any additional standard_field keys provided in the input and return them using the same structure.)

Return only the following JSON structure:

{

"fields": {

"<standard_field_key>": {

"value": "",

"validity_score": 0

}

},

"line_items": [

{

"description": "",

"quantity": "",

"unit_price": "",

"total_line_amount": "",

"tax_line_amount": "",

"uom": "",

"po_line_number": ""

}

],

"all_text": "",

"meta": {

"pages": "",

"mypromptversion": "1911",

"llm_notes": ""

}

}

Every standard_field key provided must appear in the output JSON. Missing values must be returned as “data_not_found”. Do not output anything other than the final JSON. Do not include explanations, comments, or text outside the JSON.`;





        let myprompt = prompt || prompt2;
        if (myprompt.includes("No vendor-specific prompt found for")) {
            myprompt = prompt2;
        }
        if (mapping) {
            const jsonString = JSON.stringify(mapping);
            myprompt = myprompt + " \n use the following mapping to map labels from the document to standard serviceenow label: \n" + jsonString;
        }    
        console.log(`378 prompt being used ${myprompt}\n with model ${modelId}`);
        const payload = {
            modelId: modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 16000,
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/png",
                                data: base64Image,
                            },
                        },
                        {
                            type: "text",
                            text: myprompt,
                        },
                    ],
                }],
            }),
        };

        await log(`410 Invoking Bedrock model: ${modelId}`);
        const command = new InvokeModelCommand(payload);
        const apiResponse = await bedrockClient.send(command);

        const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
        let cleaned = decodedResponseBody.replace(/```json|```/g, "").trim();
        JSON.parse(cleaned);

        const responseJson = JSON.parse(cleaned);
        const modelOutput = responseJson.content[0].text;

        try {
            const parsedOutput = JSON.parse(modelOutput);
            await log(`Successfully parsed model output for image: ${imagePath}`);
            return parsedOutput;
        } catch (parseError) {
            const myerror = parseError.message;
            await log(`Failed to parse JSON from model output: ${modelOutput} \n Error: ${myerror} \n`);
            return { error: "Model did not return valid JSON.", error: myerror, raw_response: modelOutput };
        }

        // } catch (error) {
        //     await log(`Error during Bedrock invocation: ${error.message}`);
        //    throw new Error("Failed to get data from AWS Bedrock.");
        // }
    } catch (error) {
        await log(`Bedrock invocation failed msg ${error.message} \n stack: ${error.stack}`);
        throw new Error(`Bedrock service is currently unavailable. ${error.message} \n stack: ${error.stack}`);
    }



}

//*********************************************************** */


/**
 * Dynamically invokes a Bedrock model with image + prompt + mapping + optional modelId
 * @param {string} imagePath - Path to the image file
 * @param {string|null} prompt - Optional prompt text
 * @param {string|null} mapping - Optional mapping text
 * @param {string|null} modelIdOverride - Optional model ID to override default
 * @returns {Promise<object>} Parsed JSON response or raw output
 */
async function analyzeImageWithBedrockDynamic(imagePath, prompt, mapping, modelIdOverride) {
    try {
        await log(`233 Starting analysis for image: ${imagePath}`);

        const imageBytes = await fs.readFile(imagePath);
        const base64Image = imageBytes.toString("base64");

        let myprompt = prompt || "";
        if (mapping) {
            myprompt += `\nUse the following mapping to map labels from the document to standard ServiceNow labels:\n${mapping}`;
        }
        await log(`242 Using prompt: ${myprompt}`);
        let defaultModelId = process.env.BEDROCK_MODEL_ID;
        const modelId = modelIdOverride || defaultModelId || "anthropic.claude-3-sonnet-20240229-v1:0";

        const payload = {
            modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 16000,
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/png",
                                data: base64Image,
                            },
                        },
                        {
                            type: "text",
                            text: myprompt,
                        },
                    ],
                }],
            }),
        };

        await log(`Invoking Bedrock model dynamic: ${modelId}`);
        const command = new InvokeModelCommand(payload);
        const apiResponse = await bedrockClient.send(command);

        const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
        const responseJson = JSON.parse(decodedResponseBody);
        const modelOutput = responseJson.content[0].text;

        try {
            const parsedOutput = JSON.parse(modelOutput);
            await log(`Successfully parsed model output for image: ${imagePath}`);
            return parsedOutput;
        } catch (parseError) {
            await log(`Failed to parse JSON from model output: ${modelOutput}`);
            return { error: "Model did not return valid JSON.", raw_response: modelOutput };
        }
    } catch (error) {
        await log(`Bedrock invocation failed msg ${error.message} \n stack: ${error.stack}`);
        throw new Error(`Bedrock service is currently unavailable. ${error.message} \n stack: ${error.stack}`);
    }
}


module.exports = { analyzeImageWithBedrock, analyzeImageWithBedrock2, analyzeImageWithBedrockDynamic };