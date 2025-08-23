// Simple WebSocket signaling server for WebRTC
// Run with: node signaling-server.js

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = 8080;

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store rooms and their participants
const rooms = new Map();

// Shutdown flag to prevent multiple shutdown attempts
let isShuttingDown = false;

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.currentRoom = null;
    ws.id = generateId();

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (error) {
            console.error('Invalid message format:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Client ${ws.id} disconnected (code: ${code})`);
        if (ws.currentRoom) {
            leaveRoom(ws, ws.currentRoom);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${ws.id}:`, error);
        if (ws.currentRoom) {
            leaveRoom(ws, ws.currentRoom);
        }
    });
});

function handleMessage(ws, message) {
    console.log('Received message:', message.type);

    switch (message.type) {
        case 'join-room':
            joinRoom(ws, message.room, message.roomDisplayName);
            break;

        case 'create-room':
            createRoom(ws, message.roomName);
            break;

        case 'get-rooms':
            sendRoomList(ws);
            break;

        case 'leave-room':
            if (ws.currentRoom) {
                leaveRoom(ws, ws.currentRoom);
            }
            break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
            // Forward signaling messages to other participants in the room
            forwardToRoom(ws, message);
            break;

        default:
            console.log('Unknown message type:', message.type);
    }
}

function joinRoom(ws, roomName, roomDisplayName) {
    // Leave current room if any
    if (ws.currentRoom) {
        leaveRoom(ws, ws.currentRoom);
    }

    // Create room if it doesn't exist
    if (!rooms.has(roomName)) {
        rooms.set(roomName, {
            participants: new Set(),
            displayName: roomDisplayName || roomName,
            createdAt: new Date(),
            maxParticipants: 2
        });
    }

    const room = rooms.get(roomName);
    const participants = room.participants || room; // Handle both old and new structure

    console.log(`Before join - Room ${roomName} has ${participants.size} participants`);
    console.log(`Client ${ws.id} attempting to join room ${roomName}`);

    // Check if room is full (limit to 2 participants for simplicity)
    if (participants.size >= 2) {
        console.log(`Room ${roomName} is full (${participants.size}/2), rejecting client ${ws.id}`);
        ws.send(JSON.stringify({
            type: 'room-full',
            room: roomName
        }));
        return;
    }

    // Add client to room
    participants.add(ws);
    ws.currentRoom = roomName;

    console.log(`Client ${ws.id} joined room: ${roomName} (${participants.size}/2)`);

    // Notify client they joined
    ws.send(JSON.stringify({
        type: 'room-joined',
        room: roomName,
        displayName: room.displayName || roomName,
        participants: participants.size,
        maxParticipants: 2
    }));

    // Broadcast room list update
    broadcastRoomList();

    // If this is the second participant, initiate WebRTC connection
    if (participants.size === 2) {
        const participantArray = Array.from(participants);
        const [client1, client2] = participantArray;

        // Tell first client to create offer
        client1.send(JSON.stringify({
            type: 'initiate-call',
            role: 'caller'
        }));

        // Tell second client to wait for offer
        client2.send(JSON.stringify({
            type: 'initiate-call',
            role: 'callee'
        }));
    }
}

function leaveRoom(ws, roomName) {
    const room = rooms.get(roomName);
    if (room) {
        const participants = room.participants || room;
        const beforeCount = participants.size;
        participants.delete(ws);
        const afterCount = participants.size;

        console.log(`Client ${ws.id} left room: ${roomName} (${beforeCount} -> ${afterCount} participants)`);

        // Notify other participants
        participants.forEach(client => {
            client.send(JSON.stringify({
                type: 'user-left',
                room: roomName
            }));
        });

        // Remove empty rooms
        if (participants.size === 0) {
            rooms.delete(roomName);
            console.log(`Room ${roomName} deleted (empty)`);
        } else {
            console.log(`Room ${roomName} now has ${participants.size} participants`);
        }

        // Broadcast room list update
        console.log('Broadcasting room list update after leave...');
        broadcastRoomList();
    }
    ws.currentRoom = null;
}

function forwardToRoom(ws, message) {
    if (!ws.currentRoom) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Not in a room'
        }));
        return;
    }

    const room = rooms.get(ws.currentRoom);
    if (room) {
        const participants = room.participants || room; // Handle both old and new structure
        // Forward message to all other participants in the room
        participants.forEach(client => {
            if (client !== ws && client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

function createRoom(ws, roomName) {
    // Generate room name if not provided
    if (!roomName || roomName.trim() === '') {
        roomName = generateRoomName();
    }

    // Clean room name
    roomName = roomName.trim().substring(0, 30);

    // Check if room already exists
    if (rooms.has(roomName)) {
        ws.send(JSON.stringify({
            type: 'room-exists',
            room: roomName
        }));
        return;
    }

    // Create the room
    rooms.set(roomName, {
        participants: new Set(),
        displayName: roomName,
        createdAt: new Date(),
        maxParticipants: 2,
        creator: ws.id
    });

    console.log(`Room created: ${roomName} by client ${ws.id}`);

    // Send room created confirmation first
    ws.send(JSON.stringify({
        type: 'room-created',
        room: roomName,
        displayName: roomName
    }));

    // Join the creator to the room
    joinRoom(ws, roomName, roomName);
}

function sendRoomList(ws) {
    const roomList = Array.from(rooms.entries()).map(([roomName, room]) => ({
        name: roomName,
        displayName: room.displayName || roomName,
        participants: room.participants ? room.participants.size : room.size,
        maxParticipants: room.maxParticipants || 2,
        createdAt: room.createdAt || new Date(),
        isFull: (room.participants ? room.participants.size : room.size) >= (room.maxParticipants || 2)
    }));

    ws.send(JSON.stringify({
        type: 'room-list',
        rooms: roomList
    }));
}

function broadcastRoomList() {
    const roomList = Array.from(rooms.entries()).map(([roomName, room]) => {
        const participantCount = room.participants ? room.participants.size : room.size;
        const maxParticipants = room.maxParticipants || 2;
        const isFull = participantCount >= maxParticipants;

        console.log(`Room ${roomName}: ${participantCount}/${maxParticipants} participants, isFull: ${isFull}`);

        return {
            name: roomName,
            displayName: room.displayName || roomName,
            participants: participantCount,
            maxParticipants: maxParticipants,
            createdAt: room.createdAt || new Date(),
            isFull: isFull
        };
    });

    // Send to all connected clients
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
                type: 'room-list',
                rooms: roomList
            }));
        }
    });
}

function generateRoomName() {
    const adjectives = ['Cool', 'Fun', 'Epic', 'Wild', 'Crazy', 'Super', 'Mega', 'Ultra'];
    const nouns = ['Camera', 'Studio', 'Room', 'Space', 'Zone', 'Hub', 'Lab', 'Spot'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
    console.log('');
    console.log('To test with two browsers:');
    console.log('1. Open http://localhost:5173 in two different browser tabs/windows');
    console.log('2. Both will automatically join the same room');
    console.log('3. Start the camera in one browser to see it in the other');
});

// Graceful shutdown function
function gracefulShutdown(signal) {
    if (isShuttingDown) {
        console.log('Shutdown already in progress...');
        return;
    }

    isShuttingDown = true;
    console.log(`\nReceived ${signal}. Shutting down signaling server...`);

    // Close all WebSocket connections first
    console.log(`Closing ${wss.clients.size} WebSocket connections...`);
    wss.clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            ws.close(1000, 'Server shutting down');
        }
    });

    // Close WebSocket server
    wss.close((err) => {
        if (err) {
            console.error('Error closing WebSocket server:', err);
        } else {
            console.log('WebSocket server closed');
        }

        // Close HTTP server
        server.close((err) => {
            if (err) {
                console.error('Error closing HTTP server:', err);
                process.exit(1);
            } else {
                console.log('HTTP server closed');
                process.exit(0);
            }
        });
    });

    // Force exit after 2 seconds if graceful shutdown fails
    setTimeout(() => {
        console.log('Force closing server (timeout)...');
        process.exit(1);
    }, 2000);
}

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Export for potential use as module
export { wss, rooms };
