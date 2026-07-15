import * as THREE from 'three'

export class TerrainMesh {
  constructor(cols, rows, span) {
    this.cols = cols
    this.rows = rows
    this.span = span

    const geo = new THREE.BufferGeometry()
    const verts = []
    const idx = []
    const uvs = []
    const half = span / 2

    for (let iz = 0; iz < rows; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = (ix / (cols - 1)) * span - half
        const z = (iz / (rows - 1)) * span - half
        verts.push(x, 0, z)
        uvs.push(ix / (cols - 1), 1 - iz / (rows - 1))
      }
    }

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

  updateHeights(heights, cols, rows) {
    const pos = this.mesh.geometry.attributes.position
    const arr = pos.array
    for (let iz = 0; iz < rows; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const i = (iz * cols + ix) * 3
        arr[i + 1] = heights[iz * cols + ix] * 3
      }
    }
    pos.needsUpdate = true
    this.mesh.geometry.computeVertexNormals()
  }

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
      this.material.needsUpdate = true
    }
  }
}
