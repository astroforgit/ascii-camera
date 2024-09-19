const characters = (" .,:;i1tfLCG08@").split("");

// Main function to convert canvas to ASCII
export function asciiFromCanvas(canvas, options = {}) {
    // Set default values for options
    options.contrast = (typeof options.contrast === "undefined" ? 128 : options.contrast);
    options.callback = options.callback || doNothing;

    const context = canvas.getContext("2d");
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    let asciiCharacters = "";

    // Calculate contrast factor
    // Reference: http://www.dfstudios.co.uk/articles/image-processing-algorithms-part-5/
    const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));

    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);

    // Loop through pixels, and process them to convert to ASCII characters
    for (let y = 0; y < canvasHeight; y += 2) { // every other row because letters are not square
        for (let x = 0; x < canvasWidth; x++) {
            const offset = (y * canvasWidth + x) * 4;
            const color = getColorAtOffset(imageData.data, offset);

            // Increase the contrast for better ASCII representation
            const contrastedColor = {
                red: bound(Math.floor((color.red - 128) * contrastFactor) + 128, [0, 255]),
                green: bound(Math.floor((color.green - 128) * contrastFactor) + 128, [0, 255]),
                blue: bound(Math.floor((color.blue - 128) * contrastFactor) + 128, [0, 255]),
                alpha: color.alpha
            };

            // Calculate pixel brightness
            const brightness = (0.299 * contrastedColor.red + 0.587 * contrastedColor.green + 0.114 * contrastedColor.blue) / 255;
            const character = characters[(characters.length - 1) - Math.round(brightness * (characters.length - 1))];

            asciiCharacters += character;
        }
        asciiCharacters += "\n"; // Add new line at the end of each row
    }

    // Call the provided callback with the ASCII result
    options.callback(asciiCharacters);
}

// Helper function to get pixel color at a specific offset
function getColorAtOffset(data, offset) {
    return {
        red: data[offset],
        green: data[offset + 1],
        blue: data[offset + 2],
        alpha: data[offset + 3]
    };
}

// Helper function to keep values within a given range
function bound(value, interval) {
    return Math.max(interval[0], Math.min(interval[1], value));
}

// Default no-op function if no callback is provided
function doNothing() {}