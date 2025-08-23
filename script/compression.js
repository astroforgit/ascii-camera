// ASCII art compression using LZ-string - a proven, lightweight compression library
// Perfect for repetitive text data like ASCII art

import LZString from 'lz-string';

/**
 * Compress ASCII art string using LZ-string
 * @param {string} asciiString - The ASCII art to compress
 * @returns {string} - Compressed string
 */
export function compressAscii(asciiString) {
    if (!asciiString || asciiString.length === 0) {
        return '';
    }

    // Use LZ-string's compressToEncodedURIComponent for safe transmission
    return LZString.compressToEncodedURIComponent(asciiString);
}

/**
 * Decompress ASCII art string using LZ-string
 * @param {string} compressedString - The compressed ASCII art
 * @returns {string} - Decompressed ASCII art
 */
export function decompressAscii(compressedString) {
    if (!compressedString || compressedString.length === 0) {
        return '';
    }

    // Use LZ-string's decompressFromEncodedURIComponent
    const decompressed = LZString.decompressFromEncodedURIComponent(compressedString);
    return decompressed || ''; // Return empty string if decompression fails
}



/**
 * Get compression statistics
 * @param {string} original - Original string
 * @param {string} compressed - Compressed string
 * @returns {object} - Statistics object
 */
export function getCompressionStats(original, compressed) {
    const originalSize = original.length;
    const compressedSize = compressed.length;
    const ratio = originalSize > 0 ? (compressedSize / originalSize) : 0;
    const savings = originalSize - compressedSize;
    const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100) : 0;

    return {
        originalSize,
        compressedSize,
        savings,
        savingsPercent: Math.round(savingsPercent * 100) / 100,
        ratio: Math.round(ratio * 1000) / 1000
    };
}

/**
 * Test compression with sample data using LZ-string
 */
export function testCompression() {
    const testData = [
        "        ........        ",
        "@@@@@@@@@@@@@@@@@@@@@@@@",
        "   ...   ...   ...   ...",
        ":::::::::::::::::::::::::"
    ].join('\n');

    console.log('=== LZ-String Compression Test ===');
    console.log('Original:', JSON.stringify(testData));
    console.log('Original length:', testData.length);

    const compressed = compressAscii(testData);
    console.log('Compressed:', JSON.stringify(compressed));
    console.log('Compressed length:', compressed.length);

    const decompressed = decompressAscii(compressed);
    console.log('Decompressed:', JSON.stringify(decompressed));
    console.log('Decompressed length:', decompressed.length);

    const matches = testData === decompressed;
    console.log('Match:', matches);

    if (!matches) {
        console.log('=== MISMATCH DETAILS ===');
        console.log('Original chars:', testData.split('').map(c => c === '\n' ? '\\n' : c));
        console.log('Decompressed chars:', decompressed.split('').map(c => c === '\n' ? '\\n' : c));

        // Find first difference
        for (let i = 0; i < Math.max(testData.length, decompressed.length); i++) {
            if (testData[i] !== decompressed[i]) {
                console.log(`First difference at index ${i}:`);
                console.log(`Original: "${testData[i]}" (${testData.charCodeAt(i)})`);
                console.log(`Decompressed: "${decompressed[i]}" (${decompressed.charCodeAt(i)})`);
                break;
            }
        }
    }

    const stats = getCompressionStats(testData, compressed);
    console.log('Stats:', stats);

    return { matches, stats, original: testData, compressed, decompressed };
}
