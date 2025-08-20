const sharp = require("sharp"); // gets the image metadata and changes image to buffer

// Image processing configuration
const MAX_WIDTH = 720; // omit the "height" makes it automatically determined, maintain aspect ratio.
const QUALITY = 80; // 80% quality

// Utility function to process image after it has been uploaded, before saving it in the database
async function processImage(buffer) {
    const imageData = sharp(buffer);
    const metadata = await imageData.metadata(); // gets the uploaded image metadata

    // Check if resizing is needed
    if (metadata.width > MAX_WIDTH) {
        return await imageData
            .resize(MAX_WIDTH) // height is automatically calculated which maintains aspect ratio
            .jpeg({ quality: QUALITY })
            .toBuffer(); // .toFile(`./foldername/${filename}`);   ==> to save to file path
    }

    // If no resizing needed, just optimize
    return await imageData.jpeg({ quality: QUALITY }).toBuffer();
}

module.exports = { processImage };