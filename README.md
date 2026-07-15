# CamSynth

WaveTerrain synthesis alimentato dalla webcam.

L'immagine della webcam viene downsamizzata a 32×24 pixel. La luminanza di ogni pixel definisce l'altezza del terreno 3D (`luma → height`), mentre la tinta (hue) modula l'intensità FM localmente — aree di colore diverso producono timbri diversi.

## Come funziona

```
Webcam → downsample 32×24 → luma → height grid (Float32Array)
                           → hue  → modulazione FM locale
                                       │
               AudioWorklet campiona il grid lungo un'orbita circolare
               con interpolazione bilineare → output audio
```

- **Terrain**: una griglia 32×24 di altezze ricavate dalla luminanza della webcam
- **Orbit**: un percorso circolare che campiona il terrain a ogni sample audio
- **FM**: la tinta del punto campionato modula l'intensità FM per ricchezza armonica
- **Visualizzazione**: mesh 3D texturizzata col frame webcam in Three.js

## Uso

1. Servire con un server HTTP locale (es. `python3 -m http.server` o `npx serve`)
2. Aprire nel browser
3. Cliccare **START** e concedere il permesso alla webcam
4. Muovere i parametri nella barra in basso

## Parametri

| Parametro | Default | Effetto |
|-----------|---------|---------|
| Frequency | 110 Hz | Frequenza base dell'oscillatore |
| Radius | 2.0 | Raggio dell'orbita sul terrain |
| Y Scale | 1.0 | Amplificazione verticale del terrain |
| FM Int | 0 | Intensità della modulazione FM |
| FM Ratio | 2.0 | Rapporto modulatore/portante |
| Hue Amount | 0.3 | Quanto la tinta influenza la FM |

## Controlli 3D

- **Trascinare** con il mouse per ruotare la visuale
- **Scroll** per zoomare
- L'auto-rotazione è attiva di default

## Architettura

```
js/
  main.js               — entry point, lifecycle
  config.js             — configurazione condivisa
  color-to-depth.js     — mapping pixel → altezza/hue
  grid.js               — cattura webcam + downsample
  sampler.js            — interpolazione bilineare (condiviso)
  engine.js             — AudioContext + signal chain
  terrain-processor.js  — AudioWorkletProcessor (DSP)
  render/
    scene.js            — scena Three.js + orbit controls
    terrain-mesh.js     — mesh dinamica del terrain
```

## Dipendenze

- [Three.js](https://threejs.org/) (caricato via CDN)
- Web Audio API (AudioWorklet)
- WebRTC (getUserMedia)

Nessun build tool necessario — JavaScript modulare nativo.
