import { memo, type ReactElement } from 'react'
import { BUILDINGS, DECOS, GROUND, MAP_H, MAP_W, PLOTS, RIVAL_LOTS, iso, type Ground as G } from '../map'
import { hash, rng } from '@/lib/rng'

/** 3D → "x,y" */
function P(x: number, y: number, z = 0): string {
  const p = iso(x, y, z)
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
}
function poly(list: [number, number, number?][]): string {
  return list.map(([x, y, z]) => P(x, y, z ?? 0)).join(' ')
}
function diamond(x0: number, y0: number, x1: number, y1: number, z = 0): string {
  return poly([
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
  ])
}

const GRASS = '#86CE5A'
const at = (x: number, y: number): G | null => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? null : GROUND[y][x])
const PADDY = new Set(PLOTS.filter((p) => p.kind === 'paddy').map((p) => `${p.x},${p.y}`))
const isPaddy = (x: number, y: number) => PADDY.has(`${x},${y}`)
const WATER_LEVEL = -20

/* ───────── 바다 · 얕은 물 · 파도 ───────── */
function Sea() {
  const r = rng(hash('waves'))
  const waves: ReactElement[] = []
  for (let i = 0; i < 46; i++) {
    // 섬 둘레 바깥쪽에만
    const side = i % 4
    const t = r()
    const off = 1.2 + r() * 5
    const [x, y] =
      side === 0 ? [t * MAP_W, MAP_H + off] : side === 1 ? [MAP_W + off, t * MAP_H] : side === 2 ? [t * MAP_W, -off] : [-off, t * MAP_H]
    const p = iso(x, y, WATER_LEVEL)
    const w = 8 + r() * 10
    waves.push(
      <path
        key={i}
        className="wave-drift"
        style={{ animationDelay: `${(r() * 4).toFixed(2)}s` }}
        d={`M${(p.x - w).toFixed(1)} ${p.y.toFixed(1)} q${(w / 2).toFixed(1)} -4 ${w.toFixed(1)} 0 q${(w / 2).toFixed(1)} 4 ${w.toFixed(1)} 0`}
        stroke="#FFFFFF"
        strokeOpacity={0.55}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />,
    )
  }
  // 바다 반짝임
  for (let i = 0; i < 22; i++) {
    const side = i % 4
    const t = r()
    const off = 0.8 + r() * 6
    const [x, y] = side === 0 ? [t * MAP_W, MAP_H + off] : side === 1 ? [MAP_W + off, t * MAP_H] : side === 2 ? [t * MAP_W, -off] : [-off, t * MAP_H]
    const p = iso(x, y, WATER_LEVEL)
    const k = 2.2 + r() * 1.6
    const n = (v: number) => v.toFixed(2)
    waves.push(
      <path
        key={`sp${i}`}
        className="twinkle"
        style={{ animationDelay: `${n(r() * 2.6)}s`, animationDuration: `${n(2 + r() * 2)}s` }}
        d={`M${n(p.x)} ${n(p.y - k * 2)} l${n(k * 0.45)} ${n(k * 1.55)} l${n(k * 1.55)} ${n(k * 0.45)} l${n(-k * 1.55)} ${n(k * 0.45)} l${n(-k * 0.45)} ${n(k * 1.55)} l${n(-k * 0.45)} ${n(-k * 1.55)} l${n(-k * 1.55)} ${n(-k * 0.45)} l${n(k * 1.55)} ${n(-k * 0.45)} z`}
        fill="#FFFFFF"
      />,
    )
  }
  const ring = (pad: number) =>
    poly([
      [-pad, -pad, WATER_LEVEL],
      [MAP_W + pad, -pad, WATER_LEVEL],
      [MAP_W + pad, MAP_H + pad, WATER_LEVEL],
      [-pad, MAP_H + pad, WATER_LEVEL],
    ])
  return (
    <g>
      <polygon points={ring(2.6)} fill="#B8ECFA" opacity={0.18} />
      <polygon points={ring(1.8)} fill="#B8ECFA" opacity={0.25} />
      <polygon points={ring(0.9)} fill="#C9F3FC" opacity={0.5} />
      {waves}
    </g>
  )
}

/* ───────── 섬 앞쪽 절벽 (잔디 턱 + 흙 단면 + 물거품) ───────── */
function Cliffs() {
  const faces: ReactElement[] = []
  const depthAt = (k: number) => -(18 + (hash(`cliff${k}`) % 5))
  // 왼쪽 아래 면 (y = MAP_H)
  for (let x = 0; x < MAP_W; x++) {
    const y = MAP_H
    const d0 = depthAt(x)
    const d1 = depthAt(x + 1)
    const h = hash(`cl${x}`)
    faces.push(
      <g key={`l${x}`}>
        <polygon points={poly([[x, y, 0], [x + 1, y, 0], [x + 1, y, d1], [x, y, d0]])} fill={x % 2 ? '#B27A4E' : '#AC7449'} />
        <polygon points={poly([[x, y, 0], [x + 1, y, 0], [x + 1, y, d1], [x, y, d0]])} fill="url(#m-cliff)" />
        <polyline points={poly([[x + 0.08, y, -10], [x + 0.55, y, -9.5], [x + 0.95, y, -10.5]])} stroke="#8E5A36" strokeWidth={1.3} fill="none" opacity={0.7} />
        {h % 3 === 0 && <ellipse cx={iso(x + 0.4, y, -14).x} cy={iso(x + 0.4, y, -14).y} rx={4.5} ry={2.6} fill="#C9BBA6" stroke="#8C7A63" strokeWidth={0.7} />}
        {h % 4 === 1 && <path d={`M${iso(x + 0.7, y, -5).x} ${iso(x + 0.7, y, -5).y} q2 5 -1 9`} stroke="#6E4A2C" strokeWidth={1.2} fill="none" />}
      </g>,
    )
  }
  // 오른쪽 아래 면 (x = MAP_W)
  for (let y = 0; y < MAP_H; y++) {
    const x = MAP_W
    const d0 = depthAt(100 + y)
    const d1 = depthAt(101 + y)
    const h = hash(`cr${y}`)
    faces.push(
      <g key={`r${y}`}>
        <polygon points={poly([[x, y, 0], [x, y + 1, 0], [x, y + 1, d1], [x, y, d0]])} fill={y % 2 ? '#8F5C39' : '#946040'} />
        <polygon points={poly([[x, y, 0], [x, y + 1, 0], [x, y + 1, d1], [x, y, d0]])} fill="url(#m-cliff)" />
        <polyline points={poly([[x, y + 0.08, -11], [x, y + 0.5, -10.5], [x, y + 0.95, -11.5]])} stroke="#6E4127" strokeWidth={1.3} fill="none" opacity={0.7} />
        {h % 3 === 1 && <ellipse cx={iso(x, y + 0.5, -15).x} cy={iso(x, y + 0.5, -15).y} rx={4.5} ry={2.6} fill="#B5A790" stroke="#7D6C57" strokeWidth={0.7} />}
      </g>,
    )
  }
  // 잔디 턱 — 물결 모양으로 살짝 흘러내림
  const lip = (pts: [number, number][], color: string) => {
    let d = `M${P(pts[0][0], pts[0][1], 0)}`
    for (let i = 1; i < pts.length; i++) d += ` L${P(pts[i][0], pts[i][1], 0)}`
    for (let i = pts.length - 1; i > 0; i--) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i - 1]
      const m = iso((ax + bx) / 2, (ay + by) / 2, -9 - (hash(`lip${ax},${ay}`) % 3))
      const e = iso(bx, by, -5)
      d += ` Q${m.x.toFixed(1)} ${m.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`
    }
    return <path d={`${d} Z`} fill={color} />
  }
  const left: [number, number][] = []
  for (let x = 0; x <= MAP_W; x += 0.5) left.push([x, MAP_H])
  const right: [number, number][] = []
  for (let y = 0; y <= MAP_H; y += 0.5) right.push([MAP_W, y])
  // 물 닿는 곳 거품
  const foamL = Array.from({ length: MAP_W + 1 }, (_, x) => P(x, MAP_H, depthAt(x))).join(' ')
  const foamR = Array.from({ length: MAP_H + 1 }, (_, y) => P(MAP_W, y, depthAt(100 + y))).join(' ')
  return (
    <g>
      {faces}
      {lip(left, '#6FBA49')}
      {lip(right, '#5CA43E')}
      <polyline points={foamL} fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeOpacity={0.75} strokeLinecap="round" className="foam" />
      <polyline points={foamR} fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeOpacity={0.75} strokeLinecap="round" className="foam" />
    </g>
  )
}

/* ───────── 타일 재질 ───────── */
const STONE = ['#E9D9B7', '#E2D0AB', '#EDE0C2', '#DDC9A2']
const PLAZA_STONE = ['#F4EAD3', '#EEE2C7', '#F7EFDC']

function TileArt({ x, y, t }: { x: number; y: number; t: G }) {
  const h = hash(`${x},${y}`)
  const c = iso(x + 0.5, y + 0.5)
  const out: ReactElement[] = []
  switch (t) {
    case 'road': {
      out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#CDB68D" />)
      for (const [qx, qy] of [
        [0, 0],
        [0.5, 0],
        [0, 0.5],
        [0.5, 0.5],
      ]) {
        const g = 0.035
        const k = (h >>> (qx * 4 + qy * 8)) % STONE.length
        const x0 = x + qx + g
        const y0 = y + qy + g
        const x1 = x + qx + 0.5 - g
        const y1 = y + qy + 0.5 - g
        out.push(<polygon key={`s${qx}${qy}`} points={diamond(x0, y0, x1, y1)} fill={STONE[k]} />)
        out.push(<polyline key={`h${qx}${qy}`} points={poly([[x0, y1], [x0, y0], [x1, y0]])} fill="none" stroke="#FBF3E0" strokeWidth={0.9} />)
      }
      break
    }
    case 'plaza': {
      out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#DCCBA8" />)
      const g = 0.03
      for (const [qx, qy] of [
        [0, 0],
        [0.5, 0],
        [0, 0.5],
        [0.5, 0.5],
      ]) {
        const k = (h >>> (qx * 2 + qy * 4 + 1)) % PLAZA_STONE.length
        out.push(<polygon key={`s${qx}${qy}`} points={diamond(x + qx + g, y + qy + g, x + qx + 0.5 - g, y + qy + 0.5 - g)} fill={PLAZA_STONE[k]} />)
      }
      if (x === 12 && y === 9) {
        out.push(<polygon key="r1" points={diamond(x + 0.12, y + 0.12, x + 0.88, y + 0.88)} fill="none" stroke="#C9A56B" strokeWidth={2} />)
        out.push(<polygon key="r2" points={diamond(x + 0.3, y + 0.3, x + 0.7, y + 0.7)} fill="#E8C98E" stroke="#C9A56B" strokeWidth={1.4} />)
      }
      break
    }
    case 'path': {
      out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#E8D19C" />)
      out.push(<ellipse key="d" cx={c.x + ((h % 13) - 6)} cy={c.y + ((h % 7) - 3)} rx={22} ry={11} fill="url(#m-dirt)" />)
      for (let i = 0; i < 3; i++) {
        const hx = ((h >>> (i * 3)) % 9) - 4
        const hy = ((h >>> (i * 3 + 2)) % 5) - 2
        if ((h >>> i) % 2) out.push(<ellipse key={`p${i}`} cx={c.x + hx * 3} cy={c.y + hy * 2.4} rx={2.2} ry={1.3} fill="#CDB07A" />)
      }
      break
    }
    case 'sand': {
      out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#F4E3B2" />)
      for (let i = 0; i < 4; i++) out.push(<circle key={i} cx={c.x + (((h >>> i) % 21) - 10)} cy={c.y + (((h >>> (i + 3)) % 9) - 4)} r={0.9} fill="#D8C08A" />)
      break
    }
    case 'soil': {
      out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#7A4B2D" />)
      out.push(<polygon key="i" points={diamond(x + 0.07, y + 0.07, x + 0.93, y + 0.93, 1.5)} fill="#99633D" />)
      for (const k of [0.27, 0.5, 0.73]) {
        out.push(<polyline key={`f${k}`} points={poly([[x + 0.14, y + k, 1.5], [x + 0.86, y + k, 1.5]])} stroke="#6A3F25" strokeWidth={2.6} strokeLinecap="round" />)
        out.push(<polyline key={`g${k}`} points={poly([[x + 0.14, y + k - 0.07, 2.4], [x + 0.86, y + k - 0.07, 2.4]])} stroke="#B67D50" strokeWidth={1.1} strokeLinecap="round" />)
      }
      break
    }
    case 'water': {
      if (isPaddy(x, y)) {
        out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#9A7046" />)
        out.push(<polygon key="i" points={diamond(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0)} fill="url(#m-paddy)" />)
        out.push(<polyline key="h" points={poly([[x + 0.08, y + 0.92], [x + 0.08, y + 0.08], [x + 0.92, y + 0.08]])} stroke="#6E4E2E" strokeWidth={1.2} fill="none" />)
        out.push(<path key="w" className="water-shimmer" d={`M${c.x - 9} ${c.y + 1} q4 -2 8 0`} stroke="#E4F6D2" strokeWidth={1.3} fill="none" strokeLinecap="round" />)
      } else {
        out.push(<polygon key="b" points={diamond(x, y, x + 1, y + 1)} fill="#57BEEC" />)
        if (h % 2 === 0)
          out.push(
            <path key="w" className="water-shimmer" style={{ animationDelay: `${(h % 9) * 0.3}s` }} d={`M${c.x - 10} ${c.y - 1} q5 -3 10 0 M${c.x + 2} ${c.y + 5} q4 -2 8 0`} stroke="#D9F6FF" strokeWidth={1.4} fill="none" strokeLinecap="round" />,
          )
        else
          out.push(
            <path key="sp" className="twinkle" style={{ animationDelay: `${(h % 7) * 0.45}s` }} d={`M${c.x + 3} ${c.y - 4} l1.1 2.6 l2.6 1.1 l-2.6 1.1 l-1.1 2.6 l-1.1 -2.6 l-2.6 -1.1 l2.6 -1.1 z`} fill="#FFFFFF" />,
          )
      }
      break
    }
    default:
      break
  }
  return <g>{out}</g>
}

/* ───────── 잔디 위 얼룩·풀포기·작은 꽃 ───────── */
function GrassDetail({ x, y }: { x: number; y: number }) {
  const h = hash(`g${x},${y}`)
  const c = iso(x + 0.5, y + 0.5)
  const out: ReactElement[] = []
  if (h % 3 === 0) out.push(<ellipse key="l" cx={c.x + (h % 11) - 5} cy={c.y + (h % 5) - 2} rx={36} ry={18} fill="url(#m-soft)" />)
  if (h % 4 === 1) out.push(<ellipse key="d" cx={c.x + (h % 9) - 4} cy={c.y + (h % 7) - 3} rx={30} ry={15} fill="url(#m-dark)" />)
  const tufts = (h >>> 3) % 3
  for (let i = 0; i < tufts; i++) {
    const tx = c.x + (((h >>> (i * 4 + 2)) % 25) - 12)
    const ty = c.y + (((h >>> (i * 4 + 5)) % 11) - 5)
    out.push(<path key={`t${i}`} d={`M${tx - 3} ${ty} q0.5 -4 -1 -6 M${tx} ${ty} q0 -5 1 -7 M${tx + 3} ${ty} q0 -3 2 -5`} stroke={i % 2 ? '#62AE40' : '#5AA43A'} strokeWidth={1.3} strokeLinecap="round" fill="none" />)
  }
  if (h % 5 === 2) {
    const tx = c.x + ((h % 17) - 8)
    const ty = c.y + ((h % 7) - 3)
    out.push(<path key="lt" d={`M${tx - 2} ${ty} q0 -4 -1 -5 M${tx + 1} ${ty} q0 -4 1 -6`} stroke="#B4E68B" strokeWidth={1.2} strokeLinecap="round" fill="none" />)
  }
  if (h % 13 === 4) {
    const cols = ['#FFFFFF', '#FFE27A', '#FFB3D1']
    for (let i = 0; i < 3; i++) out.push(<circle key={`f${i}`} cx={c.x - 6 + i * 6} cy={c.y + ((i * 7) % 5) - 2} r={1.6} fill={cols[(h + i) % 3]} />)
  }
  return <g>{out}</g>
}

/* ───────── 경계: 길 가장자리 잔디 턱, 물가 ───────── */
function Edges() {
  const out: ReactElement[] = []
  const dirs = [
    { dx: 0, dy: -1, a: [0, 0], b: [1, 0], n: [0, 1] },
    { dx: 0, dy: 1, a: [0, 1], b: [1, 1], n: [0, -1] },
    { dx: -1, dy: 0, a: [0, 0], b: [0, 1], n: [1, 0] },
    { dx: 1, dy: 0, a: [1, 0], b: [1, 1], n: [-1, 0] },
  ] as const
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const t = GROUND[y][x]
      if (t === 'grass') continue
      dirs.forEach((d, i) => {
        const nb = at(x + d.dx, y + d.dy)
        if (nb === null) return
        const ax = x + d.a[0]
        const ay = y + d.a[1]
        const bx = x + d.b[0]
        const by = y + d.b[1]
        const key = `${x},${y},${i}`
        if (t === 'water' && !isPaddy(x, y)) {
          if (nb === 'water') return
          const k = 0.1
          out.push(<polyline key={`ws${key}`} points={poly([[ax + d.n[0] * k, ay + d.n[1] * k], [bx + d.n[0] * k, by + d.n[1] * k]])} stroke="#A9E9FB" strokeWidth={6} strokeLinecap="round" opacity={0.85} />)
          out.push(<polyline key={`wf${key}`} className="foam" points={poly([[ax + d.n[0] * 0.2, ay + d.n[1] * 0.2], [bx + d.n[0] * 0.2, by + d.n[1] * 0.2]])} stroke="#FFFFFF" strokeWidth={1.4} strokeOpacity={0.7} strokeDasharray="5 4" strokeLinecap="round" />)
          out.push(<polyline key={`wb${key}`} points={poly([[ax, ay], [bx, by]])} stroke={nb === 'sand' ? '#E6CF96' : '#6FB548'} strokeWidth={2.6} strokeLinecap="round" />)
          return
        }
        if (nb !== 'grass') return
        const k = 0.07
        // 안쪽 그늘
        out.push(<polyline key={`sh${key}`} points={poly([[ax + d.n[0] * k, ay + d.n[1] * k], [bx + d.n[0] * k, by + d.n[1] * k]])} stroke="#5A3E18" strokeOpacity={0.13} strokeWidth={3} strokeLinecap="round" />)
        // 잔디 턱
        out.push(<polyline key={`gl${key}`} points={poly([[ax, ay], [bx, by]])} stroke={GRASS} strokeWidth={3.4} strokeLinecap="round" />)
        const h = hash(key)
        if (h % 2 === 0) {
          const f = 0.25 + (h % 50) / 100
          const p = iso(ax + (bx - ax) * f, ay + (by - ay) * f)
          out.push(<path key={`tf${key}`} d={`M${p.x - 2.5} ${p.y + 0.5} q0 -4 -1 -5 M${p.x} ${p.y + 0.5} q0 -5 1 -6 M${p.x + 2.5} ${p.y + 0.5} q0 -3 2 -4`} stroke="#5FAA3E" strokeWidth={1.2} strokeLinecap="round" fill="none" />)
        }
      })
    }
  return <g>{out}</g>
}

/* ───────── 그림자 (해: 왼쪽 위 → 그림자는 오른쪽 아래) ───────── */
function Shadows() {
  const out: ReactElement[] = []
  const hex = (x0: number, y0: number, w: number, d: number, L: number) => {
    const a = L
    const b = L * 0.28
    const x1 = x0 + w
    const y1 = y0 + d
    return poly([
      [x0, y0],
      [x1, y0],
      [x1 + a, y0 + b],
      [x1 + a, y1 + b],
      [x0 + a, y1 + b],
      [x0, y1],
    ])
  }
  const H: Record<string, number> = { shop: 1.25, workshop: 1.05, market: 0.95, academy: 1.6, support: 1.0, company: 2.6, board: 0.45 }
  for (const b of BUILDINGS) if (H[b.id]) out.push(<polygon key={b.id} points={hex(b.x - 0.05, b.y - 0.05, b.w + 0.1, b.d + 0.1, H[b.id])} />)
  for (const r of RIVAL_LOTS) out.push(<polygon key={`r${r.index}`} points={hex(r.x - 0.05, r.y - 0.05, 2.1, 2.1, 0.95)} />)
  for (const d of DECOS) {
    const c = iso(d.x + 0.62, d.y + 0.52)
    const size: Partial<Record<string, [number, number]>> = { tree: [22, 10], pine: [17, 8], bush: [14, 6.5], lamp: [7, 3], well: [15, 7], cart: [15, 7], bench: [13, 6], rock: [12, 5.5] }
    const s = size[d.kind]
    if (s) out.push(<ellipse key={`${d.kind}${d.x},${d.y}`} cx={c.x + (d.kind === 'tree' || d.kind === 'pine' ? 8 : 3)} cy={c.y + 1} rx={s[0]} ry={s[1]} />)
  }
  return (
    <g fill="#1E3A10" opacity={0.22}>
      {out}
    </g>
  )
}

export const GroundLayer = memo(function GroundLayer() {
  const tiles: ReactElement[] = []
  const grass: ReactElement[] = []
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const t = GROUND[y][x]
      if (t === 'grass') grass.push(<GrassDetail key={`g${x},${y}`} x={x} y={y} />)
      else tiles.push(<TileArt key={`${x},${y}`} x={x} y={y} t={t} />)
    }
  const island = diamond(0, 0, MAP_W, MAP_H)
  return (
    <g>
      <Sea />
      <Cliffs />
      <polygon points={island} fill={GRASS} />
      {grass}
      {tiles}
      <Edges />
      <polygon points={island} fill="url(#m-island-light)" />
      <Shadows />
    </g>
  )
})
