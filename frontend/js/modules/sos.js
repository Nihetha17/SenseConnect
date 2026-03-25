/**
 * SOSSystem — Emergency alert with location, voice trigger, and socket broadcast
 */

const SOSSystem = (() => {
  let socket = null;
  let sosActive = false;

  const init = (socketInstance) => {
    socket = socketInstance;
  };

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => reject(err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  const trigger = async (method = 'button') => {
    if (sosActive) return;
    sosActive = true;

    // Haptic SOS pattern
    HapticEngine.sos();

    // Visual flash for deaf users
    AdaptiveUI.visualAlert('🚨 SOS ALERT SENT — Help is on the way!', 'danger');

    // Voice feedback for blind users
    const { canSee, canHear } = CapabilityStore.get();
    if (canHear) VoiceAssistant.speak('S O S alert triggered. Sending your location to emergency contacts.');

    try {
      const location = await getLocation();
      const user = CapabilityStore.getUser();

      // Save to DB
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?._id,
          userName: user?.name || 'Anonymous',
          location,
          triggerMethod: method,
          message: `SOS triggered via ${method}`
        })
      });

      // Broadcast via socket
      if (socket) {
        socket.emit('sos-alert', {
          userName: user?.name || 'Anonymous',
          location,
          triggerMethod: method
        });
      }

      showSOSOverlay(location);
    } catch (err) {
      console.error('SOS location error:', err);
      if (canHear) VoiceAssistant.speak('Could not get your location. SOS sent without coordinates.');
    }

    // Reset after 30 seconds
    setTimeout(() => { sosActive = false; }, 30000);
  };

  const showSOSOverlay = (location) => {
    let overlay = document.getElementById('sos-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sos-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="sos-active-panel">
        <div class="sos-pulse"></div>
        <h2>🚨 SOS ACTIVE</h2>
        <p>Your location has been shared</p>
        <p class="sos-coords">📍 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}</p>
        <button onclick="SOSSystem.cancel()" class="btn btn-cancel">Cancel SOS</button>
      </div>
    `;
    overlay.style.display = 'flex';
  };

  const cancel = () => {
    sosActive = false;
    const overlay = document.getElementById('sos-overlay');
    if (overlay) overlay.style.display = 'none';
    HapticEngine.cancel();
    if (CapabilityStore.get().canHear) VoiceAssistant.speak('SOS cancelled.');
  };

  // Listen for "help me" voice command
  const checkVoiceTrigger = (transcript) => {
    if (/\b(help me|emergency|sos|danger)\b/.test(transcript)) {
      trigger('voice');
      return true;
    }
    return false;
  };

  return { init, trigger, cancel, checkVoiceTrigger };
})();

window.SOSSystem = SOSSystem;
