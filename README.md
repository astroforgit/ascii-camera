# ASCII Camera WebRTC

Real-time ASCII art rendering of your webcam with WebRTC communication and compression.

![Screenshot](images/screenshot.png)

## 🚀 Quick Start

### Option 1: Real WebRTC (Two Browsers)
```bash
# Install dependencies and start both signaling server + client
npm run client

# Or run them separately:
npm run server  # Starts signaling server on port 8080
npm run dev     # Starts Vite dev server on port 5173
```

Then open `http://localhost:5173` in **two different browsers** and use the same room code to connect!

### Option 2: Local Demo (Single Browser)
```bash
npm run dev
```
Open `http://localhost:5173` and choose "Local Demo" to test in a single browser.

## 📋 Available Scripts

- **`npm run client`** - Start both signaling server and Vite dev server (recommended)
- **`npm run server`** - Start only the WebRTC signaling server
- **`npm run dev`** - Start only the Vite development server
- **`npm run start`** - Alias for `npm run client`
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build
- **`npm run video-to-ascii`** - Convert video files to ASCII art (see scripts/README.md)

## 🌟 Features

### Real-time ASCII Art
- Webcam feed converted to ASCII characters
- Adjustable contrast and frame rate
- Mirror mode support

### WebRTC Communication
- **Real WebRTC**: Connect two different browsers/computers
- **Local Demo**: Test WebRTC features in single browser
- Room-based connections with shareable codes

### Advanced Compression
- Custom ASCII compression algorithm
- 60-80% data size reduction

### Video to ASCII Conversion
- Convert any video file to ASCII art
- Customizable resolution, frame rate, and contrast
- Compressed output for efficient storage
- Standalone HTML player for playback
- Real-time compression statistics
- Optimized for WebRTC transmission

### Chat System
- Real-time text messaging
- Separate ASCII and chat displays
- Message timestamps
- Connection status indicators

## 🏗️ Architecture

### Real-World Setup
```
Browser A ←→ Signaling Server ←→ Browser B
    ↓              ↓              ↓
WebRTC Data Channel (direct P2P connection)
```

### Message Types
```javascript
// Chat message
{ type: 'chat', content: 'Hello!', timestamp: '...', sender: 'user' }

// ASCII art (compressed)
{ type: 'ascii', content: '8 8.8 ', compressed: true, originalSize: 1024 }
```

## 🎬 Video to ASCII Conversion

Convert any video file to ASCII art and play it back in your browser!

### Quick Start

```bash
# Convert a video file
npm run video-to-ascii input.mp4 output.txt

# With custom settings
node scripts/video-to-ascii.js input.mp4 output.txt --width 100 --height 75 --fps 15
```

Then open `ascii-video-player.html` in your browser to play the converted video.

### Features
- **Any Video Format**: Supports all formats that FFmpeg can process
- **Customizable Output**: Adjust resolution, frame rate, and contrast
- **Efficient Compression**: Uses LZ-string for optimal file sizes
- **Browser Player**: Standalone HTML player with full controls
- **Responsive Design**: Works on desktop and mobile

For detailed documentation, see [scripts/README.md](scripts/README.md).

## 🔧 How It Works

### Real-time Camera
1. **Camera Access**: Uses `getUserMedia` API to access webcam
2. **ASCII Conversion**: Canvas image data converted to ASCII based on pixel brightness
3. **Compression**: Custom RLE + character mapping algorithm compresses ASCII data
4. **WebRTC**: Direct peer-to-peer transmission via data channels
5. **Signaling**: WebSocket server coordinates initial connection setup

### Video Conversion
1. **Frame Extraction**: FFmpeg extracts frames at specified resolution/FPS
2. **Image Processing**: Sharp library processes each frame to grayscale
3. **ASCII Mapping**: Pixel brightness mapped to ASCII characters: ` .,:;i1tfLCG08@`
4. **Compression**: LZ-string compresses the entire ASCII video data
5. **Playback**: HTML player decompresses and displays frames sequentially

## 🌐 Browser Support

Works on browsers supporting `getUserMedia` and WebRTC APIs:
- Chrome 21+
- Firefox 17+
- Safari 11+
- Edge 79+

## 📁 Project Structure

```
├── script/
│   ├── app.js              # Local demo version
│   ├── app-real.js         # Real WebRTC version
│   ├── webrtc.js           # Local WebRTC loopback
│   ├── webrtc-real.js      # Real WebRTC with signaling
│   ├── compression.js      # ASCII compression algorithm
│   ├── chat.js             # Chat functionality
│   ├── camera.js           # Camera access and processing
│   └── ascii.js            # ASCII conversion logic
├── scripts/
│   ├── video-to-ascii.js   # Video to ASCII conversion script
│   └── README.md           # Video conversion documentation
├── signaling-server.js     # WebSocket signaling server
├── index.html              # Version selector page
├── index-real.html         # Real WebRTC interface
├── ascii-video-player.html # ASCII video player
└── package.json            # Dependencies and scripts
```

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT
