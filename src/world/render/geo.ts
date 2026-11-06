import { iso } from '../map'

export type P3 = [number, number, number]

/** 3D 점들 → SVG points 문자열 */
export function pts(list: P3[]): string {
  return list
    .map(([x, y, z]) => {
      const p = iso(x, y, z)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')
}

export function tileDiamond(x: number, y: number, z = 0, inset = 0): string {
  return pts([
    [x + inset, y + inset, z],
    [x + 1 - inset, y + inset, z],
    [x + 1 - inset, y + 1 - inset, z],
    [x + inset, y + 1 - inset, z],
  ])
}

/** 상자: 왼쪽 아래 면(y=y0+d), 오른쪽 아래 면(x=x0+w), 윗면 */
export function box(x0: number, y0: number, w: number, d: number, z0: number, h: number) {
  const z1 = z0 + h
  return {
    left: pts([
      [x0, y0 + d, z0],
      [x0 + w, y0 + d, z0],
      [x0 + w, y0 + d, z1],
      [x0, y0 + d, z1],
    ]),
    right: pts([
      [x0 + w, y0, z0],
      [x0 + w, y0 + d, z0],
      [x0 + w, y0 + d, z1],
      [x0 + w, y0, z1],
    ]),
    top: pts([
      [x0, y0, z1],
      [x0 + w, y0, z1],
      [x0 + w, y0 + d, z1],
      [x0, y0 + d, z1],
    ]),
  }
}

/** 면 위의 사각형 (창문·문): 왼쪽 면은 x 구간, 오른쪽 면은 y 구간 */
export function faceRect(side: 'y' | 'x', fixed: number, a: number, b: number, z0: number, z1: number): string {
  return side === 'y'
    ? pts([
        [a, fixed, z0],
        [b, fixed, z0],
        [b, fixed, z1],
        [a, fixed, z1],
      ])
    : pts([
        [fixed, a, z0],
        [fixed, b, z0],
        [fixed, b, z1],
        [fixed, a, z1],
      ])
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt))
  const b = Math.max(0, Math.min(255, (n & 255) + amt))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
