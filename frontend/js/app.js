/**
 * app.js — Main entry point
 * Handles: onboarding, routing, socket init, global voice commands
 */

let socket = null;
let currentPage = 'home';

// ─── App Bootstrap ────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Connect to backend socket
  if (typeof io !== 'undefined') {
    socket = io();
    SOSSystem.init(socket);
    BusTracker.init(socket);
  }

  // Apply any saved adaptive settings
  AdaptiveUI.applyAdaptations();

  // Route to correct view
  const savedAbilities = localStorage.getItem('accessapp_abilities');
  const token = CapabilityStore.getToken();

  if (!savedAbilities || !JSON.parse(savedAbilities)._setup) {
    // First visit — run onboarding
    showPage('onboarding');
    startOnboarding();
  } else if (!token) {
    showPage('auth');
  } else {
    showPage('dashboard');
    initDashboard();
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
});

// ─── Page Router ─────────────────────────────────────────────────────────────
const showPage = (pageId) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) {
    page.classList.add('active');
    currentPage = pageId;
  }

  // Update nav highlighting
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
};

window.showPage = showPage;

// ─── Onboarding Flow ─────────────────────────────────────────────────────────
const startOnboarding = async () => {
  await delay(800);

  // Step 1: Welcome
  await VoiceAssistant.speak(
    'Welcome to Access App. I will ask you a few questions to personalize your experience.'
  );
  updateOnboardingText('👋 Welcome to AccessApp', 'I will ask you a few questions to set up your experience.');

  await delay(1000);

  // Step 2: Can you see?
  await askAbility('canSee', 'Can you see this screen clearly?', '👁️ Can you see?');
  await delay(600);

  // Step 3: Can you hear?
  await askAbility('canHear', 'Can you hear me speaking?', '👂 Can you hear?');
  await delay(600);

  // Step 4: Can you speak?
  await askAbility('canSpeak', 'Can you speak or use your voice?', '🗣️ Can you speak?');
  await delay(600);

  // Apply abilities collected
  const abilities = CapabilityStore.get();
  abilities._setup = true;
  CapabilityStore.set(abilities);
  AdaptiveUI.applyAdaptations();

  const modeDesc = AdaptiveUI.getModeDescription(abilities.canSee, abilities.canHear, abilities.canSpeak);
  updateOnboardingText('✅ Profile Created!', modeDesc);

  if (abilities.canHear) {
    await VoiceAssistant.speak(`Great! ${modeDesc}. Now let's create your account.`);
  }

  await delay(1500);
  showPage('auth');
  showAuthForm('register');
};

const askAbility = (abilityKey, voiceQuestion, visualLabel) => {
  return new Promise(async (resolve) => {
    updateOnboardingText(visualLabel, 'Tap Yes or No, or answer with your voice.');
    await VoiceAssistant.speak(voiceQuestion);

    // Show yes/no buttons
    showYesNoButtons((answer) => {
      CapabilityStore.set({ [abilityKey]: answer });
      updateOnboardingText(visualLabel, answer ? '✅ Yes' : '❌ No');
      HapticEngine.confirm();
      resolve(answer);
    });

    // Also listen for voice answer (only if canSpeak might be true)
    VoiceAssistant.listen((transcript) => {
      const answer = VoiceAssistant.isYes(transcript);
      CapabilityStore.set({ [abilityKey]: answer });
      updateOnboardingText(visualLabel, answer ? '✅ Yes' : '❌ No');
      HapticEngine.confirm();
      resolve(answer);
    });
  });
};

const showYesNoButtons = (callback) => {
  const container = document.getElementById('onboarding-choices');
  if (!container) return;
  container.innerHTML = `
    <button class="choice-btn choice-yes tactile-target" onclick="window._choiceCallback(true)">
      ✅ Yes
    </button>
    <button class="choice-btn choice-no tactile-target" onclick="window._choiceCallback(false)">
      ❌ No
    </button>
  `;
  window._choiceCallback = (val) => {
    VoiceAssistant.stopListening();
    container.innerHTML = '';
    callback(val);
  };
};

const updateOnboardingText = (title, subtitle) => {
  const titleEl = document.getElementById('onboarding-title');
  const subtitleEl = document.getElementById('onboarding-subtitle');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
window.showAuthForm = (mode) => {
  document.getElementById('auth-login-form').style.display  = mode === 'login'    ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = mode === 'register' ? 'block' : 'none';
  if (CapabilityStore.get().canHear) {
    VoiceAssistant.speak(mode === 'login' ? 'Please log in.' : 'Please create your account.');
  }
};

window.handleRegister = async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    name:     form.querySelector('[name=name]').value,
    email:    form.querySelector('[name=email]').value,
    password: form.querySelector('[name=password]').value,
    abilities: CapabilityStore.get()
  };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      CapabilityStore.setUser(result.user, result.token);
      HapticEngine.success();
      if (CapabilityStore.get().canHear) VoiceAssistant.speak('Account created! Welcome.');
      showPage('dashboard');
      initDashboard();
    } else {
      showAuthError(result.message);
    }
  } catch (err) {
    showAuthError('Connection error. Is the server running?');
  }
};

window.handleLogin = async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    email:    form.querySelector('[name=email]').value,
    password: form.querySelector('[name=password]').value
  };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      CapabilityStore.setUser(result.user, result.token);
      AdaptiveUI.applyAdaptations();
      HapticEngine.success();
      if (CapabilityStore.get().canHear) VoiceAssistant.speak(`Welcome back, ${result.user.name}`);
      showPage('dashboard');
      initDashboard();
    } else {
      showAuthError(result.message);
    }
  } catch (err) {
    showAuthError('Connection error. Is the server running?');
  }
};

const showAuthError = (msg) => {
  const errEl = document.getElementById('auth-error');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  HapticEngine.error();
  if (CapabilityStore.get().canHear) VoiceAssistant.speak(msg);
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const initDashboard = () => {
  const user = CapabilityStore.getUser();
  const nameEl = document.getElementById('dashboard-username');
  if (nameEl && user) nameEl.textContent = user.name;
  AdaptiveUI.applyAdaptations();

  if (CapabilityStore.get().canHear) {
    VoiceAssistant.speak(`Dashboard loaded. Available features: Navigation, Bus tracking, SOS, and OCR scanner.`);
  }
};

// ─── Feature Page Loaders ─────────────────────────────────────────────────────
window.openNavigation = () => {
  showPage('navigation');
  setTimeout(() => {
    NavigationModule.initMap('nav-map');
    NavigationModule.renderDestinationButtons('dest-buttons');
  }, 300);
  if (CapabilityStore.get().canHear) VoiceAssistant.speak('Navigation opened. Choose a destination.');
};

window.openBusTracker = () => {
  showPage('bus');
  setTimeout(() => {
    BusTracker.initMap('bus-map');
    BusTracker.renderBusCards('bus-cards');
    BusTracker.fetchAllBuses();
  }, 300);
  if (CapabilityStore.get().canHear) VoiceAssistant.speak('Bus tracker opened.');
};

window.openOCR = () => {
  showPage('ocr');
  OCRScanner.init();
  if (CapabilityStore.get().canHear) VoiceAssistant.speak('OCR Scanner opened. Upload or capture an image to read text.');
};

window.openSOS = () => SOSSystem.trigger('button');

window.logout = () => {
  CapabilityStore.logout();
  showPage('auth');
  showAuthForm('login');
};

// ─── Global Mic Button ────────────────────────────────────────────────────────
window.toggleMic = () => {
  if (VoiceAssistant.isListening()) {
    VoiceAssistant.stopListening();
  } else {
    VoiceAssistant.listen((transcript) => {
      // Check for SOS command first
      if (SOSSystem.checkVoiceTrigger(transcript)) return;

      // Navigation commands
      if (transcript.includes('navigate') || transcript.includes('go to')) {
        showPage('navigation');
        return;
      }
      if (transcript.includes('bus')) {
        showPage('bus');
        return;
      }
      if (transcript.includes('scan') || transcript.includes('read')) {
        showPage('ocr');
        return;
      }
      if (transcript.includes('home') || transcript.includes('dashboard')) {
        showPage('dashboard');
        return;
      }
    });
  }
};

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
const handleKeyboard = (e) => {
  if (e.altKey) {
    switch (e.key) {
      case 'h': showPage('dashboard'); break;
      case 'n': openNavigation(); break;
      case 'b': openBusTracker(); break;
      case 'o': openOCR(); break;
      case 's': SOSSystem.trigger('button'); break;
      case 'm': toggleMic(); break;
    }
  }
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
