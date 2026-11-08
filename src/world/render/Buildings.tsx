import { createContext, memo, useContext, type ReactElement, type ReactNode } from 'react'
import { iso } from '../map'
import { box, pts, shade, type P3 } from './geo'
import { hash } from '@/lib/rng'

const INK = '#4A3426'

type Side = 'x' | 'y'
/** 면 위의 점: 'y' 면(왼쪽 아래, y 고정)은 u가 x, 'x' 면(오른쪽 아래, x 고정)은 u가 y */
const fp = (side: Side, fixed: number, u: number, z: number): P3 => (side === 'y' ? [u, fixed, z] : [fixed, u, z])
const fr = (side: Side, fixed: number, a: number, b: number, z0: number, z1: number) => pts([fp(side, fixed, a, z0), fp(side, fixed, b, z0), fp(side, fixed, b, z1), fp(side, fixed, a, z1)])
const fl = (side: Side, fixed: number, list: [number, number][]) => pts(list.map(([u, z]) => fp(side, fixed, u, z)))

/* ───────── 부품 ───────── */

/** 밤이면 창문마다 불이 켜져요 */
export const NightCtx = createContext(false)

function Window({ side, fixed, c, half, z0, z1, glow: lit, flowers }: { side: Side; fixed: number; c: number; half: number; z0: number; z1: number; glow?: boolean; flowers?: string }) {
  const night = useContext(NightCtx)
  const glow = lit || night
  const a = c - half
  const b = c + half
  const f = 0.05
  const zm = (z0 + z1) / 2
  const mid = iso(...fp(side, fixed, c, zm))
  return (
    <g>
      {night && <ellipse className="glow-pulse" cx={mid.x} cy={mid.y + 4} rx={22} ry={16} fill="url(#m-glow)" />}
      <polygon points={fr(side, fixed, a - f, b + f, z0 - 2, z1 + 2)} fill="#FFFDF6" stroke={INK} strokeWidth={0.8} strokeOpacity={0.8} />
      <polygon points={fr(side, fixed, a, b, z0, z1)} fill={glow ? 'url(#m-glass-night)' : 'url(#m-glass)'} />
      <polygon points={fr(side, fixed, a, a + (b - a) * 0.42, zm, z1)} fill="#FFFFFF" opacity={glow ? 0.18 : 0.38} />
      <polyline points={fl(side, fixed, [[c, z0], [c, z1]])} stroke="#FFFDF6" strokeWidth={1.4} />
      <polyline points={fl(side, fixed, [[a, zm], [b, zm]])} stroke="#FFFDF6" strokeWidth={1.2} />
      <polygon points={fr(side, fixed, a - f * 1.8, b + f * 1.8, z0 - 4.5, z0 - 2)} fill="#E8DCC6" stroke={INK} strokeWidth={0.6} strokeOpacity={0.7} />
      {flowers &&
        [0.2, 0.5, 0.8].map((k) => {
          const p = iso(...fp(side, fixed, a + (b - a) * k, z0 - 1))
          return <circle key={k} cx={p.x} cy={p.y} r={2.3} fill={k === 0.5 ? flowers : '#5DB548'} />
        })}
    </g>
  )
}

function Door({ side, fixed, c, half, h, color, glass }: { side: Side; fixed: number; c: number; half: number; h: number; color: string; glass?: boolean }) {
  const a = c - half
  const b = c + half
  const knob = iso(...fp(side, fixed, b - (b - a) * 0.2, h * 0.45))
  return (
    <g>
      <polygon points={fr(side, fixed, a - 0.05, b + 0.05, 0, h + 2.5)} fill="#FFFDF6" stroke={INK} strokeWidth={0.8} strokeOpacity={0.8} />
      <polygon points={fr(side, fixed, a, b, 0, h)} fill={color} />
      <polygon points={fr(side, fixed, a, b, 0, h)} fill="url(#m-wood)" />
      {glass ? (
        <>
          <polygon points={fr(side, fixed, a + 0.05, b - 0.05, h * 0.2, h * 0.9)} fill="url(#m-glass)" />
          <polyline points={fl(side, fixed, [[c, 0], [c, h]])} stroke={shade(color, -30)} strokeWidth={1.4} />
        </>
      ) : (
        <>
          <polygon points={fr(side, fixed, a + 0.06, b - 0.06, h * 0.62, h * 0.88)} fill="url(#m-glass)" />
          <polygon points={fr(side, fixed, a + 0.07, b - 0.07, h * 0.12, h * 0.48)} fill="none" stroke={shade(color, -28)} strokeWidth={0.9} />
        </>
      )}
      <circle cx={knob.x} cy={knob.y} r={1.5} fill="#F2C94C" stroke={INK} strokeWidth={0.5} />
    </g>
  )
}

function Step({ side, fixed, c, half }: { side: Side; fixed: number; c: number; half: number }) {
  const b = side === 'y' ? box(c - half - 0.06, fixed, half * 2 + 0.12, 0.16, 0, 2.5) : box(fixed, c - half - 0.06, 0.16, half * 2 + 0.12, 0, 2.5)
  return (
    <g>
      <polygon points={b.left} fill="#B8AE9E" />
      <polygon points={b.right} fill="#9D9383" />
      <polygon points={b.top} fill="#D9D1C3" />
    </g>
  )
}

/* ───────── 기본 집 ───────── */
interface HouseProps {
  x: number
  y: number
  w: number
  d: number
  h: number
  wallL: string
  wallR: string
  roof: string
  ridge?: 'x' | 'y' | 'flat'
  roofH?: number
  doorSide: Side
  door?: string
  windows?: number
  windowGlow?: boolean
  awning?: string
  siding?: 'plank' | 'brick' | 'plain'
  flowers?: string
  glassDoor?: boolean
  children?: ReactNode
}

export function House({ x, y, w, d, h, wallL, wallR, roof, ridge = 'x', roofH = 22, doorSide, door = '#8A5A3B', windows = 2, windowGlow, awning, siding = 'plank', flowers, glassDoor, children }: HouseProps) {
  const faceY = y + d
  const faceX = x + w
  const base = 5
  const walls = box(x, y, w, d, 0, h)
  const found = box(x - 0.04, y - 0.04, w + 0.08, d + 0.08, 0, base)

  // 외벽 질감
  const texture: ReactElement[] = []
  if (siding === 'plank')
    for (let z = base + 6; z < h - 4; z += 6.5) {
      texture.push(<polyline key={`pl${z}`} points={pts([[x, faceY, z], [faceX, faceY, z]])} stroke={shade(wallL, -16)} strokeWidth={0.7} />)
      texture.push(<polyline key={`pr${z}`} points={pts([[faceX, y, z], [faceX, faceY, z]])} stroke={shade(wallR, -16)} strokeWidth={0.7} />)
    }
  if (siding === 'brick')
    for (let z = base + 5, row = 0; z < h - 3; z += 5, row++) {
      texture.push(<polyline key={`bl${z}`} points={pts([[x, faceY, z], [faceX, faceY, z]])} stroke={shade(wallL, -22)} strokeWidth={0.6} />)
      texture.push(<polyline key={`br${z}`} points={pts([[faceX, y, z], [faceX, faceY, z]])} stroke={shade(wallR, -22)} strokeWidth={0.6} />)
      for (let u = (row % 2) * 0.17; u < w; u += 0.34) texture.push(<polyline key={`bv${z}-${u}`} points={pts([[x + u, faceY, z], [x + u, faceY, z + 5]])} stroke={shade(wallL, -22)} strokeWidth={0.6} />)
      for (let u = (row % 2) * 0.17; u < d; u += 0.34) texture.push(<polyline key={`bw${z}-${u}`} points={pts([[faceX, y + u, z], [faceX, y + u, z + 5]])} stroke={shade(wallR, -22)} strokeWidth={0.6} />)
    }

  // 창문: 문 없는 면에 고르게, 문 있는 면은 문 양옆
  const wins: ReactElement[] = []
  const z0 = h * 0.38
  const z1 = h * 0.72
  const other: Side = doorSide === 'y' ? 'x' : 'y'
  const otherLen = other === 'x' ? d : w
  const otherStart = other === 'x' ? y : x
  const otherFixed = other === 'x' ? faceX : faceY
  for (let i = 0; i < windows; i++) {
    const t = (i + 1) / (windows + 1)
    wins.push(<Window key={`o${i}`} side={other} fixed={otherFixed} c={otherStart + otherLen * t} half={Math.min(0.24, otherLen / (windows * 2.6))} z0={z0} z1={z1} glow={windowGlow} flowers={flowers} />)
  }
  const doorLen = doorSide === 'y' ? w : d
  const doorStart = doorSide === 'y' ? x : y
  const doorFixed = doorSide === 'y' ? faceY : faceX
  if (doorLen >= 2)
    [doorStart + 0.45, doorStart + doorLen - 0.45].forEach((c, i) => wins.push(<Window key={`d${i}`} side={doorSide} fixed={doorFixed} c={c} half={0.19} z0={h * 0.36} z1={h * 0.68} glow={windowGlow} />))

  const doorC = doorStart + doorLen / 2
  const doorH = Math.min(h * 0.62, 30)

  // 지붕
  const o = 0.16
  const H = h
  const rdark = shade(roof, -48)
  let roofEl: ReactElement
  if (ridge === 'flat') {
    const top = box(x - 0.06, y - 0.06, w + 0.12, d + 0.12, h, 6)
    const deck = pts([
      [x + 0.12, y + 0.12, h + 6],
      [x + w - 0.12, y + 0.12, h + 6],
      [x + w - 0.12, y + d - 0.12, h + 6],
      [x + 0.12, y + d - 0.12, h + 6],
    ])
    roofEl = (
      <g>
        <polygon points={top.left} fill={shade(roof, -18)} />
        <polygon points={top.right} fill={shade(roof, -36)} />
        <polygon points={top.top} fill={shade(roof, 18)} />
        <polygon points={deck} fill={shade(roof, -8)} />
      </g>
    )
  } else if (ridge === 'x') {
    const ym = y + d / 2
    const rows: ReactElement[] = []
    const N = 5
    for (let k = 1; k < N; k++) {
      const yy = ym + ((d / 2 + o) * k) / N
      const zz = H + roofH * (1 - k / N)
      rows.push(<polyline key={`r${k}`} points={pts([[x - o, yy, zz], [x + w + o, yy, zz]])} stroke={shade(roof, -26)} strokeWidth={1} />)
      const yPrev = ym + ((d / 2 + o) * (k - 1)) / N
      const zPrev = H + roofH * (1 - (k - 1) / N)
      for (let u = (k % 2) * 0.14; u < w + 2 * o - 0.05; u += 0.28)
        rows.push(<polyline key={`t${k}-${u.toFixed(2)}`} points={pts([[x - o + u, yPrev, zPrev], [x - o + u, yy, zz]])} stroke={shade(roof, -18)} strokeWidth={0.7} />)
    }
    roofEl = (
      <g>
        {/* 뒷면 (햇빛 받음) */}
        <polygon points={pts([[x - o, y - o, H], [x + w + o, y - o, H], [x + w + o, ym, H + roofH], [x - o, ym, H + roofH]])} fill={shade(roof, 14)} />
        <polygon points={pts([[x - o, y - o, H], [x + w + o, y - o, H], [x + w + o, ym, H + roofH], [x - o, ym, H + roofH]])} fill="url(#m-roof-back)" />
        {/* 박공 벽 */}
        <polygon points={pts([[x + w, y, H], [x + w, y + d, H], [x + w, ym, H + roofH]])} fill={wallR} />
        <polygon points={pts([[x + w, y, H], [x + w, y + d, H], [x + w, ym, H + roofH]])} fill="url(#m-lit-r)" />
        <circle cx={iso(x + w, ym, H + roofH * 0.42).x} cy={iso(x + w, ym, H + roofH * 0.42).y} r={3.4} fill="url(#m-glass)" stroke="#FFFDF6" strokeWidth={1.3} />
        {/* 앞면 */}
        <polygon points={pts([[x - o, ym, H + roofH], [x + w + o, ym, H + roofH], [x + w + o, y + d + o, H], [x - o, y + d + o, H]])} fill={roof} />
        <polygon points={pts([[x - o, ym, H + roofH], [x + w + o, ym, H + roofH], [x + w + o, y + d + o, H], [x - o, y + d + o, H]])} fill="url(#m-roof-front)" />
        {rows}
        {/* 처마 두께 + 박공 테두리 */}
        <polygon points={pts([[x - o, y + d + o, H], [x + w + o, y + d + o, H], [x + w + o, y + d + o, H - 3], [x - o, y + d + o, H - 3]])} fill={rdark} />
        <polyline points={pts([[x + w + o, y - o, H], [x + w + o, ym, H + roofH], [x + w + o, y + d + o, H]])} fill="none" stroke={rdark} strokeWidth={2.6} strokeLinejoin="round" />
        {/* 용마루 */}
        <polyline points={pts([[x - o, ym, H + roofH + 1], [x + w + o, ym, H + roofH + 1]])} stroke={shade(roof, -34)} strokeWidth={3.6} strokeLinecap="round" />
        <polyline points={pts([[x - o, ym, H + roofH + 2], [x + w + o, ym, H + roofH + 2]])} stroke={shade(roof, 40)} strokeWidth={1} strokeLinecap="round" />
      </g>
    )
  } else {
    const xm = x + w / 2
    const rows: ReactElement[] = []
    const N = 5
    for (let k = 1; k < N; k++) {
      const xx = xm + ((w / 2 + o) * k) / N
      const zz = H + roofH * (1 - k / N)
      rows.push(<polyline key={`r${k}`} points={pts([[xx, y - o, zz], [xx, y + d + o, zz]])} stroke={shade(roof, -36)} strokeWidth={1} />)
      const xPrev = xm + ((w / 2 + o) * (k - 1)) / N
      const zPrev = H + roofH * (1 - (k - 1) / N)
      for (let u = (k % 2) * 0.14; u < d + 2 * o - 0.05; u += 0.28)
        rows.push(<polyline key={`t${k}-${u.toFixed(2)}`} points={pts([[xPrev, y - o + u, zPrev], [xx, y - o + u, zz]])} stroke={shade(roof, -28)} strokeWidth={0.7} />)
    }
    roofEl = (
      <g>
        <polygon points={pts([[x - o, y - o, H], [xm, y - o, H + roofH], [xm, y + d + o, H + roofH], [x - o, y + d + o, H]])} fill={shade(roof, 14)} />
        <polygon points={pts([[x - o, y - o, H], [xm, y - o, H + roofH], [xm, y + d + o, H + roofH], [x - o, y + d + o, H]])} fill="url(#m-roof-back)" />
        <polygon points={pts([[x, y + d, H], [x + w, y + d, H], [xm, y + d, H + roofH]])} fill={wallL} />
        <polygon points={pts([[x, y + d, H], [x + w, y + d, H], [xm, y + d, H + roofH]])} fill="url(#m-lit-l)" />
        <circle cx={iso(xm, y + d, H + roofH * 0.42).x} cy={iso(xm, y + d, H + roofH * 0.42).y} r={3.4} fill="url(#m-glass)" stroke="#FFFDF6" strokeWidth={1.3} />
        <polygon points={pts([[xm, y - o, H + roofH], [x + w + o, y - o, H], [x + w + o, y + d + o, H], [xm, y + d + o, H + roofH]])} fill={shade(roof, -10)} />
        <polygon points={pts([[xm, y - o, H + roofH], [x + w + o, y - o, H], [x + w + o, y + d + o, H], [xm, y + d + o, H + roofH]])} fill="url(#m-roof-side)" />
        {rows}
        <polygon points={pts([[x + w + o, y - o, H], [x + w + o, y + d + o, H], [x + w + o, y + d + o, H - 3], [x + w + o, y - o, H - 3]])} fill={rdark} />
        <polyline points={pts([[x - o, y + d + o, H], [xm, y + d + o, H + roofH], [x + w + o, y + d + o, H]])} fill="none" stroke={rdark} strokeWidth={2.6} strokeLinejoin="round" />
        <polyline points={pts([[xm, y - o, H + roofH + 1], [xm, y + d + o, H + roofH + 1]])} stroke={shade(roof, -34)} strokeWidth={3.6} strokeLinecap="round" />
        <polyline points={pts([[xm, y - o, H + roofH + 2], [xm, y + d + o, H + roofH + 2]])} stroke={shade(roof, 40)} strokeWidth={1} strokeLinecap="round" />
      </g>
    )
  }

  // 차양 (줄무늬 + 물결 끝단)
  let awningEl: ReactElement | null = null
  if (awning) {
    const len = doorSide === 'y' ? w : d
    const n = Math.max(6, Math.round(len * 4))
    const za = h * 0.84
    const zb = h * 0.62
    const out = 0.46
    const segs: ReactElement[] = []
    const scallop: string[] = []
    for (let i = 0; i < n; i++) {
      const a = (len * i) / n
      const c = (len * (i + 1)) / n
      const P = (u: number, o2: number, z: number): P3 => (doorSide === 'y' ? [x + u, faceY + o2, z] : [faceX + o2, y + u, z])
      segs.push(<polygon key={i} points={pts([P(a, 0, za), P(c, 0, za), P(c, out, zb), P(a, out, zb)])} fill={i % 2 ? '#FFFDF6' : awning} />)
      const pa = iso(...P(a, out, zb))
      const pc = iso(...P(c, out, zb))
      const pm = iso(...P((a + c) / 2, out, zb - 5))
      scallop.push(`M${pa.x.toFixed(1)} ${pa.y.toFixed(1)} Q${pm.x.toFixed(1)} ${pm.y.toFixed(1)} ${pc.x.toFixed(1)} ${pc.y.toFixed(1)} Z`)
      segs.push(<path key={`s${i}`} d={scallop[i]} fill={i % 2 ? '#FFFDF6' : awning} />)
    }
    const P0 = (u: number, o2: number, z: number): P3 => (doorSide === 'y' ? [x + u, faceY + o2, z] : [faceX + o2, y + u, z])
    awningEl = (
      <g>
        <polygon points={fr(doorSide, doorFixed, doorStart, doorStart + len, zb - 8, zb + 2)} fill="#1A1236" opacity={0.16} />
        {segs}
        <polygon points={pts([P0(0, 0, za), P0(len, 0, za), P0(len, out, zb), P0(0, out, zb)])} fill="url(#m-roof-front)" />
        <polyline points={pts([P0(0, 0, za), P0(len, 0, za)])} stroke={shade(awning, -45)} strokeWidth={2} />
      </g>
    )
  }

  const frontCorner = pts([[faceX, faceY, base], [faceX, faceY, h]])
  return (
    <g>
      {/* 기초석 */}
      <polygon points={found.left} fill="#CBC2B2" />
      <polygon points={found.right} fill="#AFA594" />
      {[0.25, 0.5, 0.75].map((k) => (
        <g key={k} stroke="#9C9282" strokeWidth={0.6}>
          <polyline points={pts([[x + w * k, faceY + 0.04, 0], [x + w * k, faceY + 0.04, base]])} />
          <polyline points={pts([[faceX + 0.04, y + d * k, 0], [faceX + 0.04, y + d * k, base]])} />
        </g>
      ))}
      {/* 벽 */}
      <polygon points={pts([[x, faceY, base], [faceX, faceY, base], [faceX, faceY, h], [x, faceY, h]])} fill={wallL} />
      <polygon points={pts([[faceX, y, base], [faceX, faceY, base], [faceX, faceY, h], [faceX, y, h]])} fill={wallR} />
      {texture}
      <polygon points={walls.left} fill="url(#m-lit-l)" />
      <polygon points={walls.right} fill="url(#m-lit-r)" />
      <polyline points={frontCorner} stroke={shade(wallL, 30)} strokeWidth={2.2} />
      {/* 처마 그늘 */}
      <polygon points={fr('y', faceY, x, faceX, h - 9, h)} fill="url(#m-eave)" />
      <polygon points={fr('x', faceX, y, faceY, h - 9, h)} fill="url(#m-eave)" />
      {wins}
      <Door side={doorSide} fixed={doorFixed} c={doorC} half={0.23} h={doorH} color={door} glass={glassDoor} />
      <Step side={doorSide} fixed={doorFixed} c={doorC} half={0.26} />
      {awningEl}
      {roofEl}
      {children}
    </g>
  )
}

/* ───────── 간판 ───────── */
export function Sign({ x, y, z, text, bg, fg = '#fff', emoji, small }: { x: number; y: number; z: number; text: string; bg: string; fg?: string; emoji?: string; small?: boolean }) {
  const p = iso(x, y, z)
  const fs = small ? 10 : 11.5
  const label = emoji ? `${emoji} ${text}` : text
  const wpx = Math.max(46, label.length * (fs * 0.95) + 18)
  const hh = small ? 20 : 23
  return (
    <g transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`} style={{ pointerEvents: 'none' }}>
      <rect x={-wpx / 2 + 1} y={-hh / 2 + 3} width={wpx} height={hh} rx={7} fill="#1A1236" opacity={0.22} />
      <rect x={-wpx / 2} y={-hh / 2} width={wpx} height={hh} rx={7} fill={bg} stroke={shade(bg, -60)} strokeWidth={1.4} />
      <rect x={-wpx / 2 + 2} y={-hh / 2 + 2} width={wpx - 4} height={hh / 2 - 2} rx={5} fill="#FFFFFF" opacity={0.18} />
      <rect x={-wpx / 2 + 2.5} y={-hh / 2 + 2.5} width={wpx - 5} height={hh - 5} rx={5} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.8} />
      <text x={0} y={fs * 0.38 + 1} textAnchor="middle" fontSize={fs} fontWeight={900} fill={shade(bg, -70)} opacity={0.45} fontFamily="Pretendard Variable, Pretendard, sans-serif">
        {label}
      </text>
      <text x={0} y={fs * 0.38} textAnchor="middle" fontSize={fs} fontWeight={900} fill={fg} fontFamily="Pretendard Variable, Pretendard, sans-serif">
        {label}
      </text>
    </g>
  )
}

function textAt(x: number, y: number, z: number) {
  const p = iso(x, y, z)
  return { x: p.x, y: p.y, textAnchor: 'middle' as const, style: { pointerEvents: 'none' as const } }
}

function Planter({ x, y }: { x: number; y: number }) {
  const b = box(x - 0.16, y - 0.08, 0.32, 0.18, 0, 7)
  const top = iso(x, y, 7)
  return (
    <g>
      <polygon points={b.left} fill="#B5532A" />
      <polygon points={b.right} fill="#8F3E1D" />
      <circle cx={top.x - 4} cy={top.y - 3} r={5} fill="#3F9E45" />
      <circle cx={top.x + 4} cy={top.y - 3} r={5} fill="#358A3B" />
      <circle cx={top.x} cy={top.y - 7} r={6} fill="#4CB152" />
      <circle cx={top.x} cy={top.y - 7} r={6} fill="url(#m-leaf)" />
      <circle cx={top.x + 2} cy={top.y - 9} r={1.6} fill="#FFD35A" />
    </g>
  )
}

function Chimney({ x, y, z, smoke }: { x: number; y: number; z: number; smoke?: boolean }) {
  const b = box(x, y, 0.36, 0.36, z, 26)
  const cap = box(x - 0.04, y - 0.04, 0.44, 0.44, z + 26, 3)
  const top = iso(x + 0.18, y + 0.18, z + 30)
  return (
    <g>
      <polygon points={b.left} fill="#B9653A" />
      <polygon points={b.right} fill="#94502C" />
      {[6, 12, 18].map((k) => (
        <polyline key={k} points={pts([[x, y + 0.36, z + k], [x + 0.36, y + 0.36, z + k], [x + 0.36, y, z + k]])} fill="none" stroke="#7C3F20" strokeWidth={0.6} />
      ))}
      <polygon points={cap.left} fill="#6D6A73" />
      <polygon points={cap.right} fill="#57545E" />
      <polygon points={cap.top} fill="#3A3840" />
      {smoke && (
        <g style={{ pointerEvents: 'none' }}>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} className="smoke" style={{ animationDelay: `${i * 0.6}s` }} cx={top.x} cy={top.y} r={7} fill="url(#m-smoke)" />
          ))}
        </g>
      )}
    </g>
  )
}

/** 가게 앞 진열대 */
function Crate({ x, y, emoji }: { x: number; y: number; emoji: string }) {
  const b = box(x, y, 0.42, 0.36, 0, 9)
  const t = iso(x + 0.21, y + 0.18, 13)
  return (
    <g>
      <polygon points={b.left} fill="#C88A4E" />
      <polygon points={b.right} fill="#A06A37" />
      <polygon points={b.top} fill="#7A4E2A" />
      <polyline points={pts([[x, y + 0.36, 4.5], [x + 0.42, y + 0.36, 4.5]])} stroke="#9A6534" strokeWidth={0.8} />
      <text x={t.x} y={t.y} textAnchor="middle" fontSize={11} style={{ pointerEvents: 'none' }}>
        {emoji}
      </text>
    </g>
  )
}

/* ───────── 건물별 그림 ───────── */

export const ShopArt = memo(function ShopArt({ name, color, emoji, equipment, interior, open }: { name: string; color: string; emoji: string; equipment: number; interior: number; open: boolean }) {
  const x = 14
  const y = 5
  return (
    <g>
      <House x={x} y={y} w={3} d={3} h={50} wallL="#FFF4DE" wallR="#F0DDBA" roof="#E8574F" doorSide="y" awning={color} windows={2} windowGlow={open} glassDoor flowers="#FF8FB1">
        <text {...textAt(x + 0.45, y + 3, 19)} fontSize={13}>
          {emoji}
        </text>
        <text {...textAt(x + 2.55, y + 3, 19)} fontSize={13}>
          {equipment >= 2 ? '✨' : emoji}
        </text>
        {interior >= 1 && <Planter x={x + 0.12} y={y + 3.25} />}
        {interior >= 2 && <Planter x={x + 2.88} y={y + 3.25} />}
        {equipment >= 1 && <Chimney x={x + 2.2} y={y + 0.5} z={56} smoke={open} />}
      </House>
      <Sign x={x + 1.5} y={y + 3} z={86} text={name} bg={color} />
      <OpenTag x={x + 1.5} y={y + 3} open={open} />
    </g>
  )
})

function OpenTag({ x, y, open }: { x: number; y: number; open: boolean }) {
  const p = iso(x, y, 34)
  return (
    <g transform={`translate(${p.x},${p.y})`} style={{ pointerEvents: 'none' }}>
      <line x1={-8} y1={-12} x2={-4} y2={-6} stroke="#6B4A33" strokeWidth={0.8} />
      <line x1={8} y1={-12} x2={4} y2={-6} stroke="#6B4A33" strokeWidth={0.8} />
      <rect x={-15} y={-6} width={30} height={12} rx={3} fill={open ? '#FFFDF6' : '#5B3A29'} stroke={INK} strokeWidth={0.9} />
      <text y={3.4} textAnchor="middle" fontSize={7.5} fontWeight={900} fill={open ? '#E8574F' : '#FFF4DE'}>
        {open ? 'OPEN' : 'CLOSED'}
      </text>
    </g>
  )
}

export const WorkshopArt = memo(function WorkshopArt({ busy }: { busy: boolean }) {
  return (
    <g>
      <House x={18} y={6} w={2} d={2} h={44} wallL="#E9A57C" wallR="#C98560" roof="#7E5236" doorSide="y" windows={1} windowGlow={busy} door="#5B3A29" siding="brick">
        <Chimney x={18.25} y={6.35} z={48} smoke={busy} />
      </House>
      <Sign x={19} y={8} z={76} text="공방 주방" bg="#8B5A3C" emoji="🍳" />
    </g>
  )
})

export const MarketArt = memo(function MarketArt() {
  const x = 3
  const y = 5
  return (
    <g>
      <House x={x} y={y} w={3} d={3} h={38} wallL="#F0D7AE" wallR="#D7B98C" roof="#3E9E4B" doorSide="y" awning="#3E9E4B" windows={2} door="#8B5A3C" roofH={26} />
      <Crate x={3.22} y={8.05} emoji="🥬" />
      <Crate x={4.98} y={8.05} emoji="🍅" />
      <Crate x={5.5} y={8.05} emoji="🥩" />
      <Sign x={x + 1.5} y={y + 3} z={80} text="도매시장" bg="#2F8F3E" emoji="🛒" />
    </g>
  )
})

export const AcademyArt = memo(function AcademyArt() {
  const x = 7
  const y = 5
  const tw = box(x + 1.15, y + 1.15, 0.7, 0.7, 52, 26)
  const roofZ = 78
  const tip = iso(x + 1.5, y + 1.5, 104)
  const c = iso(x + 1.5, y + 1.85, 66)
  const P = (a: number, b: number, z: number) => {
    const p = iso(a, b, z)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }
  return (
    <g>
      <House x={x} y={y} w={3} d={3} h={52} wallL="#F8F9FF" wallR="#DCE3F5" roof="#4677E6" doorSide="y" windows={2} door="#2F55BE" siding="plain">
        <polygon points={tw.left} fill="#F8F9FF" />
        <polygon points={tw.left} fill="url(#m-lit-l)" />
        <polygon points={tw.right} fill="#DCE3F5" />
        <polygon points={tw.right} fill="url(#m-lit-r)" />
        {/* 시계 */}
        <circle cx={c.x} cy={c.y} r={6.5} fill="#FFFDF6" stroke="#2F55BE" strokeWidth={1.6} />
        <line x1={c.x} y1={c.y} x2={c.x} y2={c.y - 4} stroke="#202244" strokeWidth={1.2} strokeLinecap="round" />
        <line x1={c.x} y1={c.y} x2={c.x + 3} y2={c.y + 1} stroke="#202244" strokeWidth={1.2} strokeLinecap="round" />
        {/* 첨탑 지붕 */}
        <polygon points={`${P(x + 1.1, y + 1.1, roofZ)} ${P(x + 1.1, y + 1.9, roofZ)} ${tip.x},${tip.y}`} fill="#5D8BF0" />
        <polygon points={`${P(x + 1.1, y + 1.9, roofZ)} ${P(x + 1.9, y + 1.9, roofZ)} ${tip.x},${tip.y}`} fill="#4677E6" />
        <polygon points={`${P(x + 1.9, y + 1.9, roofZ)} ${P(x + 1.9, y + 1.1, roofZ)} ${tip.x},${tip.y}`} fill="#2F55BE" />
        <polyline points={`${P(x + 1.1, y + 1.9, roofZ)} ${P(x + 1.9, y + 1.9, roofZ)} ${P(x + 1.9, y + 1.1, roofZ)}`} fill="none" stroke="#22408F" strokeWidth={2} />
        <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y - 14} stroke="#5B3A29" strokeWidth={1.6} />
        <path className="flag" d={`M${tip.x} ${tip.y - 14} l12 3 l-12 4 z`} fill="#FCCB40" />
      </House>
      <Sign x={x + 1.5} y={y + 3} z={90} text="골목 배움터" bg="#3156C4" emoji="📚" />
    </g>
  )
})

export const SupportArt = memo(function SupportArt() {
  const x = 6
  const y = 1
  const pole = iso(x + 2.25, y + 2.15, 0)
  const colA = box(x + 0.62, y + 2.06, 0.14, 0.14, 0, 30)
  const colB = box(x + 1.24, y + 2.06, 0.14, 0.14, 0, 30)
  const porch = box(x + 0.5, y + 1.95, 1, 0.38, 30, 4)
  return (
    <g>
      <House x={x} y={y} w={2} d={2} h={42} wallL="#EAF8F4" wallR="#C8E8E0" roof="#1F9A8A" doorSide="y" windows={1} door="#167F71" siding="plain" />
      {[colA, colB].map((c, i) => (
        <g key={i}>
          <polygon points={c.left} fill="#FFFDF6" />
          <polygon points={c.right} fill="#DCD6C8" />
        </g>
      ))}
      <polygon points={porch.left} fill="#E6F2EE" />
      <polygon points={porch.right} fill="#BFD8D0" />
      <polygon points={porch.top} fill="#F6FBF9" />
      <line x1={pole.x} y1={pole.y} x2={pole.x} y2={pole.y - 78} stroke="#6B6F80" strokeWidth={2.2} />
      <circle cx={pole.x} cy={pole.y - 79} r={2} fill="#FCCB40" />
      <path className="flag" d={`M${pole.x} ${pole.y - 76} q10 -3 22 2 q-10 5 -22 9 z`} fill="#F25C54" />
      <Sign x={x + 1} y={y + 2} z={74} text="창업지원센터" bg="#167F71" emoji="🏛️" small />
    </g>
  )
})

export const CompanyArt = memo(function CompanyArt({ working }: { working: boolean }) {
  const x = 8
  const y = 12
  const h = 118
  const b = box(x, y, 3, 3, 0, h)
  const floors = [14, 34, 54, 74, 94]
  const ant = iso(x + 1.5, y + 1.5, h + 8)
  const night = useContext(NightCtx)
  const lit = (k: number, z: number) => (working || night) && hash(`win${k}${z}`) % 3 !== 0
  const cells: ReactElement[] = []
  floors.forEach((z) => {
    ;[0.18, 0.92, 1.66, 2.4].forEach((k, i) => {
      cells.push(<polygon key={`l${z}${i}`} points={fr('y', y + 3, x + k, x + k + 0.5, z, z + 15)} fill={lit(i, z) ? 'url(#m-glass-night)' : 'url(#m-tower-glass)'} />)
      cells.push(<polygon key={`r${z}${i}`} points={fr('x', x + 3, y + k, y + k + 0.5, z, z + 15)} fill={lit(i + 4, z) ? 'url(#m-glass-night)' : 'url(#m-tower-glass)'} opacity={0.85} />)
    })
  })
  const t = box(x - 0.06, y - 0.06, 3.12, 3.12, h, 8)
  const ac = box(x + 0.5, y + 0.6, 0.6, 0.5, h + 8, 7)
  const canopy = box(x + 3, y + 1.0, 0.5, 1.0, 24, 3)
  return (
    <g>
      <polygon points={b.left} fill="#E7ECF4" />
      <polygon points={b.left} fill="url(#m-lit-l)" />
      <polygon points={b.right} fill="#C3CDDC" />
      <polygon points={b.right} fill="url(#m-lit-r)" />
      {cells}
      {floors.map((z) => (
        <g key={`f${z}`}>
          <polyline points={pts([[x, y + 3, z - 2.5], [x + 3, y + 3, z - 2.5], [x + 3, y, z - 2.5]])} fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.2} />
        </g>
      ))}
      <polyline points={pts([[x + 3, y + 3, 0], [x + 3, y + 3, h]])} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2} />
      {/* 입구 */}
      <polygon points={fr('x', x + 3, y + 1.1, y + 1.9, 0, 22)} fill="url(#m-tower-glass)" stroke="#3B4A63" strokeWidth={1} />
      <polyline points={pts([[x + 3, y + 1.5, 0], [x + 3, y + 1.5, 22]])} stroke="#3B4A63" strokeWidth={1.2} />
      <polygon points={canopy.left} fill="#3B4A63" />
      <polygon points={canopy.right} fill="#2B3850" />
      <polygon points={canopy.top} fill="#56688A" />
      {/* 옥상 */}
      <polygon points={t.left} fill="#8E9AAE" />
      <polygon points={t.right} fill="#76829A" />
      <polygon points={t.top} fill="#A9B5C9" />
      <polygon points={pts([[x + 0.15, y + 0.15, h + 8], [x + 2.85, y + 0.15, h + 8], [x + 2.85, y + 2.85, h + 8], [x + 0.15, y + 2.85, h + 8]])} fill="#9AA6BB" />
      <polygon points={ac.left} fill="#DADFE8" />
      <polygon points={ac.right} fill="#B9C0CC" />
      <polygon points={ac.top} fill="#EEF1F6" />
      <circle cx={iso(x + 0.8, y + 0.85, h + 15).x} cy={iso(x + 0.8, y + 0.85, h + 15).y} r={3} fill="#9AA6BB" />
      <line x1={ant.x} y1={ant.y} x2={ant.x} y2={ant.y - 26} stroke="#5B6175" strokeWidth={2} />
      <circle cx={ant.x} cy={ant.y - 27} r={3} fill="#F25C54" className="blink" />
      <Sign x={x + 3} y={y + 1.5} z={h + 24} text="골목상사" bg="#202244" emoji="🏢" />
    </g>
  )
})

export const BoardArt = memo(function BoardArt() {
  const a = iso(10.18, 7.78)
  const b = iso(10.82, 7.78)
  const top = iso(10.5, 7.78, 46)
  return (
    <g>
      <rect x={a.x - 2.5} y={a.y - 42} width={5} height={42} rx={2} fill="#7A4A26" />
      <rect x={b.x - 2.5} y={b.y - 42} width={5} height={42} rx={2} fill="#6A3F20" />
      <rect x={top.x - 26} y={top.y + 1} width={52} height={32} rx={3} fill="#C98B4F" stroke="#6A3F20" strokeWidth={1.4} />
      <rect x={top.x - 26} y={top.y + 1} width={52} height={32} rx={3} fill="url(#m-wood)" />
      <rect x={top.x - 22} y={top.y + 5} width={19} height={12} rx={1} fill="#FFF8E1" transform={`rotate(-3 ${top.x - 12} ${top.y + 11})`} />
      <rect x={top.x + 1} y={top.y + 5} width={19} height={10} rx={1} fill="#E3F2FD" transform={`rotate(4 ${top.x + 10} ${top.y + 10})`} />
      <rect x={top.x - 12} y={top.y + 19} width={23} height={10} rx={1} fill="#FCE4EC" />
      {[
        [top.x - 12, top.y + 6],
        [top.x + 10, top.y + 6],
        [top.x, top.y + 20],
      ].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={1.4} fill={['#F25C54', '#3156C4', '#2E9C6A'][i]} />
      ))}
      <path d={`M${top.x - 32} ${top.y + 3} L${top.x} ${top.y - 11} L${top.x + 32} ${top.y + 3} L${top.x + 28} ${top.y + 5} L${top.x} ${top.y - 7} L${top.x - 28} ${top.y + 5} Z`} fill="#8B5A3C" stroke="#5B3A29" strokeWidth={1.2} />
    </g>
  )
})

const RIVAL_COLORS = [
  ['#FFEDEB', '#F2CFCB', '#E2596F'],
  ['#EAF4FF', '#CADCF0', '#3E86D6'],
  ['#FFF6DC', '#EEDCAB', '#E99E32'],
  ['#EEFBEF', '#CBE6CF', '#36A158'],
  ['#F5EFFF', '#DACDF0', '#8466EE'],
  ['#FFF1E7', '#EED0BB', '#D97035'],
  ['#EDF8F8', '#C8E0E0', '#2A9494'],
]

export const RivalArt = memo(function RivalArt({ index, lot, name, emoji }: { index: number; lot: { x: number; y: number; doorSide: 'x' | 'y' }; name: string; emoji: string }) {
  const [l, r, roof] = RIVAL_COLORS[index % RIVAL_COLORS.length]
  const signP = lot.doorSide === 'y' ? { x: lot.x + 1, y: lot.y + 2 } : { x: lot.x + 2, y: lot.y + 1 }
  return (
    <g>
      <House x={lot.x} y={lot.y} w={2} d={2} h={38} wallL={l} wallR={r} roof={roof} doorSide={lot.doorSide} awning={roof} windows={1} ridge={lot.doorSide === 'y' ? 'x' : 'y'} flowers={index % 2 ? '#FFD35A' : undefined} />
      <Sign x={signP.x} y={signP.y} z={68} text={name} bg={shade(roof, -18)} emoji={emoji} small />
    </g>
  )
})
