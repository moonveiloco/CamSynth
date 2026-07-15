import { CONFIG } from './config.js'
import { pixelToHeight, pixelToHueNormalized } from './color-to-depth.js'

export class GridCapture {
  constructor() {
    this.video = null
    this.stream = null
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.heights = new Float32Array(CONFIG.cols * CONFIG.rows)
    this.hues = new Float32Array(CONFIG.cols * CONFIG.rows)
    this.running = false
  }

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

  stop() {
    this.running = false
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
    }
  }

  capture() {
    if (!this.running || !this.video || this.video.readyState < 2) return false

    const { cols, rows } = CONFIG
    this.canvas.width = cols
    this.canvas.height = rows
    this.ctx.drawImage(this.video, 0, 0, cols, rows)

    const imageData = this.ctx.getImageData(0, 0, cols, rows)
    const data = imageData.data
    const len = cols * rows

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

  getGrid() {
    return { heights: this.heights, hues: this.hues }
  }
}
