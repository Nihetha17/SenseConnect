/**
 * GestureDetector — Recognizes hand gestures via MediaPipe Hands
 * Open palm = select, Swipe = navigate, Fist = cancel
 */

const GestureDetector = (() => {
  let hands = null;
  let camera = null;
  let isRunning = false;
  let onGestureCallback = null;
  let lastGesture = null;
  let lastGestureTime = 0;
  const GESTURE_COOLDOWN = 1500; // ms between gesture triggers

  const GESTURES = {
    OPEN_PALM: 'open_palm',   // all fingers extended → select / confirm
    FIST:      'fist',        // all fingers closed → cancel
    SWIPE_LEFT: 'swipe_left', // tracked via position delta
    SWIPE_RIGHT:'swipe_right',
    THUMBS_UP:  'thumbs_up',  // thumb up, others closed
    POINTING:   'pointing',   // index finger extended only
  };

  const init = async (videoElementId, onGesture) => {
    onGestureCallback = onGesture;

    if (typeof Hands === 'undefined') {
      console.warn('MediaPipe Hands not loaded. Gesture control unavailable.');
      return false;
    }

    const videoEl = document.getElementById(videoElementId);
    if (!videoEl) return false;

    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75
    });

    hands.onResults(processResults);

    // Start camera
    camera = new Camera(videoEl, {
      onFrame: async () => {
        if (hands && isRunning) await hands.send({ image: videoEl });
      },
      width: 320,
      height: 240
    });

    await camera.start();
    isRunning = true;
    console.log('✋ Gesture detection started');
    return true;
  };

  let prevWristX = null;

  const processResults = (results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      prevWristX = null;
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const gesture = classifyGesture(landmarks);

    if (gesture && gesture !== lastGesture) {
      const now = Date.now();
      if (now - lastGestureTime > GESTURE_COOLDOWN) {
        lastGesture = gesture;
        lastGestureTime = now;
        handleGesture(gesture);
      }
    }

    // Swipe detection via wrist X movement
    const wristX = landmarks[0].x;
    if (prevWristX !== null) {
      const delta = wristX - prevWristX;
      const now = Date.now();
      if (Math.abs(delta) > 0.12 && now - lastGestureTime > GESTURE_COOLDOWN) {
        const swipeGesture = delta > 0 ? GESTURES.SWIPE_RIGHT : GESTURES.SWIPE_LEFT;
        lastGestureTime = now;
        handleGesture(swipeGesture);
      }
    }
    prevWristX = wristX;
  };

  const classifyGesture = (landmarks) => {
    // Finger tip indices: thumb=4, index=8, middle=12, ring=16, pinky=20
    // Finger MCP indices: thumb=2, index=5, middle=9, ring=13, pinky=17

    const isExtended = (tipIdx, mcpIdx) => landmarks[tipIdx].y < landmarks[mcpIdx].y;

    const thumbUp   = landmarks[4].y < landmarks[3].y;
    const indexUp   = isExtended(8, 5);
    const middleUp  = isExtended(12, 9);
    const ringUp    = isExtended(16, 13);
    const pinkyUp   = isExtended(20, 17);

    // Open palm: all extended
    if (indexUp && middleUp && ringUp && pinkyUp) return GESTURES.OPEN_PALM;

    // Fist: none extended
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) return GESTURES.FIST;

    // Thumbs up: thumb up, rest closed
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return GESTURES.THUMBS_UP;

    // Pointing: only index extended
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return GESTURES.POINTING;

    return null;
  };

  const handleGesture = (gesture) => {
    console.log('Gesture detected:', gesture);

    // Visual indicator
    showGestureIndicator(gesture);

    // Haptic feedback
    HapticEngine.select();

    // Announce for hearing users
    const { canHear } = CapabilityStore.get();
    const gestureNames = {
      [GESTURES.OPEN_PALM]:   'Select',
      [GESTURES.FIST]:        'Cancel',
      [GESTURES.SWIPE_LEFT]:  'Previous',
      [GESTURES.SWIPE_RIGHT]: 'Next',
      [GESTURES.THUMBS_UP]:   'Confirm',
      [GESTURES.POINTING]:    'Pointer mode',
    };
    if (canHear && gestureNames[gesture]) {
      VoiceAssistant.speak(gestureNames[gesture]);
    }

    // Call user callback
    if (onGestureCallback) onGestureCallback(gesture);

    // Built-in SOS gesture: open palm held (triggered externally via voice command fallback)
  };

  const showGestureIndicator = (gesture) => {
    let indicator = document.getElementById('gesture-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'gesture-indicator';
      document.body.appendChild(indicator);
    }
    const icons = {
      [GESTURES.OPEN_PALM]:   '✋ Select',
      [GESTURES.FIST]:        '✊ Cancel',
      [GESTURES.SWIPE_LEFT]:  '👈 Previous',
      [GESTURES.SWIPE_RIGHT]: '👉 Next',
      [GESTURES.THUMBS_UP]:   '👍 Confirm',
      [GESTURES.POINTING]:    '👆 Pointing',
    };
    indicator.textContent = icons[gesture] || gesture;
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 1500);
  };

  const stop = async () => {
    isRunning = false;
    if (camera) await camera.stop();
  };

  return { init, stop, GESTURES };
})();

window.GestureDetector = GestureDetector;
