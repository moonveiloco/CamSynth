# CamSynth

Wave-terrain synthesis powered by your webcam.

The webcam image is downsampled to 60x60 pixels. The luminance of each pixel defines the height of a 3D terrain (`luma → height`), while the hue modulates FM intensity locally — different colored areas produce different timbres.

## How it works

```
Webcam → downsample 60x60 → luma → height grid (Float32Array)
                          → hue  → local FM modulation
                                      │
              AudioWorklet samples the grid along a circular orbit
              with bilinear interpolation → audio output
```

- **Terrain**: a 60x60 height grid derived from webcam luminance
- **Orbit**: a circular path that samples the terrain at every audio sample
- **FM**: the hue at the sampled point modulates FM intensity for harmonic richness
- **Visualization**: 3D mesh textured with the live webcam feed in Three.js

## Usage

1. Serve with a local HTTP server (e.g. `python3 -m http.server` or `npx serve`)
2. Open in your browser
3. Click **START** and grant webcam permission
4. Adjust the parameters in the bottom bar

## Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| Frequency | 110 Hz | Base oscillator frequency |
| Radius | 2.0 | Orbit radius on the terrain |
| Y Scale | 1.0 | Terrain vertical amplification |
| FM Int | 0 | FM modulation intensity |
| FM Ratio | 2.0 | Modulator/carrier ratio |
| Hue Amount | 0.3 | How much hue influences FM |

## 3D Controls

- **Drag** with the mouse to rotate the view
- **Scroll** to zoom
- Auto-rotation is enabled by default

## Architecture

```
js/
  main.js               — entry point, lifecycle
  config.js             — shared configuration
  color-to-depth.js     — pixel → height/hue mapping
  grid.js               — webcam capture + downsample
  sampler.js            — bilinear interpolation (shared)
  engine.js             — AudioContext + signal chain
  terrain-processor.js  — AudioWorkletProcessor (DSP)
  render/
    scene.js            — Three.js scene + orbit controls
    terrain-mesh.js     — dynamic terrain mesh
```

## Dependencies

- [Three.js](https://threejs.org/) (loaded via CDN)
- Web Audio API (AudioWorklet)
- WebRTC (getUserMedia)

No build tools required — native modular JavaScript.
