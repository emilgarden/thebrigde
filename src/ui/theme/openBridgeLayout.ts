/**
 * OpenBridge layout-tokens — baseline iPhone 13 mini (375×812 pt).
 *
 * Prototypen bridge-ux-v7.html er designet for 375 px bredde.
 * iPhone 13 mini matcher dette nøyaktig (375×812 @ 3x).
 *
 * Safe area typisk: top ~50 pt, bottom ~34 pt (home indicator).
 * Innholdshøyde ~728 pt etter safe area.
 */

/** Referansebredde — OpenBridge prototype #app width */
export const REFERENCE_WIDTH = 375;

/** iPhone 13 mini logical height */
export const REFERENCE_HEIGHT = 812;

/** Horisontal padding — topbar, bearing-wrap, log, toggle */
export const HORIZONTAL_PAD = 14;

/** Bearing canvas — 375 − 2×14 = 347 pt (CURSOR.md / bridge-ux-v7) */
export const BEARING_SIZE = REFERENCE_WIDTH - HORIZONTAL_PAD * 2;

/** Topbar — bridge-ux-v7.html #topbar */
export const TOPBAR_PAD_TOP = 10;
export const TOPBAR_PAD_BOTTOM = 9;

/** Bearing-wrap — padding: 12px 14px 6px */
export const BEARING_PAD_TOP = 12;
export const BEARING_PAD_BOTTOM = 6;

/** Event-logg — min-height 54, padding 9px 14px */
export const LOG_MIN_HEIGHT = 54;
export const LOG_PAD_V = 9;

/** Start/stopp — #toggle-section padding: 12px 14px 20px */
export const TOGGLE_PAD_TOP = 12;
export const TOGGLE_PAD_BOTTOM = 20;

export function bearingSizeForWidth(screenWidth: number): number {
  const byWidth = screenWidth - HORIZONTAL_PAD * 2;
  return Math.min(BEARING_SIZE, Math.max(200, byWidth));
}
