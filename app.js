class PhotoBoothApp {
    constructor() {
        this.webcam = document.getElementById('webcam');
        this.outputCanvas = document.getElementById('output');
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.status = document.getElementById('status');

        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.captureFeedback = document.getElementById('captureFeedback');

        this.segmenter = null;
        this.currentBackground = null;
        this.backgroundMode = 'original'; // 'original', 'remove', 'replace'
        this.isProcessing = false;
        this.animationId = null;
        this.stream = null;

        this.setupEventListeners();
        this.initializeModel();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());

        // Background selection
        document.querySelectorAll('.background-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectBackground(e.target.closest('.background-option')));
        });

        // Select original by default
        document.querySelector('.background-option.original').click();
    }

    async initializeModel() {
        try {
            this.updateStatus('Loading AI model...', 'loading');

            await tf.ready();

            const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
            const segmenterConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747',
                modelType: 'general'
            };

            this.segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
            this.updateStatus('AI model loaded! Click "Start Camera" to begin.', 'ready');

        } catch (error) {
            console.error('Error initializing model:', error);
            this.updateStatus('Error loading AI model. Please refresh the page.', 'error');
        }
    }

    async startCamera() {
        try {
            this.updateStatus('Starting camera...', 'loading');

            let constraints = {
                video: {
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.webcam.srcObject = this.stream;

            await new Promise((resolve) => {
                this.webcam.onloadedmetadata = () => {
                    console.log('Video metadata loaded');
                    resolve();
                };
            });

            // Ensure video is playing
            await this.webcam.play();

            // Set canvas to actual video resolution
            this.outputCanvas.width = this.webcam.videoWidth;
            this.outputCanvas.height = this.webcam.videoHeight;

            console.log(`Video resolution: ${this.webcam.videoWidth}x${this.webcam.videoHeight}`);
            console.log(`Canvas size: ${this.outputCanvas.width}x${this.outputCanvas.height}`);

            this.startBtn.style.display = 'none';
            this.captureBtn.disabled = false;
            this.stopBtn.disabled = false;

            this.updateStatus('Ready! Select a background and click the camera button.', 'ready');

            // Start video processing immediately
            this.processVideo();

        } catch (error) {
            console.error('Error starting camera:', error);
            this.updateStatus('Error accessing camera. Please check permissions.', 'error');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.webcam.srcObject = null;
        this.outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);

        this.startBtn.style.display = 'block';
        this.captureBtn.disabled = true;
        this.stopBtn.disabled = true;

        this.updateStatus('Camera stopped.', 'ready');
    }

    async processVideo() {
        if (!this.webcam.videoWidth || !this.webcam.videoHeight) {
            this.animationId = requestAnimationFrame(() => this.processVideo());
            return;
        }

        try {
            if (this.backgroundMode === 'original' || !this.segmenter) {
                // Just show original video
                this.outputCtx.drawImage(this.webcam, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
            } else {
                // Process with AI segmentation
                const segmentations = await this.segmenter.segmentPeople(this.webcam);
                if (segmentations.length > 0) {
                    await this.applyBackgroundEffect(segmentations[0]);
                } else {
                    // Fallback to original video if no segmentation
                    this.outputCtx.drawImage(this.webcam, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
                }
            }

        } catch (error) {
            console.error('Error processing video:', error);
            // Fallback to original video on error
            this.outputCtx.drawImage(this.webcam, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        }

        this.animationId = requestAnimationFrame(() => this.processVideo());
    }

    async applyBackgroundEffect(segmentation) {
        const { width, height } = this.outputCanvas;

        this.outputCtx.clearRect(0, 0, width, height);

        // Draw background first if replacing
        if (this.backgroundMode === 'replace' && this.currentBackground) {
            this.outputCtx.drawImage(this.currentBackground, 0, 0, width, height);
        }

        const maskImageData = await segmentation.mask.toImageData();
        let maskData = maskImageData.data;

        // Apply edge smoothing to mask
        maskData = this.smoothMaskEdges(maskData, width, height);

        // Get video frame data
        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = width;
        videoCanvas.height = height;
        const videoCtx = videoCanvas.getContext('2d');
        videoCtx.drawImage(this.webcam, 0, 0, width, height);
        const videoImageData = videoCtx.getImageData(0, 0, width, height);
        const videoData = videoImageData.data;

        // Create output image data
        const outputImageData = this.outputCtx.createImageData(width, height);
        const outputData = outputImageData.data;

        // Get background data if replacing
        let backgroundData = null;
        if (this.backgroundMode === 'replace' && this.currentBackground) {
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = width;
            bgCanvas.height = height;
            const bgCtx = bgCanvas.getContext('2d');
            bgCtx.drawImage(this.currentBackground, 0, 0, width, height);
            backgroundData = bgCtx.getImageData(0, 0, width, height).data;
        }

        // Apply segmentation mask with improved blending
        for (let i = 0; i < maskData.length; i += 4) {
            const pixelIndex = i;
            const maskValue = maskData[i + 3] / 255; // Alpha channel for person probability

            // Use soft blending instead of hard threshold
            const personAlpha = this.smoothStep(maskValue, 0.3, 0.7);

            if (personAlpha > 0) {
                // Blend person pixels
                const invAlpha = 1 - personAlpha;

                if (this.backgroundMode === 'remove') {
                    // Transparent background with soft edges
                    outputData[pixelIndex] = videoData[pixelIndex];
                    outputData[pixelIndex + 1] = videoData[pixelIndex + 1];
                    outputData[pixelIndex + 2] = videoData[pixelIndex + 2];
                    outputData[pixelIndex + 3] = Math.round(255 * personAlpha);
                } else if (this.backgroundMode === 'replace' && backgroundData) {
                    // Blend person with background
                    outputData[pixelIndex] = Math.round(
                        videoData[pixelIndex] * personAlpha + backgroundData[pixelIndex] * invAlpha
                    );
                    outputData[pixelIndex + 1] = Math.round(
                        videoData[pixelIndex + 1] * personAlpha + backgroundData[pixelIndex + 1] * invAlpha
                    );
                    outputData[pixelIndex + 2] = Math.round(
                        videoData[pixelIndex + 2] * personAlpha + backgroundData[pixelIndex + 2] * invAlpha
                    );
                    outputData[pixelIndex + 3] = 255;
                } else {
                    // Fallback
                    outputData[pixelIndex] = videoData[pixelIndex];
                    outputData[pixelIndex + 1] = videoData[pixelIndex + 1];
                    outputData[pixelIndex + 2] = videoData[pixelIndex + 2];
                    outputData[pixelIndex + 3] = Math.round(255 * personAlpha);
                }
            } else {
                // Pure background
                if (this.backgroundMode === 'remove') {
                    outputData[pixelIndex] = 0;
                    outputData[pixelIndex + 1] = 0;
                    outputData[pixelIndex + 2] = 0;
                    outputData[pixelIndex + 3] = 0;
                } else if (this.backgroundMode === 'replace' && backgroundData) {
                    outputData[pixelIndex] = backgroundData[pixelIndex];
                    outputData[pixelIndex + 1] = backgroundData[pixelIndex + 1];
                    outputData[pixelIndex + 2] = backgroundData[pixelIndex + 2];
                    outputData[pixelIndex + 3] = 255;
                } else {
                    outputData[pixelIndex] = 0;
                    outputData[pixelIndex + 1] = 0;
                    outputData[pixelIndex + 2] = 0;
                    outputData[pixelIndex + 3] = 255;
                }
            }
        }

        this.outputCtx.putImageData(outputImageData, 0, 0);
    }

    selectBackground(option) {
        // Remove selection from all options
        document.querySelectorAll('.background-option').forEach(opt => opt.classList.remove('selected'));

        // Add selection to clicked option
        option.classList.add('selected');

        const bgPath = option.dataset.bg;
        const bgType = option.dataset.type;

        if (bgType === 'original') {
            this.backgroundMode = 'original';
            this.currentBackground = null;
        } else if (bgType === 'remove') {
            this.backgroundMode = 'remove';
            this.currentBackground = null;
        } else if (bgPath) {
            this.backgroundMode = 'replace';
            this.loadBackgroundImage(bgPath);
        }

        console.log(`Background mode: ${this.backgroundMode}`);
    }

    loadBackgroundImage(imagePath) {
        const img = new Image();
        img.onload = () => {
            this.currentBackground = img;
            console.log(`Background loaded: ${imagePath}`);
        };
        img.onerror = () => {
            console.error(`Failed to load background: ${imagePath}`);
            this.backgroundMode = 'original';
        };
        img.src = imagePath;
    }

    capturePhoto() {
        try {
            // Create a high-quality canvas for the photo
            const photoCanvas = document.createElement('canvas');
            const photoCtx = photoCanvas.getContext('2d');

            photoCanvas.width = this.outputCanvas.width;
            photoCanvas.height = this.outputCanvas.height;

            // Copy current output to photo canvas
            photoCtx.drawImage(this.outputCanvas, 0, 0);

            // Generate filename with timestamp
            const currentDate = new Date();
            const timestamp = currentDate.toISOString().replace(/[:.]/g, '-').slice(0, -5);

            let filename = `photo-booth-${timestamp}`;
            if (this.backgroundMode === 'remove') {
                filename = `no-background-${timestamp}`;
            } else if (this.backgroundMode === 'replace') {
                filename = `custom-background-${timestamp}`;
            }

            // Convert to blob and download
            photoCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);

                this.showCaptureFeedback();

            }, 'image/png', 0.95);

        } catch (error) {
            console.error('Error capturing photo:', error);
        }
    }

    smoothMaskEdges(maskData, width, height) {
        // Create a copy of the mask data
        const smoothedMask = new Uint8ClampedArray(maskData);

        // Apply Gaussian blur to smooth edges
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const centerIndex = (y * width + x) * 4 + 3; // Alpha channel
                let sum = 0;

                // Apply kernel
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + 3;
                        sum += maskData[pixelIndex] * kernel[ky + 1][kx + 1];
                    }
                }

                smoothedMask[centerIndex] = Math.round(sum / kernelSum);
            }
        }

        return smoothedMask;
    }

    smoothStep(value, min, max) {
        // Smooth transition function for better edge blending
        if (value <= min) return 0;
        if (value >= max) return 1;

        const t = (value - min) / (max - min);
        return t * t * (3 - 2 * t); // Smoothstep function
    }

    showCaptureFeedback() {
        this.captureFeedback.classList.add('show');
        setTimeout(() => {
            this.captureFeedback.classList.remove('show');
        }, 2000);
    }

    updateStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status-indicator ${type}`;
    }
}

// Initialize the photo booth app
window.addEventListener('DOMContentLoaded', () => {
    new PhotoBoothApp();
});