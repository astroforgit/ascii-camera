// Real-world WebRTC implementation for two separate browsers
// This version uses a signaling server to connect two different browsers

let pc;
let dc;
let options = {};
let isInitiator = false;
let signalingSocket;
let currentRoom = null;

// Simple signaling server using WebSocket (you'd need to run a server)
const SIGNALING_SERVER = 'ws://localhost:8080'; // You'd need to implement this server

export function init(peerOptions) {
    options = peerOptions || {};

    // Default options or callbacks if not provided
    const doNothing = () => {};
    options.onOpen = options.onOpen || doNothing;
    options.onMessage = options.onMessage || doNothing;
    options.onError = options.onError || doNothing;
    options.onClose = options.onClose || doNothing;
    options.onConnectionStateChange = options.onConnectionStateChange || doNothing;

    // Create single RTCPeerConnection
    pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }, // Public STUN server
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });

    // Set up ICE candidate handling
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignalingMessage({
                type: 'ice-candidate',
                candidate: event.candidate
            });
        }
    };

    // Set up connection state change event
    pc.oniceconnectionstatechange = () => {
        options.onConnectionStateChange(pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('WebRTC connection established!');
        }
    };

    // Set up data channel handling for incoming connections
    pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
    };

    // Connect to signaling server
    connectToSignalingServer();
}

function connectToSignalingServer() {
    try {
        signalingSocket = new WebSocket(SIGNALING_SERVER);
        
        signalingSocket.onopen = () => {
            console.log('Connected to signaling server');
            // Notify the UI that signaling server is connected
            if (options.onSignalingConnected) {
                options.onSignalingConnected();
            }
            // Don't auto-join a room - wait for user to select one
        };

        signalingSocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await handleSignalingMessage(message);
        };

        signalingSocket.onclose = () => {
            console.log('Disconnected from signaling server');
            options.onError('Signaling server disconnected');
        };

        signalingSocket.onerror = (error) => {
            console.error('Signaling server error:', error);
            options.onError('Signaling server error: ' + error.message);
        };

    } catch (error) {
        console.error('Failed to connect to signaling server:', error);
        // Don't fallback automatically - let user know there's an issue
        options.onError('Failed to connect to signaling server: ' + error.message);
    }
}

async function handleSignalingMessage(message) {
    try {
        switch (message.type) {
            case 'room-joined':
                console.log('Joined room:', message.room);
                currentRoom = message.room;
                break;

            case 'initiate-call':
                console.log('🚀 Initiating WebRTC call, role:', message.role);
                if (message.role === 'caller') {
                    isInitiator = true;
                    console.log('📞 Creating offer as caller...');
                    await createOffer();
                } else {
                    isInitiator = false;
                    console.log('📱 Waiting for offer as callee...');
                }
                break;

            case 'offer':
                console.log('Received offer');
                await handleOffer(message.offer);
                break;

            case 'answer':
                console.log('Received answer');
                await handleAnswer(message.answer);
                break;

            case 'ice-candidate':
                console.log('Received ICE candidate');
                await handleIceCandidate(message.candidate);
                break;

            case 'room-list':
                console.log('Received room list:', message.rooms);
                if (window.updateRoomsList) {
                    window.updateRoomsList(message.rooms);
                }
                break;

            case 'room-full':
                console.log('Room is full:', message.room);
                if (options.onError) {
                    options.onError('Room is full. Please try another room.');
                }
                break;

            case 'room-created':
                console.log('Room created successfully:', message.room);
                if (window.onRoomCreated) {
                    window.onRoomCreated(message.room, message.displayName);
                }
                break;

            case 'room-exists':
                console.log('Room already exists:', message.room);
                if (options.onError) {
                    options.onError('Room name already exists. Please choose a different name.');
                }
                break;

            default:
                console.log('Unknown signaling message:', message);
        }
    } catch (error) {
        console.error('Error handling signaling message:', error);
        options.onError(error);
    }
}

async function createOffer() {
    console.log('🔗 Creating data channel and offer...');
    // Create data channel (only the initiator creates it)
    dc = pc.createDataChannel("ascii-chat");
    console.log('📡 Data channel created:', dc.label);
    setupDataChannel(dc);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('📤 Sending offer to remote peer');

    sendSignalingMessage({
        type: 'offer',
        offer: offer
    });
}

async function handleOffer(offer) {
    await pc.setRemoteDescription(offer);
    
    // Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    sendSignalingMessage({
        type: 'answer',
        answer: answer
    });
}

async function handleAnswer(answer) {
    await pc.setRemoteDescription(answer);
}

async function handleIceCandidate(candidate) {
    await pc.addIceCandidate(candidate);
}

function setupDataChannel(channel) {
    console.log('⚙️ Setting up data channel:', channel.label, 'State:', channel.readyState);
    dc = channel;
    dc.onopen = () => {
        console.log('✅ Data channel opened successfully!');
        options.onOpen();
    };
    dc.onmessage = (event) => {
        options.onMessage(event.data);
    };
    dc.onerror = (error) => {
        console.error('❌ Data channel error:', error);
        options.onError(error);
    };
    dc.onclose = () => {
        console.log('🔒 Data channel closed');
        options.onClose();
    };
}

export function sendSignalingMessage(message) {
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify(message));
        console.log('Sent signaling message:', message.type);
    } else {
        console.error('Signaling socket not ready, state:', signalingSocket ? signalingSocket.readyState : 'null');
    }
}

// Send message through data channel
export function sendMessage(message) {
    if (dc && dc.readyState === "open") {
        dc.send(message);
    } else {
        console.error("DataChannel is not open. State:", dc ? dc.readyState : 'null');
        options.onError("DataChannel is not open.");
    }
}

// Close the peer connection and data channel
export function closeConnection() {
    if (dc) dc.close();
    if (pc) pc.close();
    if (signalingSocket) signalingSocket.close();
}

// Fallback to local loopback if signaling server is not available
function initLocalLoopback() {
    console.log('Using local loopback mode (demo only)');
    
    // Import and use the original local WebRTC
    import('./webrtc.js').then(localWebRTC => {
        localWebRTC.init(options);
    }).catch(error => {
        console.error('Failed to load local WebRTC:', error);
        options.onError('Failed to initialize WebRTC');
    });
}

// Utility function to generate room codes
export function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Function to join a specific room
export function joinRoom(roomCode) {
    currentRoom = roomCode;
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        sendSignalingMessage({
            type: 'join-room',
            room: roomCode
        });
    }
}

// Function to get current room
export function getCurrentRoom() {
    return currentRoom;
}
