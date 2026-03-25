/**
 * OCRScanner — Upload or capture image, extract text with Tesseract.js,
 * then read aloud for blind users
 */

const OCRScanner = (() => {
  let isProcessing = false;

  const init = () => {
    const fileInput = document.getElementById('ocr-file-input');
    const cameraBtn = document.getElementById('ocr-camera-btn');
    const uploadBtn = document.getElementById('ocr-upload-btn');

    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    if (cameraBtn) cameraBtn.addEventListener('click', openCamera);
    if (uploadBtn) uploadBtn.addEventListener('click', () => fileInput?.click());
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await processImage(file);
  };

  const processImage = async (file) => {
    if (isProcessing) return;
    isProcessing = true;

    const { canSee, canHear } = CapabilityStore.get();

    // Show preview
    const preview = document.getElementById('ocr-preview');
    if (preview && canSee) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    }

    // Update status
    setStatus('🔍 Reading image... please wait', 'loading');
    if (canHear) VoiceAssistant.speak('Processing image. Please wait.');

    try {
      // Use Tesseract.js for OCR (loaded via CDN in HTML)
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js not loaded. Check your internet connection.');
      }

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            setStatus(`🔍 Recognizing text... ${pct}%`, 'loading');
          }
        }
      });

      const text = result.data.text.trim();

      if (!text) {
        setStatus('⚠️ No text found in image', 'warning');
        if (canHear) VoiceAssistant.speak('No text was found in the image.');
        return;
      }

      displayResult(text);

      // Read aloud for blind users
      if (canHear) {
        VoiceAssistant.speak(`Text found: ${text}`);
      }

      // Also upload to server for logging
      uploadToServer(file);

    } catch (err) {
      console.error('OCR error:', err);
      setStatus(`❌ Error: ${err.message}`, 'error');
      if (canHear) VoiceAssistant.speak('Sorry, could not read the image.');
    } finally {
      isProcessing = false;
    }
  };

  const displayResult = (text) => {
    const output = document.getElementById('ocr-output');
    const copyBtn = document.getElementById('ocr-copy-btn');
    const speakBtn = document.getElementById('ocr-speak-btn');

    if (output) {
      output.textContent = text;
      output.style.display = 'block';
    }

    if (copyBtn) {
      copyBtn.style.display = 'inline-flex';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(text);
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy Text'; }, 2000);
      };
    }

    if (speakBtn) {
      speakBtn.style.display = 'inline-flex';
      speakBtn.onclick = () => VoiceAssistant.speak(text);
    }

    setStatus('✅ Text extracted successfully', 'success');
  };

  const uploadToServer = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      await fetch('/api/ocr', { method: 'POST', body: formData });
    } catch (e) {
      // Non-critical, just logging
    }
  };

  const openCamera = async () => {
    const video = document.getElementById('ocr-video');
    const captureBtn = document.getElementById('ocr-capture-btn');

    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      video.style.display = 'block';
      video.play();

      if (captureBtn) {
        captureBtn.style.display = 'block';
        captureBtn.onclick = () => captureFrame(video, stream);
      }
    } catch (err) {
      setStatus('❌ Camera access denied', 'error');
    }
  };

  const captureFrame = (video, stream) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Stop camera stream
    stream.getTracks().forEach(t => t.stop());
    video.style.display = 'none';

    canvas.toBlob(blob => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      processImage(file);
    }, 'image/jpeg', 0.95);
  };

  const setStatus = (message, type = 'info') => {
    const status = document.getElementById('ocr-status');
    if (!status) return;
    status.textContent = message;
    status.className = `ocr-status ocr-status--${type}`;
    status.style.display = 'block';
  };

  return { init, processImage };
})();

window.OCRScanner = OCRScanner;
