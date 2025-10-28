const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const fs = require("fs").promises;
const path = require("path");

// Generate log file name with current date
const currentDate = new Date().toISOString().split("T")[0]; // e.g., "2025-09-30"
const logFilePath = path.join(__dirname,'../../logs/' ,`bedrock-${currentDate}.log`);

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

        const prompt = `
            You are an expert data extraction agent.
            Analyze the following image(s) of a document page(s) and send a combined response only after you get all page(s).
            make sure you return a well formed valid combined JSON.
            Extract all text, tables, and structured data from the image(s). Do not skip or ommit any content.
            Do not hallucinate or infer information that is not explicitly present.
            For each extracted object / section / record, show a validity score indicating confidence in the accuracy of the parsed data, 
            show detected language;
            show detected currency and the value for records showing money, currency symbols or currencies letters;
            if unsure add subs section with validty score for the top 3 options you think are valid for the sepcific value.

            Use ServiceNow Source to Pay (S2P) headers as JSON labels. At the end of the JSON output, include a separate mapping object that shows the relationship and assumptio you used to
            replace "The original labels or headers" found in the document and the corresponding standardized Servicenow labels used for future easy ServiceNow integration which replaced them.
            if tables is detected show headers, rows as seperated sub section with validity score for each record and for the entire row.
            check your self and validate the sums you extracted matches the sums in the document, no need to show the validity and assumption used.

            Your output must be a single, well-formed JSON object. The structure should logically representing the layout and hierarchy of the entire document content / chat / pages / images.
            Do not ommit any data , if unsure take best option and also state alternatives with validity score for each option.
            Please include any text, commentary, or explanation in a sperated section of the JSON object with json headers for each section / data you added.
            check your self and the combined json, make sure each json object / part contains validity score add as seperated tag for each record / section / row / value / ... .
            as a seperated sub section in the json include modal_id used, date and time, prompt and all relevent meta-data.
            verify and make sure all data you return is wrapped inside a well from valid json combining all pages , images and meta-data m validations , comments or any other data you created.
            when you return a json make sure to merge it with responses for previous images / pages in this chat / session. 
        `;

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
                            text: prompt,
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

module.exports = { analyzeImageWithBedrock };