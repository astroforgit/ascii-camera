# Video to ASCII Conversion Scripts

This directory contains scripts for converting video files to ASCII art and playing them back.

## Files

- `video-to-ascii.js` - Node.js script that converts video files to compressed ASCII art
- `../ascii-video-player.html` - HTML player for viewing ASCII video files

## Prerequisites

Make sure you have installed the dependencies:

```bash
npm install
```

## Usage

### Converting Video to ASCII

Use the `video-to-ascii.js` script to convert any video file to ASCII art:

```bash
# Basic usage
npm run video-to-ascii input.mp4 output.txt

# Or directly with node
node scripts/video-to-ascii.js input.mp4 output.txt

# With custom options
node scripts/video-to-ascii.js input.mp4 output.txt --width 100 --height 75 --fps 15 --contrast 150
```

#### Options

- `--width <number>` - ASCII art width in characters (default: 80)
- `--height <number>` - ASCII art height in characters (default: 60)
- `--fps <number>` - Target frames per second (default: 10)
- `--contrast <number>` - Contrast level 0-255 (default: 128)

#### Examples

```bash
# Convert a video with default settings
node scripts/video-to-ascii.js my-video.mp4 ascii-video.txt

# High resolution ASCII with more frames
node scripts/video-to-ascii.js my-video.mp4 ascii-video.txt --width 120 --height 90 --fps 20

# Low resolution for smaller file size
node scripts/video-to-ascii.js my-video.mp4 ascii-video.txt --width 60 --height 45 --fps 8
```

### Playing ASCII Videos

1. Open `ascii-video-player.html` in your web browser
2. Click "Choose File" and select your ASCII video file (`.txt` file created by the conversion script)
3. Click "Load Video" to decompress and load the video
4. Use the playback controls to play, pause, or navigate through the video

#### Player Features

- **Play/Pause/Stop** - Standard video controls
- **Frame Navigation** - Step through frames manually
- **Speed Control** - Adjust playback speed (0.25x to 2x)
- **Progress Bar** - Visual progress indicator
- **Video Information** - Shows dimensions, frame count, FPS, and duration

## How It Works

### Conversion Process

1. **Frame Extraction** - Uses FFmpeg to extract frames from the input video at the specified resolution and frame rate
2. **ASCII Conversion** - Each frame is processed using Sharp to:
   - Resize to target dimensions
   - Convert to grayscale
   - Apply contrast adjustment
   - Map pixel brightness to ASCII characters: ` .,:;i1tfLCG08@`
3. **Compression** - The entire ASCII video is compressed using LZ-string algorithm
4. **Output** - Saves the compressed data to a text file

### Player Process

1. **File Loading** - Reads the compressed ASCII video file
2. **Decompression** - Uses LZ-string to decompress the video data
3. **Playback** - Displays frames sequentially at the specified frame rate
4. **Controls** - Provides standard video player controls for navigation

## File Format

The output files contain JSON data compressed with LZ-string:

```json
{
  "frames": ["frame1_ascii", "frame2_ascii", ...],
  "fps": 10,
  "width": 80,
  "height": 60,
  "totalFrames": 150,
  "metadata": {
    "originalVideo": "input.mp4",
    "processedAt": "2025-08-03T23:00:00.000Z",
    "compression": "lz-string"
  }
}
```

## Tips

- **File Size**: Lower resolution and FPS result in smaller files
- **Quality**: Higher contrast values can improve ASCII art visibility
- **Performance**: The conversion process can be CPU intensive for long videos
- **Compatibility**: The player works in modern web browsers with ES6 module support

## Troubleshooting

- **FFmpeg not found**: Make sure FFmpeg is installed or the script will use the bundled ffmpeg-static
- **Large files**: Very long or high-resolution videos may take significant time to process
- **Memory usage**: Processing large videos may require substantial RAM
- **Browser compatibility**: The player requires a modern browser with ES6 module support
