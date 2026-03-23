/**
 * Point-in-polygon test using ray casting algorithm.
 * Polygon vertices are [x, y] in normalized [0, 1] coordinates.
 */
export function pointInPolygon(
  px: number,
  py: number,
  polygon: [number, number][]
): boolean {
  let inside = false
  const n = polygon.length
  let j = n - 1
  for (let i = 0; i < n; i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
    j = i
  }
  return inside
}

/**
 * Given normalized coordinates and a map's site polygon definitions,
 * returns the site key ('A', 'B', 'C') or null if outside all polygons.
 */
export function detectSite(
  x: number,
  y: number,
  polygons: Record<string, [number, number][]>
): string | null {
  for (const [site, poly] of Object.entries(polygons)) {
    if (pointInPolygon(x, y, poly)) return site
  }
  return null
}
