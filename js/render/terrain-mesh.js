// ============================================================
// terrain-mesh.js — Dynamic 3D terrain mesh
// ============================================================
// Builds a triangulated plane with cols×rows subdivisions,
// deformable in real time to reflect grid heights.
// Supports video texture from the webcam.

import * as THREE from 'three'

export class TerrainMesh {
  constructor(cols, rows, span) {
    this.cols = cols
    this.rows = rows
    this.span = span

    const geo = new THREE.BufferGeometry()
    const verts = []  // Vertex position array [x, y, z, x, y, z, ...]
    const idx = []    // Triangle index array
    const uvs = []    // UV texture coordinates
    const half = span / 2

    // ============================================================
    // Generates vertices in a cols×rows regular grid
    // Evenly spaced within [-half, +half]
    // ============================================================
    for (let iz = 0; iz < rows; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = (ix / (cols - 1)) * span - half
        const z = (iz / (rows - 1)) * span - half
        verts.push(x, 0, z)
        uvs.push(ix / (cols - 1), 1 - iz / (rows - 1))
      }
    }

    // ============================================================
    // Generates triangle indices (two triangles per cell)
    //   a---b
    //   |\  |
    //   | \ |
    //   c---d
    // ============================================================
    for (let iz = 0; iz < rows - 1; iz++) {
      for (let ix = 0; ix < cols - 1; ix++) {
        const a = iz * cols + ix
        const b = iz * cols + ix + 1
        const c = (iz + 1) * cols + ix
        const d = (iz + 1) * cols + ix + 1
        idx.push(a, b, c, b, d, c)
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(idx)
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.computeVertexNormals()

    // Standard material with slightly rough surface
    this.material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.1,
    })

    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.receiveShadow = true
    this.texture = null
  }

  // Deforms the mesh vertically based on height values
  updateHeights(heights, cols, rows) {
    const pos = this.mesh.geometry.attributes.position
    const arr = pos.array
    for (let iz = 0; iz < rows; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const i = (iz * cols + ix) * 3
        arr[i + 1] = heights[iz * cols + ix] * 3  // ×3 amplification
      }
    }
    pos.needsUpdate = true
    this.mesh.geometry.computeVertexNormals()  // Recalculates lighting
  }

  // Applies webcam video as texture on the material
  updateTexture(video) {
    if (!this.texture) {
      this.texture = new THREE.VideoTexture(video)
      this.texture.minFilter = THREE.LinearFilter
      this.texture.magFilter = THREE.LinearFilter
      this.texture.wrapS = THREE.ClampToEdgeWrapping
      this.texture.wrapT = THREE.ClampToEdgeWrapping
      this.texture.repeat.set(1, 1)
      this.texture.offset.set(0, 0)
      this.material.map = this.texture
      this.material.needsUpdate = true  // Forces material update
    }
  }
}
