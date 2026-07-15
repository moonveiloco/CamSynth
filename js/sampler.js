export function bilinearInterp(grid, cols, rows, gx, gy) {
  const ix = Math.max(0, Math.min(cols - 1, gx))
  const iy = Math.max(0, Math.min(rows - 1, gy))
  const x0 = Math.floor(ix)
  const y0 = Math.floor(iy)
  const x1 = Math.min(x0 + 1, cols - 1)
  const y1 = Math.min(y0 + 1, rows - 1)
  const fx = ix - x0
  const fy = iy - y0

  const h00 = grid[y0 * cols + x0]
  const h10 = grid[y0 * cols + x1]
  const h01 = grid[y1 * cols + x0]
  const h11 = grid[y1 * cols + x1]

  return h00 * (1 - fx) * (1 - fy) +
         h10 * fx * (1 - fy) +
         h01 * (1 - fx) * fy +
         h11 * fx * fy
}
