/**
 * BusTracker — Real-time bus tracking with map display and voice updates
 */

const BusTracker = (() => {
  let map = null;
  let busMarkers = {};
  let socket = null;
  let pollInterval = null;

  const BUS_ICONS = {
    'BUS-01': '🔵',
    'BUS-02': '🟢',
    'BUS-03': '🟠'
  };

  const init = (socketInstance) => {
    socket = socketInstance;

    // Listen for real-time bus updates via socket
    if (socket) {
      socket.on('bus-location', (data) => {
        updateBusOnMap(data.busId, data);
        updateBusCard(data.busId, data);
      });
    }

    // Poll every 10 seconds as fallback
    fetchAllBuses();
    pollInterval = setInterval(fetchAllBuses, 10000);
  };

  const initMap = (containerId = 'bus-map') => {
    const container = document.getElementById(containerId);
    if (!container || map) return;

    map = L.map(containerId).setView([12.9716, 80.2209], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  };

  const fetchAllBuses = async () => {
    try {
      const res = await fetch('/api/bus/location');
      const data = await res.json();
      if (!data.success) return;

      const { canHear } = CapabilityStore.get();
      const buses = data.buses;

      Object.entries(buses).forEach(([busId, busData]) => {
        updateBusOnMap(busId, { ...busData, busId });
        updateBusCard(busId, { ...busData, busId });
      });

      // Update last-refreshed time
      const timestamp = document.getElementById('bus-last-updated');
      if (timestamp) {
        timestamp.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      }
    } catch (err) {
      console.error('Bus fetch error:', err);
    }
  };

  const updateBusOnMap = (busId, data) => {
    if (!map) return;

    const pos = [data.lat, data.lng];
    const icon = L.divIcon({
      html: `<div class="bus-marker">${BUS_ICONS[busId] || '🚌'}<span>${busId}</span></div>`,
      className: '',
      iconSize: [60, 30]
    });

    if (busMarkers[busId]) {
      busMarkers[busId].setLatLng(pos);
    } else {
      busMarkers[busId] = L.marker(pos, { icon }).addTo(map)
        .bindPopup(`<strong>${busId}</strong><br>${data.route}<br>Next: ${data.nextStop}<br>ETA: ${data.eta}`);
    }
  };

  const updateBusCard = (busId, data) => {
    const card = document.getElementById(`bus-card-${busId}`);
    if (!card) return;

    card.querySelector('.bus-route').textContent  = data.route || '';
    card.querySelector('.bus-stop').textContent   = data.nextStop || '';
    card.querySelector('.bus-eta').textContent    = data.eta || '';
  };

  const renderBusCards = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const buses = ['BUS-01', 'BUS-02', 'BUS-03'];
    container.innerHTML = buses.map(busId => `
      <div class="bus-card" id="bus-card-${busId}">
        <div class="bus-card-header">
          <span class="bus-icon">${BUS_ICONS[busId]}</span>
          <span class="bus-id">${busId}</span>
          <span class="bus-status live">● LIVE</span>
        </div>
        <div class="bus-card-body">
          <div class="bus-info-row">
            <span class="label">Route</span>
            <span class="bus-route">Loading...</span>
          </div>
          <div class="bus-info-row">
            <span class="label">Next Stop</span>
            <span class="bus-stop">—</span>
          </div>
          <div class="bus-info-row">
            <span class="label">ETA</span>
            <span class="bus-eta">—</span>
          </div>
        </div>
        <button class="btn btn-sm" onclick="BusTracker.announceETA('${busId}')">
          🔊 Announce ETA
        </button>
      </div>
    `).join('');
  };

  const announceETA = (busId) => {
    const card = document.getElementById(`bus-card-${busId}`);
    if (!card) return;
    const route = card.querySelector('.bus-route').textContent;
    const stop  = card.querySelector('.bus-stop').textContent;
    const eta   = card.querySelector('.bus-eta').textContent;
    const text  = `${busId} on route ${route}. Next stop: ${stop}. Arriving in ${eta}.`;
    VoiceAssistant.speak(text);
    HapticEngine.next();
  };

  const destroy = () => {
    if (pollInterval) clearInterval(pollInterval);
  };

  return { init, initMap, fetchAllBuses, renderBusCards, announceETA, destroy };
})();

window.BusTracker = BusTracker;
