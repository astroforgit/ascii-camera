import { init as initCamera, start as startCamera, pause as pauseCamera } from './camera.js';
import { asciiFromCanvas } from './ascii.js';
import { init as initWebRtc, sendMessage, sendSignalingMessage, closeConnection, generateRoomCode, joinRoom, getCurrentRoom } from './webrtc-real.js';
import { initChat, enableChat, disableChat, receiveMessage, sendAsciiMessage } from './chat.js';
import { testCompression } from './compression.js';

// Initialize the camera and ASCII rendering for real-world usage
let webrtcReady = false;
let currentRoom = null;

export function initializeAsciiCamera() {
    const asciiContainer = document.getElementById("ascii");
    const remoteAsciiContainer = document.getElementById("remote-ascii");
    let capturing = false;

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
                    // Display ASCII locally
                    asciiContainer.innerHTML = asciiString;

                    // Debug: Log first few lines of ASCII
                    const lines = asciiString.split('\n');
                    console.log('Generated ASCII - Lines:', lines.length, 'First line:', lines[0]);

                    // Send ASCII art through WebRTC to the remote peer
                    if (webrtcReady) {
                        console.log('Sending ASCII message (length:', asciiString.length, ')');
                        sendAsciiMessage(asciiString);
                    } else {
                        console.log('WebRTC not ready, not sending ASCII');
                    }
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
            document.getElementById("ascii").style.display = "none";
            document.getElementById("notSupported").style.display = "block";
        }
    });
}

// Initialize room selection
function initRoomSelection() {
    const roomCodeInput = document.getElementById("room-code");
    const joinRoomButton = document.getElementById("join-room");
    const roomSelection = document.getElementById("room-selection");
    const mainContainer = document.getElementById("main-container");

    joinRoomButton.onclick = function () {
        let roomCode = roomCodeInput.value.trim();
        if (!roomCode) {
            roomCode = generateRoomCode();
            roomCodeInput.value = roomCode;
        }

        currentRoom = roomCode;
        updateStatus('Joining room: ' + roomCode + '...');

        // Hide room selection and show main app
        roomSelection.style.display = "none";
        roomSelection.classList.add("hidden");
        mainContainer.style.display = "flex";

        console.log('Room selection hidden, main container shown');

        // Join the room
        joinRoom(roomCode);

        // Initialize camera after joining room
        initializeAsciiCamera();
    };

    // Allow Enter key to join room
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomButton.click();
        }
    });

    // Set up leave room functionality
    const leaveRoomButton = document.getElementById("leave-room");
    leaveRoomButton.onclick = function() {
        // Close WebRTC connection
        closeConnection();

        // Reset state
        currentRoom = null;
        webrtcReady = false;

        // Show room selection and hide main app
        roomSelection.style.display = "block";
        roomSelection.classList.remove("hidden");
        mainContainer.style.display = "none";

        // Reset status
        updateStatus('Disconnected. Choose a room to reconnect.');

        // Clear room code input for new room
        roomCodeInput.value = '';

        console.log('Left room, showing room selection again');
    };
}

// Update connection status
function updateStatus(message, connected = false) {
    const statusIndicator = document.getElementById("status-indicator");
    const statusText = document.getElementById("status-text");
    const roomDisplay = document.getElementById("room-display");
    const leaveRoomButton = document.getElementById("leave-room");

    statusText.textContent = message;
    statusIndicator.className = connected ? "connected" : "disconnected";

    // Show room code and leave button if connected and room is available
    const room = getCurrentRoom() || currentRoom;
    if (connected && room) {
        roomDisplay.textContent = `Room: ${room}`;
        leaveRoomButton.style.display = 'inline-block';
    } else if (room) {
        roomDisplay.textContent = `Room: ${room}`;
        leaveRoomButton.style.display = 'inline-block';
    } else {
        roomDisplay.textContent = '';
        leaveRoomButton.style.display = 'none';
    }
}

// Initialize chat
initChat({
    onSendMessage: (message) => {
        sendMessage(message);
    }
});

// Lobby management
let roomsList = [];

function initLobby() {
    const createRoomBtn = document.getElementById('create-room-btn');
    const newRoomNameInput = document.getElementById('new-room-name');
    const quickJoinBtn = document.getElementById('quick-join-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const refreshRoomsBtn = document.getElementById('refresh-rooms');
    const leaveRoomBtn = document.getElementById('leave-room');

    if (createRoomBtn && newRoomNameInput) {
        createRoomBtn.addEventListener('click', () => {
            const roomName = newRoomNameInput.value.trim();
            createRoom(roomName);
        });

        newRoomNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const roomName = newRoomNameInput.value.trim();
                createRoom(roomName);
            }
        });
    }

    if (quickJoinBtn && roomCodeInput) {
        quickJoinBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode) {
                joinRoomFromLobby(roomCode);
            }
        });

        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const roomCode = roomCodeInput.value.trim();
                if (roomCode) {
                    joinRoomFromLobby(roomCode);
                }
            }
        });
    }

    if (refreshRoomsBtn) {
        refreshRoomsBtn.addEventListener('click', () => {
            requestRoomList();
        });
    }

    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            leaveRoomToLobby();
        });
    }

    // Request initial room list after a short delay
    setTimeout(() => {
        requestRoomList();
    }, 1000);
}

function createRoom(roomName) {
    console.log('Creating room:', roomName || 'auto-generated');
    updateStatus('Creating room...');

    sendSignalingMessage({
        type: 'create-room',
        roomName: roomName
    });
}

function onRoomCreated(roomCode, roomDisplayName) {
    console.log('Room created, automatically entering:', roomCode);

    // Set current room
    currentRoom = roomCode;

    // Hide lobby and show main container
    const lobbyContainer = document.getElementById('lobby-container');
    const mainContainer = document.getElementById('main-container');

    if (lobbyContainer) lobbyContainer.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'block';

    // Update room display
    const roomDisplay = document.getElementById('room-display');
    const leaveRoomBtn = document.getElementById('leave-room');
    if (roomDisplay) roomDisplay.textContent = `Room: ${roomDisplayName || roomCode}`;
    if (leaveRoomBtn) leaveRoomBtn.style.display = 'inline-block';

    // Update status
    updateStatus('Room created! Waiting for someone to join...');

    // Initialize camera after creating room
    initializeAsciiCamera();
}

function joinRoomFromLobby(roomCode, roomDisplayName) {
    if (roomCode) {
        console.log('Attempting to join room:', roomCode);
        currentRoom = roomCode;
        updateStatus('Joining room: ' + (roomDisplayName || roomCode) + '...');

        // Send join room message to signaling server
        sendSignalingMessage({
            type: 'join-room',
            room: roomCode,
            roomDisplayName: roomDisplayName
        });

        // Hide lobby and show main container
        const lobbyContainer = document.getElementById('lobby-container');
        const mainContainer = document.getElementById('main-container');

        if (lobbyContainer) lobbyContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';

        // Update room display
        const roomDisplay = document.getElementById('room-display');
        const leaveRoomBtn = document.getElementById('leave-room');
        if (roomDisplay) roomDisplay.textContent = `Room: ${roomDisplayName || roomCode}`;
        if (leaveRoomBtn) leaveRoomBtn.style.display = 'inline-block';

        // Initialize camera after joining room
        initializeAsciiCamera();
    }
}

function leaveRoomToLobby() {
    if (currentRoom) {
        console.log('Leaving room:', currentRoom);

        // Send leave room message to signaling server
        sendSignalingMessage({
            type: 'leave-room',
            room: currentRoom
        });

        // Close WebRTC connection
        closeConnection();

        // Hide main container and show lobby
        const lobbyContainer = document.getElementById('lobby-container');
        const mainContainer = document.getElementById('main-container');

        if (lobbyContainer) lobbyContainer.style.display = 'block';
        if (mainContainer) mainContainer.style.display = 'none';

        // Clear room display
        const roomDisplay = document.getElementById('room-display');
        const leaveRoomBtn = document.getElementById('leave-room');
        if (roomDisplay) roomDisplay.textContent = '';
        if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';

        // Reset status
        updateStatus('Left room. Back in lobby.');

        // Clear current room
        currentRoom = null;
        webrtcReady = false;

        // Disable chat
        disableChat();

        // Clear remote ASCII
        const remoteAsciiContainer = document.getElementById("remote-ascii");
        if (remoteAsciiContainer) {
            remoteAsciiContainer.innerHTML = "Waiting for remote peer...";
        }

        // Refresh room list
        requestRoomList();
    }
}

function requestRoomList() {
    sendSignalingMessage({
        type: 'get-rooms'
    });
}

function updateRoomsList(rooms) {
    console.log('📋 Updating rooms list:', rooms);
    roomsList = rooms;
    const roomsListContainer = document.getElementById('rooms-list');
    const roomsLoading = document.getElementById('rooms-loading');
    const noRooms = document.getElementById('no-rooms');

    if (!roomsListContainer) {
        console.warn('Rooms list container not found!');
        return;
    }

    // Hide loading state
    if (roomsLoading) roomsLoading.style.display = 'none';

    if (rooms.length === 0) {
        console.log('No rooms available, showing empty state');
        // Show no rooms state
        roomsListContainer.style.display = 'none';
        if (noRooms) noRooms.style.display = 'block';
    } else {
        console.log(`Displaying ${rooms.length} rooms`);
        // Show rooms list
        if (noRooms) noRooms.style.display = 'none';
        roomsListContainer.style.display = 'block';

        // Clear existing rooms
        roomsListContainer.innerHTML = '';

        // Add each room
        rooms.forEach(room => {
            console.log(`Adding room: ${room.displayName} (${room.participants}/${room.maxParticipants})`);
            const roomElement = createRoomElement(room);
            roomsListContainer.appendChild(roomElement);
        });
    }
}

function createRoomElement(room) {
    const roomDiv = document.createElement('div');
    roomDiv.className = 'room-item';

    const roomInfo = document.createElement('div');
    roomInfo.className = 'room-info';

    const roomName = document.createElement('div');
    roomName.className = 'room-name';
    roomName.textContent = room.displayName;

    const roomDetails = document.createElement('div');
    roomDetails.className = 'room-details';
    roomDetails.textContent = `${room.participants}/${room.maxParticipants} participants`;

    const joinBtn = document.createElement('button');
    joinBtn.className = 'room-join-btn';
    joinBtn.textContent = room.isFull ? 'Full' : 'Join';
    joinBtn.disabled = room.isFull;

    if (!room.isFull) {
        joinBtn.addEventListener('click', () => {
            joinRoomFromLobby(room.name, room.displayName);
        });
    }

    roomInfo.appendChild(roomName);
    roomInfo.appendChild(roomDetails);
    roomDiv.appendChild(roomInfo);
    roomDiv.appendChild(joinBtn);

    return roomDiv;
}

// Initialize WebRTC with real-world signaling
initWebRtc({
    onSignalingConnected: () => {
        console.log('Signaling server connected - UI updated');
        updateStatus('Connected to signaling server. Ready to join rooms.');
    },
    onOpen: () => {
        console.log('WebRTC data channel opened!');
        const room = getCurrentRoom() || currentRoom;
        updateStatus('Connected to peer' + (room ? ' in room: ' + room : ''), true);
        enableChat();
        webrtcReady = true;

        // Test the remote ASCII container
        const remoteAsciiContainer = document.getElementById("remote-ascii");
        if (remoteAsciiContainer) {
            remoteAsciiContainer.innerHTML = "WebRTC connected! Waiting for remote ASCII...";
            console.log('Remote ASCII container found and updated');
        } else {
            console.error('Remote ASCII container not found!');
        }
    },
    onMessage: (msg) => {
        // Handle incoming messages - separate ASCII from chat
        console.log('Received WebRTC message (length:', msg.length, ')');
        const result = receiveMessage(msg);
        if (result && result.type === 'ascii') {
            // Display remote peer's ASCII in the remote section
            const lines = result.content.split('\n');
            console.log('Displaying remote ASCII - Lines:', lines.length, 'First line:', lines[0]);
            const remoteAsciiContainer = document.getElementById("remote-ascii");
            if (remoteAsciiContainer) {
                remoteAsciiContainer.innerHTML = result.content;
            } else {
                console.error('Remote ASCII container not found!');
            }
        } else {
            console.log('Message result:', result);
        }
    },
    onError: (err) => {
        console.error('WebRTC Error:', err);
        updateStatus('Connection error: ' + err);
        disableChat();
        webrtcReady = false;
    },
    onClose: () => {
        console.log('WebRTC data channel closed');
        updateStatus('Connection lost. Click "Leave Room" to reconnect.');
        disableChat();
        webrtcReady = false;

        // Show "Waiting for remote peer..." in remote ASCII section
        const remoteAsciiContainer = document.getElementById("remote-ascii");
        if (remoteAsciiContainer) {
            remoteAsciiContainer.innerHTML = "Connection lost. Waiting for reconnection...";
        }
    },
    onConnectionStateChange: (state) => {
        console.log('ICE Connection State:', state);
        
        switch (state) {
            case 'connecting':
                updateStatus('Connecting to peer...');
                break;
            case 'connected':
            case 'completed':
                const room = getCurrentRoom() || currentRoom;
                updateStatus('Connected to peer' + (room ? ' in room: ' + room : ''), true);
                break;
            case 'disconnected':
                updateStatus('Peer disconnected');
                break;
            case 'failed':
                updateStatus('Connection failed');
                break;
            case 'closed':
                updateStatus('Connection closed');
                break;
        }
    }
});

// Initialize lobby on page load
initLobby();

// Make functions available globally for WebRTC callbacks
window.updateRoomsList = updateRoomsList;
window.onRoomCreated = onRoomCreated;

// Handle page unload
window.addEventListener('beforeunload', () => {
    closeConnection();
});
