const path = require("path");
const fs = require("fs").promises;
const pdfPoppler = require("pdf-poppler");
const { analyzeImageWithBedrock } = require("C:\\bedrock-aws\\services\\bedrockService");



function getCurrentFormattedTime() {
  const now = new Date();

  // Get date components
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = String(now.getFullYear()).slice(-2); // Get last two digits of the year

  // Get time components
  const hours = String(now.getHours()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Combine into the desired format
  return `${day}${month}${year}-${hours}${seconds}`;
}

const formattedTime = getCurrentFormattedTime();
console.log(formattedTime);

/**
 * Converts a PDF file into PNG images using Poppler.
 * @param {string} pdfPath - The file path to the input PDF.
 * @returns {Promise<Array<{ path: string }>>} - Array of image file paths.
 */
async function convertPdfToImages(pdfPath) {
    console.log("Starting PDF to image conversion...");
    const outputDir = path.dirname(pdfPath);
    const filename = path.basename(pdfPath)
    const formattedTime = getCurrentFormattedTime();
    const options = {
        format: "png",
        out_dir: outputDir,
        out_prefix: "page-"+formattedTime+"-"+filename,
        page: null // Convert all pages
    };

    try {
        await pdfPoppler.convert(pdfPath, options);

        const files = await fs.readdir(outputDir);
        const imageFiles = files
            .filter(file => file.startsWith(options.out_prefix) && file.endsWith(".png"))
            .map(file => ({ path: path.join(outputDir, file) }));

        console.log("PDF converted to images successfully.");
        return imageFiles;
    } catch (error) {
        console.error("Failed to convert PDF to images:", error);
        throw new Error("PDF to image conversion failed.");
    }
}

/**
 * Processes a PDF file and extracts data using Bedrock.
 * @param {string} pdfPath - The file path to the input PDF.
 * @returns {Promise<Array>} - Array of extracted results.
 */
async function processPdfAndExtractData(pdfPath) {
    try {
        const images = await convertPdfToImages(pdfPath);
        const results = [];

        for (const image of images) {
            const result = await analyzeImageWithBedrock(image.path);
            results.push(result);
        }

        return results;
    } catch (error) {
        console.error("Error during PDF processing:", error);
        throw error;
    }
}

async function processPdfAndExtractData2(pdfPath, prompt, mapping) {
    try {
        const images = await convertPdfToImages(pdfPath);
        const results = [];

        for (const image of images) {
            const result = await analyzeImageWithBedrock2(image.path, prompt, mapping);
            results.push(result);
        }

        return results;
    } catch (error) {
        console.error("Error during PDF processing:", error);
        throw error;
    }
}


module.exports = {
    convertPdfToImages,
    processPdfAndExtractData,
    processPdfAndExtractData2
};