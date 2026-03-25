/**
 * VoiceAssistant — handles Text-to-Speech and Speech-to-Text
 * Works with Web Speech API (built into modern browsers)
 */

const VoiceAssistant = (() => {
  const synth = window.speechSynthesis;
  let recognition = null;
  let isListening = false;
  let onResultCallback = null;

  // Initialize Speech Recognition
  const initRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      return false;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('Heard:', transcript);
      if (onResultCallback) onResultCallback(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isListening = false;
      updateMicUI(false);
    };

    recognition.onend = () => {
      isListening = false;
      updateMicUI(false);
    };

    return true;
  };

  // Speak text aloud
  const speak = (text, options = {}) => {
    return new Promise((resolve) => {
      if (!synth) { resolve(); return; }
      synth.cancel(); // stop any current speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate  = options.rate  || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      // Pick a clear voice if available
      const voices = synth.getVoices();
      const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = resolve;
      utterance.onerror = resolve;
      synth.speak(utterance);
    });
  };

  // Stop speaking
  const stop = () => synth && synth.cancel();

  // Start listening
  const listen = (callback) => {
    if (!recognition && !initRecognition()) {
      speak('Speech recognition is not available in this browser.');
      return;
    }
    onResultCallback = callback;
    recognition.start();
    isListening = true;
    updateMicUI(true);
  };

  // Stop listening
  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  };

  // Update mic button visual state
  const updateMicUI = (active) => {
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
      micBtn.classList.toggle('listening', active);
      micBtn.setAttribute('aria-label', active ? 'Listening...' : 'Tap to speak');
    }
  };

  // Parse yes/no from speech
  const isYes = (text) => /\b(yes|yeah|yep|correct|right|sure|okay|ok|affirmative)\b/.test(text);
  const isNo  = (text) => /\b(no|nope|nah|negative|wrong|don't|dont)\b/.test(text);

  // Extract ability answers from speech
  const parseAbilities = (text) => {
    return {
      canSee:   !/\b(blind|cannot see|can't see|no (i )?(cannot|can't) see)\b/.test(text),
      canHear:  !/\b(deaf|cannot hear|can't hear)\b/.test(text),
      canSpeak: !/\b(mute|cannot speak|can't speak|dumb)\b/.test(text)
    };
  };

  return { speak, stop, listen, stopListening, isYes, isNo, parseAbilities, isListening: () => isListening };
})();

window.VoiceAssistant = VoiceAssistant;
