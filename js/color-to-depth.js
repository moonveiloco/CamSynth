// ============================================================
// color-to-depth.js — RGB to height/hue conversion
// ============================================================
// Transforms webcam RGB pixels into two values:
// - height (altitude): derived from pixel luminance
// - hue (normalized): used to modulate FM intensity

// Luminance weights (ITU-R BT.601 standard)
// The human eye is most sensitive to green, least to blue
export function rgbToLuma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Converts RGB to hue in HSL space
// Result is normalized to [0, 1)
export function rgbToHue(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0

  let hue = 0
  if (max === r) {
    hue = ((g - b) / delta) % 6
  } else if (max === g) {
    hue = (b - r) / delta + 2
  } else {
    hue = (r - g) / delta + 4
  }
  hue *= 60
  if (hue < 0) hue += 360
  return hue / 360
}

// Maps an RGB pixel to a height in range [-1, 1]
// Uses luminance: dark pixels → positive height, bright → negative
export function pixelToHeight(r, g, b) {
  const luma = rgbToLuma(r, g, b)
  return 1 - (luma / 255) * 2
}

// Normalizes hue from [0, 1) to [-1, 1]
// for use as a balanced FM modulator
export function pixelToHueNormalized(r, g, b) {
  const hue = rgbToHue(r, g, b)
  return (hue - 0.5) * 2
}
