/**
 * NavigationModule — Campus navigation with voice guidance, visual map,
 * and vibration patterns for deaf-blind users
 */

const NavigationModule = (() => {
  let map = null;
  let userMarker = null;
  let routeLine = null;
  let watchId = null;
  let currentDestination = null;
  let stepIndex = 0;

  // Predefined campus destinations
  const DESTINATIONS = [
    { id: 'classroom', name: 'Classroom Block', lat: 12.9725, lng: 80.2215, icon: '🏫' },
    { id: 'lab',       name: 'Computer Lab',    lat: 12.9730, lng: 80.2225, icon: '💻' },
    { id: 'office',    name: 'Admin Office',    lat: 12.9718, lng: 80.2210, icon: '🏢' },
    { id: 'gate',      name: 'Main Gate',       lat: 12.9710, lng: 80.2200, icon: '🚪' },
    { id: 'busstop',   name: 'Bus Stop',        lat: 12.9708, lng: 80.2195, icon: '🚌' },
    { id: 'library',   name: 'Library',         lat: 12.9722, lng: 80.2218, icon: '📚' },
    { id: 'canteen',   name: 'Canteen',         lat: 12.9728, lng: 80.2212, icon: '🍽️' },
  ];

  const initMap = (containerId = 'nav-map') => {
    const container = document.getElementById(containerId);
    if (!container || map) return;

    // Default center: campus coordinates
    map = L.map(containerId).setView([12.9716, 80.2209], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 20
    }).addTo(map);

    // Add destination markers
    DESTINATIONS.forEach(dest => {
      const marker = L.marker([dest.lat, dest.lng])
        .addTo(map)
        .bindPopup(`<strong>${dest.icon} ${dest.name}</strong><br>
          <button onclick="NavigationModule.navigateTo('${dest.id}')" 
            style="margin-top:6px;padding:4px 10px;background:#4f46e5;color:#fff;border:none;border-radius:4px;cursor:pointer">
            Navigate Here
          </button>`);
    });

    // Track user location
    startTracking();
  };

  const startTracking = () => {
    if (!navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(
      pos => updateUserPosition(pos.coords.latitude, pos.coords.longitude),
      err => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true }
    );
  };

  const updateUserPosition = (lat, lng) => {
    if (!map) return;
    const pos = [lat, lng];

    if (!userMarker) {
      const userIcon = L.divIcon({
        html: '<div class="user-dot"></div>',
        className: '',
        iconSize: [20, 20]
      });
      userMarker = L.marker(pos, { icon: userIcon }).addTo(map);
    } else {
      userMarker.setLatLng(pos);
    }

    // Check proximity to destination
    if (currentDestination) checkArrival(lat, lng);
  };

  const navigateTo = (destId) => {
    const dest = DESTINATIONS.find(d => d.id === destId);
    if (!dest) return;

    currentDestination = dest;
    stepIndex = 0;

    const { canSee, canHear } = CapabilityStore.get();

    // Voice announcement
    if (canHear) {
      VoiceAssistant.speak(`Navigating to ${dest.name}. Follow the directions.`);
    }

    // Visual: draw route on map
    if (canSee && map) {
      if (routeLine) map.removeLayer(routeLine);
      // Simulate a route (straight line; real app uses routing API)
      navigator.geolocation.getCurrentPosition(pos => {
        const userPos = [pos.coords.latitude, pos.coords.longitude];
        const destPos = [dest.lat, dest.lng];
        routeLine = L.polyline([userPos, destPos], { color: '#4f46e5', weight: 5, dashArray: '10,5' }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
      });
    }

    // Tactile: start vibration-based guidance
    if (!canSee && !canHear) {
      startTactileNavigation(dest);
    }

    // Show step-by-step panel
    showStepPanel(dest);
  };

  const showStepPanel = (dest) => {
    const panel = document.getElementById('nav-steps');
    if (!panel) return;

    // Simulated steps
    const steps = [
      { instruction: 'Head north toward the main path', direction: 'straight', distance: '50m' },
      { instruction: 'Turn right at the fountain', direction: 'right', distance: '30m' },
      { instruction: 'Continue straight', direction: 'straight', distance: '40m' },
      { instruction: `Arrive at ${dest.name}`, direction: 'arrive', distance: '0m' }
    ];

    panel.innerHTML = `
      <div class="steps-header">
        <span class="dest-icon">${dest.icon}</span>
        <h3>${dest.name}</h3>
      </div>
      <div class="steps-list">
        ${steps.map((s, i) => `
          <div class="step-item ${i === 0 ? 'active' : ''}" data-index="${i}">
            <span class="step-icon">${directionIcon(s.direction)}</span>
            <div class="step-info">
              <span class="step-instruction">${s.instruction}</span>
              <span class="step-distance">${s.distance}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary" onclick="NavigationModule.stopNavigation()">Stop Navigation</button>
    `;
    panel.style.display = 'block';

    // Announce first step
    if (CapabilityStore.get().canHear) {
      VoiceAssistant.speak(steps[0].instruction);
    }

    // Vibration for direction
    provideDirectionFeedback(steps[0].direction);
  };

  const directionIcon = (dir) => {
    const icons = { straight: '⬆️', left: '⬅️', right: '➡️', arrive: '📍' };
    return icons[dir] || '⬆️';
  };

  const provideDirectionFeedback = (direction) => {
    switch (direction) {
      case 'straight': HapticEngine.moveStraight(); break;
      case 'left':  HapticEngine.turnLeft(); break;
      case 'right': HapticEngine.turnRight(); break;
      case 'arrive': HapticEngine.arrived(); break;
    }
  };

  const startTactileNavigation = (dest) => {
    // Cycle through destinations via vibration for deaf-blind users
    let destIndex = 0;
    HapticEngine.next(); // Signal: new destination options

    // Single tap = next, double tap = select (handled by gesture module)
    window._tactileNavDest = dest;
  };

  const checkArrival = (userLat, userLng) => {
    if (!currentDestination) return;
    const dist = getDistanceMeters(userLat, userLng, currentDestination.lat, currentDestination.lng);
    if (dist < 15) { // within 15 meters
      const { canHear } = CapabilityStore.get();
      if (canHear) VoiceAssistant.speak(`You have arrived at ${currentDestination.name}`);
      HapticEngine.arrived();
      AdaptiveUI.visualAlert(`📍 Arrived at ${currentDestination.name}!`, 'info');
      currentDestination = null;
    }
  };

  const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const stopNavigation = () => {
    currentDestination = null;
    if (routeLine && map) map.removeLayer(routeLine);
    const panel = document.getElementById('nav-steps');
    if (panel) panel.style.display = 'none';
    HapticEngine.cancel();
  };

  const renderDestinationButtons = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = DESTINATIONS.map(d => `
      <button class="dest-btn tactile-target" onclick="NavigationModule.navigateTo('${d.id}')"
        aria-label="Navigate to ${d.name}">
        <span class="dest-btn-icon">${d.icon}</span>
        <span class="dest-btn-name">${d.name}</span>
      </button>
    `).join('');
  };

  return { initMap, navigateTo, stopNavigation, renderDestinationButtons, DESTINATIONS };
})();

window.NavigationModule = NavigationModule;
