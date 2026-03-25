/**
 * CapabilityStore — Central state for user abilities
 * All modules read from here to decide how to behave.
 */

const CapabilityStore = (() => {
  const defaultAbilities = {
    canSee:   true,
    canHear:  true,
    canSpeak: true
  };

  let abilities = { ...defaultAbilities };
  let user = null;
  let token = null;

  // Load from localStorage if available
  const load = () => {
    try {
      const saved = localStorage.getItem('accessapp_abilities');
      if (saved) abilities = JSON.parse(saved);
      const savedUser = localStorage.getItem('accessapp_user');
      if (savedUser) user = JSON.parse(savedUser);
      token = localStorage.getItem('accessapp_token');
    } catch (e) {
      console.warn('Could not load saved state', e);
    }
  };

  const save = () => {
    localStorage.setItem('accessapp_abilities', JSON.stringify(abilities));
    if (user) localStorage.setItem('accessapp_user', JSON.stringify(user));
    if (token) localStorage.setItem('accessapp_token', token);
  };

  const set = (newAbilities) => {
    abilities = { ...abilities, ...newAbilities };
    save();
    window.dispatchEvent(new CustomEvent('abilitiesChanged', { detail: abilities }));
  };

  const get = () => ({ ...abilities });

  const setUser = (userData, authToken) => {
    user = userData;
    token = authToken;
    if (userData?.abilities) set(userData.abilities);
    save();
  };

  const getUser = () => user;
  const getToken = () => token;

  const isLoggedIn = () => !!token;

  const logout = () => {
    user = null;
    token = null;
    abilities = { ...defaultAbilities };
    localStorage.removeItem('accessapp_abilities');
    localStorage.removeItem('accessapp_user');
    localStorage.removeItem('accessapp_token');
  };

  // Derived helpers
  const isBlind       = () => !abilities.canSee;
  const isDeaf        = () => !abilities.canHear;
  const isMute        = () => !abilities.canSpeak;
  const isDeafBlind   = () => !abilities.canSee && !abilities.canHear;
  const isBlindMute   = () => !abilities.canSee && !abilities.canSpeak;
  const isDeafMute    = () => !abilities.canHear && !abilities.canSpeak;
  const isFullyLimited = () => !abilities.canSee && !abilities.canHear && !abilities.canSpeak;

  load();

  return {
    set, get, setUser, getUser, getToken, isLoggedIn, logout,
    isBlind, isDeaf, isMute, isDeafBlind, isBlindMute, isDeafMute, isFullyLimited
  };
})();

window.CapabilityStore = CapabilityStore;
