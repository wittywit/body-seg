# Video Background Replacement App

A real-time video background replacement application that uses AI-powered segmentation to change your webcam background without requiring a green screen. Similar to Zoom's virtual background feature.

## Features

- **Real-time background segmentation** using TensorFlow.js and MediaPipe
- **No green screen required** - uses AI to detect person boundaries
- **Custom background images** - upload and use any image as your background
- **Background removal** - remove background completely for transparent effect
- **Real-time processing** - smooth 30+ FPS performance
- **Browser-based** - no installation required, runs entirely in your browser
- **Privacy-focused** - all processing happens locally, no data sent to servers

## How to Use

1. **Open the app**: Open `index.html` in a modern web browser
2. **Wait for model loading**: The AI model will load automatically (takes a few seconds)
3. **Start camera**: Click "Start Camera" and allow webcam access
4. **Choose background** (optional): Click "Choose Background Image" to upload a custom background
5. **Apply effects**:
   - Click "Remove Background Only" to make background transparent
   - Click "Replace Background" to use your uploaded image as background

## Technical Details

### Technology Stack
- **TensorFlow.js** - Machine learning framework
- **MediaPipe Selfie Segmentation** - AI model for person detection
- **WebRTC** - Webcam access
- **HTML5 Canvas** - Real-time video processing
- **Vanilla JavaScript** - No additional frameworks required

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- Minimum 3GB RAM recommended
- GPU acceleration (WebGL) for best performance

### Performance
- **Model size**: ~400KB download
- **Frame rate**: 30-60 FPS on modern devices
- **Latency**: Real-time processing with minimal delay
- **Compatibility**: Works on desktop, tablets, and mobile devices

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+

## Privacy & Security

- All video processing happens locally in your browser
- No video data is sent to external servers
- No user data is stored or transmitted
- Webcam access is only used for real-time processing

## Troubleshooting

### Common Issues

**Camera not starting:**
- Check browser permissions for webcam access
- Ensure no other applications are using the camera
- Try refreshing the page

**Poor performance:**
- Close other browser tabs and applications
- Ensure your device meets minimum requirements
- Try using Chrome for best performance

**Model loading fails:**
- Check internet connection for initial model download
- Clear browser cache and reload
- Ensure JavaScript is enabled

**Background replacement not working:**
- Ensure you've uploaded a background image
- Check that the image format is supported (JPG, PNG, etc.)
- Try a smaller image size if performance is poor

## Development

To modify or extend the application:

1. **HTML Structure**: `index.html` contains the UI layout
2. **Core Logic**: `app.js` contains the main application logic
3. **AI Integration**: Background segmentation is handled in the `processVideo()` method
4. **Background Effects**: Image replacement logic is in `applyBackgroundEffect()`

### Key Classes and Methods

- `VideoBackgroundReplacer` - Main application class
- `initializeModel()` - Loads the TensorFlow.js segmentation model
- `processVideo()` - Main video processing loop
- `applyBackgroundEffect()` - Applies segmentation mask and background replacement

## License

This project is open source. Feel free to modify and distribute.