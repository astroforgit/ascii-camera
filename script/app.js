import { init as initCamera, start as startCamera, pause as pauseCamera } from './camera.js';
import { asciiFromCanvas } from './ascii.js';
import { init  as initWebRtc, sendMessage, closeConnection } from './webrtc.js';

// Initialize the camera and ASCII rendering
 
export function initializeAsciiCamera() {
    const asciiContainer = document.getElementById("ascii");
    let capturing = false;

    initWebRtc({
        onOpen: () => {console.log('Data channel opened!');
                        sendMessage('Hello WebRTC!');
                      },
        onMessage: (msg) => console.log('Received message:', msg),
        onError: (err) => console.error('Error:', err),
        onClose: () => console.log('Data channel closed'),
        onConnectionStateChange: (state) => console.log('ICE Connection State:', state)
    });
    
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
                    asciiContainer.innerHTML = asciiString;
                }
            });
        },

        // This function runs when the camera successfully initializes
        onSuccess: function () {
            document.getElementById("info").style.display = "none";

            const button = document.getElementById("button");
            button.style.display = "block";
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

// Automatically initialize when this module is imported
initializeAsciiCamera();