/**
 * HapticEngine — Vibration patterns for tactile feedback
 * Uses the Vibration API (supported on most Android browsers)
 */

const HapticEngine = (() => {
  const supported = 'vibrate' in navigator;

  // Core vibration patterns (ms: vibrate, pause, vibrate...)
  const PATTERNS = {
    // Navigation
    MOVE_STRAIGHT: [100, 50, 100],          // short + short
    TURN_LEFT:     [400, 50, 100],          // long + short
    TURN_RIGHT:    [100, 50, 400],          // short + long
    STOP:          [800],                    // long single
    OBSTACLE:      [50, 30, 50, 30, 50, 30, 50, 30], // rapid

    // UI feedback
    CONFIRM:       [100, 50, 100, 50, 300], // double + long
    CANCEL:        [600],                   // single long
    NEXT:          [80],                    // short pulse
    SELECT:        [150, 50, 150],          // double pulse
    SUCCESS:       [100, 50, 100, 50, 100], // triple short
    ERROR:         [500, 100, 500],         // double long

    // SOS
    SOS_ALERT:     [300, 100, 300, 100, 300, 500, 100, 300, 100, 300],

    // Destination reached
    ARRIVED:       [200, 100, 200, 100, 800],
  };

  const vibrate = (pattern) => {
    if (!supported) return false;
    navigator.vibrate(pattern);
    return true;
  };

  // Named pattern triggers
  const moveStraight  = () => vibrate(PATTERNS.MOVE_STRAIGHT);
  const turnLeft      = () => vibrate(PATTERNS.TURN_LEFT);
  const turnRight     = () => vibrate(PATTERNS.TURN_RIGHT);
  const stop          = () => vibrate(PATTERNS.STOP);
  const obstacle      = () => vibrate(PATTERNS.OBSTACLE);
  const confirm       = () => vibrate(PATTERNS.CONFIRM);
  const cancel        = () => vibrate(PATTERNS.CANCEL);
  const next          = () => vibrate(PATTERNS.NEXT);
  const select        = () => vibrate(PATTERNS.SELECT);
  const success       = () => vibrate(PATTERNS.SUCCESS);
  const error         = () => vibrate(PATTERNS.ERROR);
  const sos           = () => vibrate(PATTERNS.SOS_ALERT);
  const arrived       = () => vibrate(PATTERNS.ARRIVED);

  // Custom pattern
  const custom = (pattern) => vibrate(pattern);

  const isSupported = () => supported;

  return {
    moveStraight, turnLeft, turnRight, stop, obstacle,
    confirm, cancel, next, select, success, error, sos, arrived,
    custom, isSupported, PATTERNS
  };
})();

window.HapticEngine = HapticEngine;
