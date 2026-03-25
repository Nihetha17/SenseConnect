/**
 * AdaptiveUI — Dynamically reconfigures the entire interface
 * based on user capabilities. Call applyAdaptations() after abilities are set.
 */

const AdaptiveUI = (() => {

  const applyAdaptations = () => {
    const { canSee, canHear, canSpeak } = CapabilityStore.get();
    const body = document.body;

    // Reset all mode classes
    body.classList.remove(
      'mode-blind', 'mode-deaf', 'mode-mute',
      'mode-deaf-blind', 'mode-blind-mute', 'mode-deaf-mute',
      'mode-fully-limited', 'mode-sighted', 'mode-hearing', 'mode-speaking'
    );

    // Apply capability flags as CSS classes
    if (!canSee)  body.classList.add('mode-blind');
    if (!canHear) body.classList.add('mode-deaf');
    if (!canSpeak) body.classList.add('mode-mute');

    // Compound modes
    if (!canSee && !canHear && !canSpeak) body.classList.add('mode-fully-limited');
    else if (!canSee && !canHear)  body.classList.add('mode-deaf-blind');
    else if (!canSee && !canSpeak) body.classList.add('mode-blind-mute');
    else if (!canHear && !canSpeak) body.classList.add('mode-deaf-mute');

    // Positive classes for styling
    if (canSee)   body.classList.add('mode-sighted');
    if (canHear)  body.classList.add('mode-hearing');
    if (canSpeak) body.classList.add('mode-speaking');

    // Show/hide mic button
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.style.display = canSpeak ? 'flex' : 'none';

    // Auto-start voice guidance for blind users
    if (!canSee && canHear) {
      setTimeout(() => {
        VoiceAssistant.speak('Screen reader mode active. All content will be read aloud.');
      }, 500);
    }

    // Show visual alerts panel for deaf users
    const alertPanel = document.getElementById('visual-alert-panel');
    if (alertPanel) alertPanel.style.display = !canHear ? 'block' : 'none';

    // High contrast for visual users with hearing impairment
    if (!canHear && canSee) body.classList.add('high-contrast');

    // Tactile mode UI for deaf-blind
    if (!canSee && !canHear) {
      enableTactileMode();
    }

    // Announce mode to screen readers
    announceToScreenReader(getModeDescription(canSee, canHear, canSpeak));

    console.log(`🎨 Adaptive UI applied: canSee=${canSee}, canHear=${canHear}, canSpeak=${canSpeak}`);
  };

  const enableTactileMode = () => {
    // Make all interactive elements larger and more touch-friendly
    document.querySelectorAll('button, .nav-item, .feature-card').forEach(el => {
      el.classList.add('tactile-target');
    });
    // Show tactile navigation panel
    const tactilePanel = document.getElementById('tactile-panel');
    if (tactilePanel) tactilePanel.style.display = 'block';
  };

  const getModeDescription = (canSee, canHear, canSpeak) => {
    if (!canSee && !canHear && !canSpeak) return 'Tactile-only mode: using vibration and gesture input';
    if (!canSee && !canHear) return 'Deaf-blind mode: vibration navigation active';
    if (!canSee && !canSpeak) return 'Blind-mute mode: audio guidance and touch input active';
    if (!canHear && !canSpeak) return 'Deaf-mute mode: visual interface and text input active';
    if (!canSee) return 'Blind mode: voice assistant active';
    if (!canHear) return 'Deaf mode: visual alerts and text active';
    if (!canSpeak) return 'Mute mode: text input and text-to-speech active';
    return 'Standard mode: all features available';
  };

  const announceToScreenReader = (message) => {
    let liveRegion = document.getElementById('sr-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'sr-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = message; }, 100);
  };

  // Visual flash alert for deaf users
  const visualAlert = (message, type = 'info') => {
    const alertPanel = document.getElementById('visual-alert-panel');
    if (!alertPanel) return;

    alertPanel.innerHTML = `
      <div class="visual-alert visual-alert--${type}" role="alert">
        <span class="alert-icon">${type === 'danger' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span class="alert-text">${message}</span>
      </div>
    `;
    alertPanel.style.display = 'block';

    // Flash the screen for critical alerts
    if (type === 'danger') {
      document.body.classList.add('screen-flash');
      setTimeout(() => document.body.classList.remove('screen-flash'), 1000);
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
      alertPanel.innerHTML = '';
    }, 5000);
  };

  // Listen for ability changes and re-apply
  window.addEventListener('abilitiesChanged', () => applyAdaptations());

  return { applyAdaptations, visualAlert, announceToScreenReader, getModeDescription };
})();

window.AdaptiveUI = AdaptiveUI;
