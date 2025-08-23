#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import LZString from 'lz-string';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// ASCII characters from lightest to darkest
const characters = (" .,:;i1tfLCG08@").split("");

/**
 * Convert image buffer to ASCII art using Sharp
 * @param {string} imagePath - Path to image file
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} ASCII art string
 */
async function imageToAscii(imagePath, width, height, options = {}) {
    const contrast = options.contrast || 128;

    try {
        // Process image with Sharp
        const { data, info } = await sharp(imagePath)
            .resize(width, height, { fit: 'fill' })
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let asciiCharacters = "";

        // Calculate contrast factor
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        // Loop through pixels, process them to convert to ASCII characters
        for (let y = 0; y < height; y += 2) { // every other row because letters are not square
            for (let x = 0; x < width; x++) {
                const offset = y * width + x;

                // Get grayscale value (Sharp already converted to grayscale)
                const grayValue = data[offset];

                // Apply contrast
                const contrastedGray = bound(Math.floor((grayValue - 128) * contrastFactor) + 128, [0, 255]);

                // Convert to ASCII character
                const characterIndex = Math.floor((contrastedGray * (characters.length - 1)) / 255);
                asciiCharacters += characters[characterIndex];
            }
            asciiCharacters += "\n";
        }

        return asciiCharacters;
    } catch (error) {
        throw new Error(`Failed to process image ${imagePath}: ${error.message}`);
    }
}

/**
 * Bound a value within a range
 * @param {number} value - Value to bound
 * @param {Array} range - [min, max] range
 * @returns {number} Bounded value
 */
function bound(value, range) {
    return Math.max(range[0], Math.min(range[1], value));
}

/**
 * Compress ASCII art string using LZ-string
 * @param {string} asciiString - The ASCII art to compress
 * @returns {string} - Compressed string
 */
function compressAscii(asciiString) {
    if (!asciiString || asciiString.length === 0) {
        return '';
    }
    return LZString.compressToEncodedURIComponent(asciiString);
}

/**
 * Extract frames from video and convert to ASCII
 * @param {string} videoPath - Path to input video file
 * @param {string} outputPath - Path to output text file
 * @param {Object} options - Processing options
 */
async function videoToAscii(videoPath, outputPath, options = {}) {
    const tempDir = path.join(process.cwd(), 'temp_frames');
    const width = options.width || 80;
    const height = options.height || 60;
    const fps = options.fps || 10;
    const contrast = options.contrast || 128;

    console.log(`Processing video: ${videoPath}`);
    console.log(`Output dimensions: ${width}x${height}`);
    console.log(`Target FPS: ${fps}`);

    // Create temp directory for frames
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
        // Extract frames from video
        console.log('Extracting frames from video...');
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .fps(fps)
                .size(`${width}x${height}`)
                .output(path.join(tempDir, 'frame_%04d.png'))
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Get list of frame files
        const frameFiles = fs.readdirSync(tempDir)
            .filter(file => file.endsWith('.png'))
            .sort();

        console.log(`Processing ${frameFiles.length} frames...`);

        const asciiFrames = [];

        // Process each frame
        for (let i = 0; i < frameFiles.length; i++) {
            const framePath = path.join(tempDir, frameFiles[i]);

            try {
                const asciiFrame = await imageToAscii(framePath, width, height, { contrast });
                asciiFrames.push(asciiFrame);

                if ((i + 1) % 10 === 0) {
                    console.log(`Processed ${i + 1}/${frameFiles.length} frames`);
                }
            } catch (error) {
                console.error(`Error processing frame ${frameFiles[i]}:`, error.message);
            }
        }

        // Create the final ASCII video data
        const videoData = {
            frames: asciiFrames,
            fps: fps,
            width: width,
            height: height,
            totalFrames: asciiFrames.length,
            metadata: {
                originalVideo: path.basename(videoPath),
                processedAt: new Date().toISOString(),
                compression: 'lz-string'
            }
        };

        console.log('Compressing ASCII data...');
        const jsonString = JSON.stringify(videoData);
        const compressedData = compressAscii(jsonString);

        // Calculate compression stats
        const originalSize = jsonString.length;
        const compressedSize = compressedData.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

        console.log(`Original size: ${originalSize} bytes`);
        console.log(`Compressed size: ${compressedSize} bytes`);
        console.log(`Compression ratio: ${compressionRatio}%`);

        // Save compressed data to file
        fs.writeFileSync(outputPath, compressedData);
        console.log(`ASCII video saved to: ${outputPath}`);

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('Temporary files cleaned up');

    } catch (error) {
        console.error('Error processing video:', error);
        // Clean up temp directory on error
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
    }
}

// Command line interface
if (process.argv.length < 4) {
    console.log('Usage: node video-to-ascii.js <input-video> <output-file> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --width <number>     ASCII width (default: 80)');
    console.log('  --height <number>    ASCII height (default: 60)');
    console.log('  --fps <number>       Target FPS (default: 10)');
    console.log('  --contrast <number>  Contrast level 0-255 (default: 128)');
    console.log('');
    console.log('Example:');
    console.log('  node video-to-ascii.js input.mp4 output.txt --width 100 --height 75 --fps 15');
    process.exit(1);
}

const inputVideo = process.argv[2];
const outputFile = process.argv[3];

// Parse command line options
const options = {};
for (let i = 4; i < process.argv.length; i += 2) {
    const flag = process.argv[i];
    const value = process.argv[i + 1];
    
    switch (flag) {
        case '--width':
            options.width = parseInt(value);
            break;
        case '--height':
            options.height = parseInt(value);
            break;
        case '--fps':
            options.fps = parseInt(value);
            break;
        case '--contrast':
            options.contrast = parseInt(value);
            break;
    }
}

// Validate input file exists
if (!fs.existsSync(inputVideo)) {
    console.error(`Error: Input video file '${inputVideo}' not found`);
    process.exit(1);
}

// Run the conversion
videoToAscii(inputVideo, outputFile, options)
    .then(() => {
        console.log('Video to ASCII conversion completed successfully!');
    })
    .catch((error) => {
        console.error('Conversion failed:', error.message);
        process.exit(1);
    });
