/**
 * ObjectDetector — Real-time obstacle detection using TensorFlow.js COCO-SSD
 * Triggers vibration alerts for blind/deaf-blind users
 */

const ObjectDetector = (() => {
  let model = null;
  let isRunning = false;
  let videoEl = null;
  let canvasEl = null;
  let animFrameId = null;
  let lastAlertTime = 0;
  const ALERT_COOLDOWN = 2000;

  // Objects considered obstacles
  const OBSTACLE_CLASSES = new Set([
    'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck',
    'chair', 'couch', 'potted plant', 'dining table', 'dog', 'cat',
    'backpack', 'suitcase', 'umbrella', 'handbag', 'bench'
  ]);

  const load = async () => {
    if (typeof tf === 'undefined' || typeof cocoSsd === 'undefined') {
      console.warn('TensorFlow.js or COCO-SSD not loaded');
      return false;
    }
    try {
      console.log('Loading COCO-SSD model...');
      model = await cocoSsd.load();
      console.log('✅ COCO-SSD model loaded');
      return true;
    } catch (err) {
      console.error('Model load error:', err);
      return false;
    }
  };

  const start = async (videoId, canvasId) => {
    videoEl = document.getElementById(videoId);
    canvasEl = document.getElementById(canvasId);
    if (!videoEl || !canvasEl) return;

    if (!model) {
      const loaded = await load();
      if (!loaded) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      videoEl.srcObject = stream;
      videoEl.play();
      isRunning = true;
      detectLoop();
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const detectLoop = async () => {
    if (!isRunning || !model || !videoEl) return;

    if (videoEl.readyState === 4) {
      const predictions = await model.detect(videoEl);
      drawPredictions(predictions);
      analyzeObstacles(predictions);
    }

    animFrameId = requestAnimationFrame(detectLoop);
  };

  const drawPredictions = (predictions) => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(videoEl, 0, 0);

    predictions.forEach(pred => {
      const isObstacle = OBSTACLE_CLASSES.has(pred.class);
      ctx.strokeStyle = isObstacle ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(...pred.bbox);

      ctx.fillStyle = isObstacle ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(
        `${pred.class} ${Math.round(pred.score * 100)}%`,
        pred.bbox[0], pred.bbox[1] > 15 ? pred.bbox[1] - 5 : 15
      );
    });
  };

  const analyzeObstacles = (predictions) => {
    const now = Date.now();
    if (now - lastAlertTime < ALERT_COOLDOWN) return;

    const obstacles = predictions.filter(p =>
      OBSTACLE_CLASSES.has(p.class) && p.score > 0.5
    );
    if (obstacles.length === 0) return;

    // Determine position of obstacle relative to frame center
    const frameCenter = videoEl.videoWidth / 2;
    let leftCount = 0, rightCount = 0, centerCount = 0;

    obstacles.forEach(obs => {
      const objCenter = obs.bbox[0] + obs.bbox[2] / 2;
      const zone = frameCenter * 0.4;
      if (objCenter < frameCenter - zone) leftCount++;
      else if (objCenter > frameCenter + zone) rightCount++;
      else centerCount++;
    });

    // Alert based on position
    if (centerCount > 0 || (leftCount > 0 && rightCount > 0)) {
      HapticEngine.obstacle(); // rapid vibration
      alertUser('⚠️ Obstacle ahead!', obstacles[0].class);
    } else if (leftCount > 0) {
      HapticEngine.turnRight(); // steer right
      alertUser('⬅️ Obstacle on left', obstacles[0].class);
    } else if (rightCount > 0) {
      HapticEngine.turnLeft(); // steer left
      alertUser('➡️ Obstacle on right', obstacles[0].class);
    }

    lastAlertTime = now;
  };

  const alertUser = (message, objectClass) => {
    AdaptiveUI.visualAlert(`${message}: ${objectClass}`, 'warning');
    if (CapabilityStore.get().canHear) {
      VoiceAssistant.speak(message);
    }
    // Update detection panel
    const panel = document.getElementById('detection-output');
    if (panel) {
      panel.textContent = `${message}: ${objectClass} detected`;
      panel.className = 'detection-alert active';
    }
  };

  const stop = () => {
    isRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (videoEl?.srcObject) {
      videoEl.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  return { load, start, stop };
})();

window.ObjectDetector = ObjectDetector;
