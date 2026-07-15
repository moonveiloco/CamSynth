// ============================================================
// CONFIG — Global application configuration
// ============================================================
// All user-modifiable values and control limits are centralized
// here for ease of maintenance.

// Main configuration
export const CONFIG = {
  // Sampling grid size (number of pixels)
  cols: 60,
  rows: 60,
  // 3D terrain spatial extent (Three.js units)
  span: 20,
  // Grid update interval in milliseconds
  updateInterval: 1000,

  // Synthesizer parameters (default values)
  synth: {
    frequency: 110,   // Carrier oscillator frequency in Hz
    radius: 2.0,      // Circular orbit radius on the terrain
    cx: 0,            // Orbit center on X axis
    cz: 0,            // Orbit center on Z axis
    fmInt: 0,         // Frequency modulation intensity
    fmRatio: 2.0,     // Modulator/carrier frequency ratio
    yScale: 1.0,      // Signal amplitude vertical scale
    hueAmount: 0.3,   // Hue influence on FM
    volume: 0.5,      // Master volume (0-1)
  },

  // Initial 3D camera settings
  view: {
    angleY: 0.5,
    angleX: 0.3,
    distance: 16,
  },
}

// Parameter limits for UI controls (min, max, step)
export const LIMITS = {
  frequency: { min: 20, max: 2000, step: 1 },
  radius: { min: 0.1, max: 6.0, step: 0.05 },
  fmInt: { min: 0, max: 500, step: 1 },
  fmRatio: { min: -1, max: 6, step: 0.05 },
  yScale: { min: 0.1, max: 5.0, step: 0.05 },
  hueAmount: { min: 0, max: 1.0, step: 0.02 },
}
