export const CONFIG = {
  cols: 32,
  rows: 24,
  span: 20,
  updateInterval: 1000,
  synth: {
    frequency: 110,
    radius: 2.0,
    cx: 0,
    cz: 0,
    fmInt: 0,
    fmRatio: 2.0,
    yScale: 1.0,
    hueAmount: 0.3,
    volume: 0.5,
  },
  view: {
    angleY: 0.5,
    angleX: 0.3,
    distance: 16,
  },
}

export const LIMITS = {
  frequency: { min: 20, max: 2000, step: 1 },
  radius: { min: 0.1, max: 6.0, step: 0.05 },
  fmInt: { min: 0, max: 500, step: 1 },
  fmRatio: { min: -1, max: 6, step: 0.05 },
  yScale: { min: 0.1, max: 5.0, step: 0.05 },
  hueAmount: { min: 0, max: 1.0, step: 0.02 },
}
