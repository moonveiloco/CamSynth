// ============================================================
// grid.js — Webcam capture and grid downsampling
// ============================================================
// Starts a low-resolution webcam stream, samples each frame
// into a cols×rows grid, and converts each pixel to a
// (height, hue) pair for audio synthesis and 3D visualization.

import { CONFIG } from './config.js'
import { pixelToHeight, pixelToHueNormalized } from './color-to-depth.js'

export class GridCapture {
  constructor() {
    this.video = null           // Video element for streaming
    this.stream = null          // Stream reference for cleanup
    this.canvas = document.createElement('canvas')  // Offscreen canvas
    this.ctx = this.canvas.getContext('2d')          // 2D rendering context
    this.heights = new Float32Array(CONFIG.cols * CONFIG.rows)  // Height buffer
    this.hues = new Float32Array(CONFIG.cols * CONFIG.rows)     // Hue buffer
    this.running = false
  }

  // Starts the webcam video stream
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, frameRate: 15 },
    })
    this.video = document.createElement('video')
    this.video.srcObject = this.stream
    this.video.playsInline = true
    this.video.muted = true
    await this.video.play()
    this.running = true
  }

  // Stops the stream and releases resources
  stop() {
    this.running = false
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
    }
  }

  // Samples the current frame: draws the resized video onto
  // the offscreen canvas and reads pixels one by one
  capture() {
    if (!this.running || !this.video || this.video.readyState < 2) return false

    const { cols, rows } = CONFIG
    this.canvas.width = cols
    this.canvas.height = rows
    this.ctx.drawImage(this.video, 0, 0, cols, rows)

    const imageData = this.ctx.getImageData(0, 0, cols, rows)
    const data = imageData.data
    const len = cols * rows

    // Each RGBA pixel → height + normalized hue
    for (let i = 0; i < len; i++) {
      const idx = i * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      this.heights[i] = pixelToHeight(r, g, b)
      this.hues[i] = pixelToHueNormalized(r, g, b)
    }

    return true
  }

  // Returns the current height and hue buffers
  getGrid() {
    return { heights: this.heights, hues: this.hues }
  }
}
