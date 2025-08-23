// Chat functionality using WebRTC data channel
import { compressAscii, decompressAscii, getCompressionStats } from './compression.js';

let chatContainer;
let chatInput;
let sendButton;
let sendMessageCallback;
let compressionStats = { totalOriginal: 0, totalCompressed: 0, messageCount: 0 };

export function initChat(options = {}) {
    chatContainer = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendButton = document.getElementById('send-button');
    
    sendMessageCallback = options.onSendMessage || (() => {});
    
    // Set up event listeners
    sendButton.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Initially disable send button until WebRTC is ready
    sendButton.disabled = true;
}

export function enableChat() {
    sendButton.disabled = false;
    addSystemMessage('Chat is ready! You can now send messages.');
    addSystemMessage('ASCII compression is enabled for better performance.');
}

export function disableChat() {
    sendButton.disabled = true;
    addSystemMessage('Chat disconnected.');
}

function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message && sendMessageCallback) {
        // Create message object
        const messageObj = {
            type: 'chat',
            content: message,
            timestamp: new Date().toISOString(),
            sender: 'user'
        };
        
        // Send through WebRTC
        sendMessageCallback(JSON.stringify(messageObj));
        
        // Display in chat
        displayMessage(messageObj, true);
        
        // Clear input
        chatInput.value = '';
    }
}

export function receiveMessage(messageData) {
    try {
        const messageObj = JSON.parse(messageData);

        if (messageObj.type === 'chat') {
            displayMessage(messageObj, false);
        } else if (messageObj.type === 'ascii') {
            // Handle ASCII content (compressed or uncompressed)
            const content = messageObj.compressed ?
                decompressAscii(messageObj.content) : messageObj.content;

            console.log('Received ASCII message, compressed:', messageObj.compressed, 'length:', content.length);

            return { type: 'ascii', content: content };
        }
    } catch (e) {
        // If it's not JSON, treat as plain text (for backward compatibility)
        if (typeof messageData === 'string' && messageData.includes('\n') && messageData.length > 100) {
            // Likely ASCII art - return for ASCII display
            return { type: 'ascii', content: messageData };
        } else {
            // Treat as plain chat message
            const messageObj = {
                type: 'chat',
                content: messageData,
                timestamp: new Date().toISOString(),
                sender: 'peer'
            };
            displayMessage(messageObj, false);
        }
    }
    return null;
}

function displayMessage(messageObj, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = messageObj.content;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'timestamp';
    timestampDiv.textContent = formatTimestamp(messageObj.timestamp);
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}



function addSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system';
    messageDiv.style.background = '#fff3cd';
    messageDiv.style.color = '#856404';
    messageDiv.style.border = '1px solid #ffeaa7';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.fontStyle = 'italic';
    messageDiv.style.margin = '10px auto';
    
    messageDiv.textContent = message;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Export function to send ASCII art as a message with LZ-string compression
export function sendAsciiMessage(asciiContent) {
    if (sendMessageCallback) {
        // Compress the ASCII content using LZ-string
        const compressedContent = compressAscii(asciiContent);
        const stats = getCompressionStats(asciiContent, compressedContent);

        // Update our running stats
        updateCompressionStats(asciiContent.length, compressedContent.length);

        const messageObj = {
            type: 'ascii',
            content: compressedContent,
            compressed: true,
            originalSize: asciiContent.length,
            timestamp: new Date().toISOString(),
            sender: 'user'
        };

        sendMessageCallback(JSON.stringify(messageObj));

        // Log compression stats occasionally
        if (compressionStats.messageCount % 30 === 0) {
            logCompressionStats();
        }
    }
}

function updateCompressionStats(originalSize, compressedSize) {
    compressionStats.totalOriginal += originalSize;
    compressionStats.totalCompressed += compressedSize;
    compressionStats.messageCount++;
}

function logCompressionStats() {
    const totalSavings = compressionStats.totalOriginal - compressionStats.totalCompressed;
    const savingsPercent = compressionStats.totalOriginal > 0 ?
        ((totalSavings / compressionStats.totalOriginal) * 100) : 0;

    console.log(`📊 Compression Stats (${compressionStats.messageCount} messages):`);
    console.log(`   Original: ${compressionStats.totalOriginal} bytes`);
    console.log(`   Compressed: ${compressionStats.totalCompressed} bytes`);
    console.log(`   Savings: ${totalSavings} bytes (${savingsPercent.toFixed(1)}%)`);

    addSystemMessage(`Compression: ${savingsPercent.toFixed(1)}% data savings over ${compressionStats.messageCount} frames`);
}
