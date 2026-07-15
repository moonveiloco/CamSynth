export function rgbToLuma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

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

export function pixelToHeight(r, g, b) {
  const luma = rgbToLuma(r, g, b)
  return 1 - (luma / 255) * 2
}

export function pixelToHueNormalized(r, g, b) {
  const hue = rgbToHue(r, g, b)
  return (hue - 0.5) * 2
}
