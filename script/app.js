import { init as initCamera, start as startCamera, pause as pauseCamera } from './camera.js';
import { asciiFromCanvas } from './ascii.js';
import { init  as initWebRtc, sendMessage, closeConnection } from './webrtc.js';
import { initChat, enableChat, disableChat, receiveMessage, sendAsciiMessage } from './chat.js';
import { testCompression, compressAscii, decompressAscii, getCompressionStats } from './compression.js';

// Initialize the camera and ASCII rendering
let webrtcReady = false;

export function initializeAsciiCamera() {
    const asciiContainer = document.getElementById("ascii");
    let capturing = false;

 
    
    // Send a message after the data channel opens
    


    initCamera({
        width: 160,
        height: 120,
        fps: 30,
        mirror: true,

        // This function runs on each frame capture
        onFrame: function (canvas) {
            asciiFromCanvas(canvas, {
                // contrast: 128, // You can customize contrast here
                callback: function (asciiString) {
                    // TEST COMPRESSION IN LOCAL DEMO MODE
                    console.log('Original ASCII length:', asciiString.length);

                    // Compress the ASCII
                    const compressed = compressAscii(asciiString);
                    console.log('Compressed length:', compressed.length);

                    // Get compression stats
                    const stats = getCompressionStats(asciiString, compressed);
                    console.log('Compression ratio:', stats.ratio, 'Savings:', stats.savingsPercent + '%');

                    // Decompress and test
                    const decompressed = decompressAscii(compressed);
                    const matches = asciiString === decompressed;
                    console.log('Decompression matches original:', matches);

                    if (!matches) {
                        console.error('COMPRESSION ERROR!');
                        console.log('Original first 100 chars:', asciiString.substring(0, 100));
                        console.log('Decompressed first 100 chars:', decompressed.substring(0, 100));
                    }

                    // Display the decompressed ASCII to test if compression works
                    asciiContainer.innerHTML = decompressed;
                }
            });
        },

        // This function runs when the camera successfully initializes
        onSuccess: function () {
            document.getElementById("info").style.display = "none";

            const button = document.getElementById("button");
            const testButton = document.getElementById("test-compression");

            button.style.display = "block";
            testButton.style.display = "block";

            button.onclick = function () {
                if (capturing) {
                    pauseCamera();
                    button.innerText = 'resume';
                } else {
                    startCamera();
                    button.innerText = 'pause';
                }
                capturing = !capturing;
            };

            testButton.onclick = function () {
                console.log('Running compression test...');
                testCompression();
            };
        },

        // This function runs when an error occurs during camera initialization
        onError: function (error) {
            console.error('Camera initialization error:', error);
        },

        // This function runs if the browser does not support the camera API
        onNotSupported: function () {
            document.getElementById("info").style.display = "none";
            asciiContainer.style.display = "none";
            document.getElementById("notSupported").style.display = "block";
        }
    });
}
const asciiContainer = document.getElementById("ascii");

// Initialize chat
initChat({
    onSendMessage: (message) => {
        sendMessage(message);
    }
});

initWebRtc({
    onOpen: () => {
        console.log('Data channel opened!');
        enableChat();
        webrtcReady = true;
        // Don't initialize camera here - it's already initialized below
    },
    onMessage: (msg) => {
        // Handle incoming messages - separate ASCII from chat
        const result = receiveMessage(msg);
        if (result && result.type === 'ascii') {
            // In a real peer-to-peer setup, this would display the remote peer's ASCII
            // For now, we'll just log it since we're showing our own camera locally
            console.log('Received ASCII from peer (compressed)');
        }
    },
    onError: (err) => {
        console.error('Error:', err);
        disableChat();
    },
    onClose: () => {
        console.log('Data channel closed');
        disableChat();
    },
    onConnectionStateChange: (state) => console.log('ICE Connection State:', state)
});

// Automatically initialize when this module is imported
initializeAsciiCamera();

// Make debug functions available globally for testing
window.testCompression = testCompression;