export class Waveform2D {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.dpr = Math.min(window.devicePixelRatio, 2)
    this.segments = 64
    this.bgColor = 'rgba(10,10,18,0.8)'
    this.waveColor = '#00ffff'
    this.cursorColor = '#ff4466'
    this.centerColor = 'rgba(255,255,255,0.08)'
    this.resize()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.ctx.scale(this.dpr, this.dpr)
    this.width = w
    this.height = h
  }

  update(ringHeights, cursorIndex) {
    const ctx = this.ctx
    const w = this.width
    const h = this.height
    const pad = 12

    ctx.clearRect(0, 0, w, h)

    const left = pad
    const right = w - pad
    const top = pad
    const bottom = h - pad
    const plotW = right - left
    const plotH = bottom - top
    const midY = (top + bottom) / 2

    ctx.strokeStyle = this.centerColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left, midY)
    ctx.lineTo(right, midY)
    ctx.stroke()

    if (!ringHeights || ringHeights.length < 2) return

    let minH = Infinity
    let maxH = -Infinity
    for (let i = 0; i < this.segments; i++) {
      const v = ringHeights[i]
      if (v < minH) minH = v
      if (v > maxH) maxH = v
    }
    const range = maxH - minH || 1

    ctx.strokeStyle = this.waveColor
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    for (let i = 0; i < this.segments; i++) {
      const x = left + (i / (this.segments - 1)) * plotW
      const norm = (ringHeights[i] - minH) / range
      const y = bottom - norm * plotH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1

    if (cursorIndex >= 0 && cursorIndex < this.segments) {
      const cx = left + (cursorIndex / (this.segments - 1)) * plotW
      const norm = (ringHeights[cursorIndex] - minH) / range
      const cy = bottom - norm * plotH

      ctx.fillStyle = this.cursorColor
      ctx.shadowColor = this.cursorColor
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }
}
