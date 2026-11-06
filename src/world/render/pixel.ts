/**
 * 도트(픽셀아트) 캐릭터 생성기
 * - 입체 리그(구 머리 · 타원 몸통)로 모양을 계산해 40×52 격자에 직접 찍고
 * - 재질별 3단 명암(보라빛 그림자 · 노란빛 하이라이트) + 1px 컬러 외곽선 + 안쪽 선을 넣은 뒤
 * - 눈·입·볼터치·안경은 도트 패턴으로 찍어요.
 * 결과는 프레임 스트립 PNG(data URL)로 캐시해요.
 */
import type { Look } from '../avatar'

export const PX = 1.45 // 도트 1칸 = 월드 1.45
export const SW = 40
export const SH = 54
export const FY = 50 // 발바닥 경계(월드 y=0)
export const X0 = 20

const HC = -44.5
const R = 12.6

/* ───────── 색 ───────── */
type RGB = [number, number, number]
const rgb = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const SHADOW_HUE: RGB = [70, 48, 120]
const LIGHT_HUE: RGB = [255, 244, 210]
const INK: RGB = [28, 16, 40]
interface Ramp {
  o: RGB
  line: RGB
  s: RGB
  b: RGB
  l: RGB
}
function ramp(hex: string): Ramp {
  const b = rgb(hex)
  const s = mix(mix(b, SHADOW_HUE, 0.3), [0, 0, 0], 0.1)
  const o = mix(b, INK, 0.74)
  return { o, line: mix(o, s, 0.35), s, b, l: mix(b, LIGHT_HUE, 0.4) }
}

/* ───────── 재질 ───────── */
const M = {
  E: 0,
  SKIN: 1,
  SKIN_DK: 2,
  HAIR: 3,
  HAIR_HI: 4,
  HAIR_SH: 5,
  TOP: 6,
  TOP_DK: 7,
  TOP_LT: 8,
  BOT: 9,
  SHOE: 10,
  WHITE: 11,
  WHITE_DK: 12,
  ACC: 13,
  HAT: 14,
  HAT_DK: 15,
  HAT_LT: 16,
  BLUE: 17,
} as const
type Mat = (typeof M)[keyof typeof M]

/* ───────── 격자 ───────── */
class Grid {
  mat = new Uint8Array(SW * SH)
  part = new Uint8Array(SW * SH)
  parts = 0
  noLine = new Set<number>()
  newPart(noLine = false) {
    this.parts++
    if (noLine) this.noLine.add(this.parts)
    return this.parts
  }
  set(i: number, j: number, m: Mat, p: number) {
    if (i < 0 || j < 0 || i >= SW || j >= SH) return
    this.mat[j * SW + i] = m
    this.part[j * SW + i] = p
  }
  matAt(i: number, j: number) {
    return i < 0 || j < 0 || i >= SW || j >= SH ? 0 : this.mat[j * SW + i]
  }
  partAt(i: number, j: number) {
    return i < 0 || j < 0 || i >= SW || j >= SH ? 0 : this.part[j * SW + i]
  }
}

type Pt = [number, number]
/** 치비 비율: 몸은 작게(BS), 머리는 크게(HS) */
const BS = 0.8
const HS = 1.17
const NECK = -31 * BS
let TX: (x: number, y: number) => Pt = (x, y) => [x, y]
let TS = 1
function useT(kind: 'legs' | 'body' | 'head', f: FrameSpec) {
  if (kind === 'legs') {
    TX = (x, y) => [x * BS, y * BS]
    TS = BS
  } else if (kind === 'body') {
    TX = (x, y) => [x * BS, y * BS + f.bodyY]
    TS = BS
  } else {
    TX = (x, y) => [x * HS, NECK + f.bodyY + f.headY + (y + 31) * HS]
    TS = HS
  }
}
const toPx = (x: number, y: number): Pt => {
  const [a, b] = TX(x, y)
  return [X0 + a / PX, FY + b / PX]
}
const SUB = [1 / 6, 1 / 2, 5 / 6]

function inPoly(x: number, y: number, p: Pt[]) {
  let inside = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]
    const [xj, yj] = p[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function fillPoly(g: Grid, world: Pt[], m: Mat, part: number, need = 5) {
  const p = world.map(([x, y]) => toPx(x, y))
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of p) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  for (let j = Math.max(0, Math.floor(y0)); j <= Math.min(SH - 1, Math.ceil(y1)); j++)
    for (let i = Math.max(0, Math.floor(x0)); i <= Math.min(SW - 1, Math.ceil(x1)); i++) {
      let n = 0
      for (const sy of SUB) for (const sx of SUB) if (inPoly(i + sx, j + sy, p)) n++
      if (n >= need) g.set(i, j, m, part)
    }
}

function fillEllipse(g: Grid, cx: number, cy: number, rx: number, ry: number, m: Mat, part: number, need = 5) {
  const [px, py] = toPx(cx, cy)
  const rxp = (rx * TS) / PX
  const ryp = (ry * TS) / PX
  for (let j = Math.max(0, Math.floor(py - ryp)); j <= Math.min(SH - 1, Math.ceil(py + ryp)); j++)
    for (let i = Math.max(0, Math.floor(px - rxp)); i <= Math.min(SW - 1, Math.ceil(px + rxp)); i++) {
      let n = 0
      for (const sy of SUB)
        for (const sx of SUB) {
          const dx = (i + sx - px) / rxp
          const dy = (j + sy - py) / ryp
          if (dx * dx + dy * dy <= 1) n++
        }
      if (n >= need) g.set(i, j, m, part)
    }
}

/** 둥근 막대 (팔·다리) */
function capsule(g: Grid, ax: number, ay: number, bx: number, by: number, r: number, m: Mat, part: number) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const pts: Pt[] = []
  const N = 6
  for (let k = 0; k <= N; k++) {
    const t = Math.PI * (k / N)
    pts.push([bx + nx * r * Math.cos(t) + (dx / len) * r * Math.sin(t), by + ny * r * Math.cos(t) + (dy / len) * r * Math.sin(t)])
  }
  for (let k = 0; k <= N; k++) {
    const t = Math.PI + Math.PI * (k / N)
    pts.push([ax + nx * r * Math.cos(t) + (dx / len) * r * Math.sin(t), ay + ny * r * Math.cos(t) + (dy / len) * r * Math.sin(t)])
  }
  fillPoly(g, pts, m, part, 4)
}

function line(g: Grid, world: Pt[], m: Mat, part: number) {
  for (let k = 0; k < world.length - 1; k++) {
    const [ax, ay] = toPx(...world[k])
    const [bx, by] = toPx(...world[k + 1])
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.5))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      g.set(Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t), m, part)
    }
  }
}

/* ───────── 입체 리그 (월드 단위) ───────── */
interface HairDef {
  fh: number
  sh: number
  nh: number
  vol: number
  bangs: number
  freq: number
  top?: 'curly' | 'spiky'
  tail?: boolean
  bun?: boolean
  long?: boolean
}
const HAIR: HairDef[] = [
  { fh: -5.4, sh: 3, nh: 9.6, vol: 1.7, bangs: 2.6, freq: 5 },
  { fh: -5.2, sh: 10, nh: 11.5, vol: 2.3, bangs: 1.5, freq: 9, long: true },
  { fh: -5.8, sh: 5.5, nh: 9.6, vol: 1.8, bangs: 2.2, freq: 4, tail: true },
  { fh: -5.2, sh: 20, nh: 21, vol: 2.5, bangs: 1.8, freq: 7, long: true },
  { fh: -5.8, sh: 4.5, nh: 10.2, vol: 3.4, bangs: 2.8, freq: 6, top: 'curly' },
  { fh: -5.6, sh: 2, nh: 9.4, vol: 2, bangs: 3.2, freq: 5, top: 'spiky' },
  { fh: -7, sh: 4.5, nh: 9, vol: 1.4, bangs: 0.8, freq: 3, bun: true },
  { fh: -7.6, sh: -1, nh: 8.4, vol: 0.7, bangs: 0.3, freq: 3 },
]

function hairH(d: HairDef, lam: number) {
  const c = Math.cos(lam)
  let h = c >= 0 ? d.sh + (d.fh - d.sh) * c : d.sh + (d.nh - d.sh) * -c
  if (c > 0) h += d.bangs * c * c * Math.pow(Math.abs(Math.sin(d.freq * lam + 0.3)), 0.8)
  return h
}
/** 위에서 살짝 내려다보는 시점 (머리띠·헤어라인이 둥글게 휘어 보여요) */
const PITCH = 0.22
const CP = Math.cos(PITCH)
const SP = Math.sin(PITCH)
function sph(lam: number, a: number, h: number, r = R) {
  const m = lam + a
  const w = Math.sqrt(Math.max(0, r * r - h * h))
  return { x: w * Math.sin(m), y: HC + h * CP + w * Math.cos(m) * SP, k: Math.cos(m) }
}
function bod(phi: number, a: number, A = 8.4, B = 6) {
  return { x: A * Math.sin(phi) * Math.cos(a) + B * Math.cos(phi) * Math.sin(a), d: -A * Math.sin(phi) * Math.sin(a) + B * Math.cos(phi) * Math.cos(a) }
}
function capPts(d: HairDef, a: number, volAdd = 0, hairline?: (lam: number) => number, dy = 0): Pt[] {
  const Rp = R + d.vol + volAdd
  const rr = R + (d.vol + volAdd) * 0.35
  const H = hairline ?? ((lam: number) => hairH(d, lam))
  const N = 26
  const bottom: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const mu = -Math.PI / 2 + (Math.PI * i) / N
    let h = H(mu - a)
    if (h > R && !hairline) h += 1.1 * Math.sin(8 * (mu - a))
    const taper = h > R ? 1 - 0.12 * Math.min(1, (h - R) / 8) : 1
    const w = h <= 0 ? Math.sqrt(Math.max(0, rr * rr - h * h)) : rr * taper
    const ws = Math.sqrt(Math.max(0, rr * rr - Math.min(h * h, rr * rr)))
    bottom.push([w * Math.sin(mu), HC + h * CP + ws * Math.cos(mu) * SP + dy])
  }
  const hL = bottom[0][1] - dy - HC
  const hR = bottom[N][1] - dy - HC
  const psiOf = (h: number) => (h > 0 ? Math.PI / 2 : Math.acos(Math.max(-1, Math.min(1, -h / Rp))))
  const psiL = -psiOf(hL)
  const psiR = psiOf(hR)
  const top: Pt[] = []
  if (hL > 0) top.push([-Rp, HC + hL + dy])
  const K = 30
  for (let i = 0; i <= K; i++) {
    const psi = psiL + ((psiR - psiL) * i) / K
    let rad = Rp
    if (d.top === 'curly' && volAdd === 0) rad += 1.4 * Math.abs(Math.sin(6 * psi + a * 0.8))
    if (d.top === 'spiky' && volAdd === 0 && Math.abs(psi) < 1.7) rad += 3.4 * Math.pow(Math.max(0, Math.sin(8 * psi + a * 0.9)), 2)
    top.push([rad * Math.sin(psi), HC - rad * Math.cos(psi) + dy])
  }
  if (hR > 0) top.push([Rp, HC + hR + dy])
  return [...top, ...bottom.reverse()]
}

/* ───────── 프레임 ───────── */
export type Face = 'normal' | 'happy' | 'surprised' | 'tired' | 'yawn' | 'talk' | 'talkOpen' | 'closed'
export interface FrameSpec {
  legR: number
  legL: number
  liftR: number
  liftL: number
  armR: number
  armL: number
  bodyY: number
  headY: number
  face: Face
}

const rotDir = (deg: number): Pt => {
  const t = (deg * Math.PI) / 180
  return [-Math.sin(t), Math.cos(t)]
}

function drawBody(g: Grid, look: Look, ang: number, f: FrameSpec) {
  const a = (ang * Math.PI) / 180
  const s = Math.sin(a)
  const c = Math.cos(a)
  const fa = Math.abs(c)
  const hd = HAIR[look.hair % HAIR.length]
  // 흔들림·높이는 변환(useT)이 맡아요
  const by = 0
  const hy = 0
  useT('head', f)
  const W = Math.sqrt((8.4 * c) ** 2 + (6 * s) ** 2)
  const armX = { R: -(8.4 + 1.5) * c, L: (8.4 + 1.5) * c }
  const armD = { R: 8.4 * s, L: -8.4 * s }
  const legX = { R: -3.7 * c, L: 3.7 * c }
  const legD = { R: 3.7 * s, L: -3.7 * s }
  const sleeve = look.top === 0 ? 5.6 : 11.4

  // 뒤로 늘어진 머리 (몸 뒤)
  const longBack = hd.long && c > -0.3
  if (longBack) {
    const p = g.newPart()
    fillPoly(g, [
      [-R - hd.vol * 0.5, HC + hy],
      [-R - hd.vol * 0.7, HC + hd.nh - 2 + hy],
      [-R * 0.6, HC + hd.nh + 1.4 + hy],
      [R * 0.6, HC + hd.nh + 1.4 + hy],
      [R + hd.vol * 0.7, HC + hd.nh - 2 + hy],
      [R + hd.vol * 0.5, HC + hy],
    ], M.HAIR, p)
  }
  const tail = hd.tail ? sph(Math.PI - 0.55, a, -5, R + 0.6) : null
  const drawTail = () => {
    if (!tail) return
    const prevT = TX
    const prevS = TS
    useT('head', f)
    const p = g.newPart()
    const tx = tail.x
    const ty = tail.y + hy
    fillPoly(g, [
      [tx - 2.8, ty],
      [tx - 4.6, ty + 7],
      [tx - 2.4, ty + 14],
      [tx - 0.4, ty + 16.5],
      [tx + 2.2, ty + 11],
      [tx + 3, ty + 2],
    ], M.HAIR, p)
    line(g, [
      [tx - 1.6, ty + 3],
      [tx - 2, ty + 10],
    ], M.HAIR_SH, g.newPart(true))
    fillEllipse(g, tx, ty, 2.2, 2.2, M.ACC, g.newPart())
    TX = prevT
    TS = prevS
  }
  if (tail && tail.k < 0) drawTail()

  const drawArm = (side: 'R' | 'L') => {
    const rot = (side === 'R' ? f.armR : f.armL) + (side === 'R' ? 6 : -6) * fa
    const [dx, dy] = rotDir(rot)
    const sx = armX[side]
    const sy = -29.6 + by
    const skinP = g.newPart()
    capsule(g, sx, sy, sx + dx * 11.6, sy + dy * 11.6, 2.15, M.SKIN, skinP)
    fillEllipse(g, sx + dx * 12.6, sy + dy * 12.6, 2.7, 2.7, M.SKIN, skinP)
    capsule(g, sx, sy, sx + dx * sleeve, sy + dy * sleeve, 2.45, M.TOP, g.newPart())
  }

  const drawLeg = (side: 'R' | 'L') => {
    const rot = side === 'R' ? f.legR : f.legL
    const lift = side === 'R' ? f.liftR : f.liftL
    const [dx, dy] = rotDir(rot)
    const hx = legX[side]
    const hyy = -17.6 - lift
    const fx = hx + dx * 15.4
    const fy = hyy + dy * 15.4
    const legMat = look.bottom === 0 ? M.BOT : M.SKIN
    const lp = g.newPart()
    capsule(g, hx, hyy, fx, fy, 2.7, legMat, lp)
    if (look.bottom === 1) capsule(g, hx, hyy, hx + dx * 7, hyy + dy * 7, 2.95, M.BOT, g.newPart())
    if (look.bottom !== 0) capsule(g, hx + dx * 11.6, hyy + dy * 11.6, fx, fy, 2.75, M.WHITE, g.newPart(true))
    fillEllipse(g, fx + 1.5 * s, fy + 1, 3.3 + 1.6 * s, 2.3, M.SHOE, g.newPart())
  }

  useT('body', f)
  ;(['R', 'L'] as const).filter((sd) => armD[sd] < -1.5).forEach(drawArm)
  useT('legs', f)
  ;(['R', 'L'] as const)
    .slice()
    .sort((p, q) => legD[p] - legD[q])
    .forEach(drawLeg)
  useT('body', f)

  // 목
  fillPoly(g, [
    [-3, -34 + hy],
    [3, -34 + hy],
    [3, -29 + by],
    [-3, -29 + by],
  ], M.SKIN_DK, g.newPart())
  // 몸통
  const torso: Pt[] = [
    [-W + 1.4, -31],
    [0, -32.4],
    [W - 1.4, -31],
    [W + 0.5, -29.6],
    [W + 0.9, -26],
    [W + 1.1, -18],
    [W + 0.4, -15.8],
    [0, -15],
    [-W - 0.4, -15.8],
    [-W - 1.1, -18],
    [-W - 0.9, -26],
    [-W - 0.5, -29.6],
  ].map(([x, y]) => [x, y + by] as Pt)
  fillPoly(g, torso, M.TOP, g.newPart())

  // 옷 디테일
  const front = bod(0, a)
  const frontVis = front.d > 0.5
  const backVis = front.d < -0.5
  const clampX = (x: number) => Math.max(-W - 0.4, Math.min(W + 0.4, x))
  const band = (p0: number, p1: number, y0: number, y1: number): Pt[] | null => {
    const N = 8
    const topPts: Pt[] = []
    const botPts: Pt[] = []
    for (let i = 0; i <= N; i++) {
      const phi = p0 + ((p1 - p0) * i) / N
      const b = bod(phi, a)
      if (b.d < -0.3) continue
      topPts.push([clampX(b.x), y0 + by])
      botPts.push([clampX(b.x), y1 + by])
    }
    if (topPts.length < 2) return null
    return [...topPts, ...botPts.reverse()]
  }
  if (look.top === 0 && frontVis) {
    const pts: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const phi = -0.95 + (1.9 * i) / 8
      const b = bod(phi, a)
      if (b.d > 0) pts.push([b.x, -31 + 2.3 * Math.cos(phi * 1.5) ** 2 + by])
    }
    if (pts.length > 1) line(g, pts, M.TOP_DK, g.newPart(true))
  }
  if (look.top === 1) {
    if (frontVis) {
      const pk = band(-0.6, 0.6, -21.6, -17.4)
      if (pk) fillPoly(g, pk, M.TOP_DK, g.newPart(true))
      for (const ph of [-0.24, 0.24]) {
        const b = bod(ph, a)
        if (b.d > 0) line(g, [
          [b.x, -30.4 + by],
          [b.x, -26 + by],
        ], M.WHITE, g.newPart(true))
      }
    }
    if (backVis) {
      const b = bod(Math.PI, a)
      fillPoly(g, [
        [b.x - 6 * fa, -31 + by],
        [b.x, -23 + by],
        [b.x + 6 * fa, -31 + by],
      ], M.TOP_DK, g.newPart())
    }
  }
  if (look.top === 2 && frontVis) {
    for (const ph of [-0.3, 0.3]) {
      const b = bod(ph, a)
      const sg = Math.sign(ph)
      if (b.d > 0) fillPoly(g, [
        [b.x - 2 * sg, -31.3 + by],
        [b.x + 1.4 * sg, -27.6 + by],
        [b.x + 2.6 * sg, -31.5 + by],
      ], M.TOP_LT, g.newPart())
    }
    line(g, [
      [front.x, -28.5 + by],
      [front.x, -16.5 + by],
    ], M.TOP_DK, g.newPart(true))
  }
  if (look.top === 3) {
    for (const [y0, y1] of [
      [-25.8, -23.8],
      [-22.2, -20.4],
    ])
      fillPoly(g, [
        [-W - 0.6, y0 + by],
        [W + 0.6, y0 + by],
        [W + 0.8, y1 + by],
        [-W - 0.8, y1 + by],
      ], M.TOP_LT, g.newPart(true))
    fillPoly(g, [
      [-W - 1, -17.8 + by],
      [W + 1, -17.8 + by],
      [W + 0.6, -15.4 + by],
      [-W - 0.6, -15.4 + by],
    ], M.TOP_DK, g.newPart(true))
  }
  if (look.role === 'owner') {
    if (frontVis) {
      const ap = band(-0.9, 0.9, -27.4, -13.4)
      if (ap) {
        fillPoly(g, ap, M.WHITE, g.newPart())
        const pk = band(-0.32, 0.32, -21.4, -18.2)
        if (pk) fillPoly(g, pk, M.WHITE_DK, g.newPart(true))
        for (const ph of [-0.86, 0.86]) {
          const b0 = bod(ph, a)
          const b1 = bod(ph * 0.45, a)
          if (b0.d > -0.3 && b1.d > -0.3) line(g, [
            [clampX(b0.x), -27.4 + by],
            [b1.x, -31 + by],
          ], M.WHITE, g.newPart(true))
        }
      }
    } else if (backVis) {
      const b = bod(Math.PI, a)
      const p = g.newPart()
      fillPoly(g, [
        [b.x, -21 + by],
        [b.x - 4, -23 + by],
        [b.x - 4, -19 + by],
      ], M.WHITE, p)
      fillPoly(g, [
        [b.x, -21 + by],
        [b.x + 4, -23 + by],
        [b.x + 4, -19 + by],
      ], M.WHITE, p)
      line(g, [
        [b.x, -21 + by],
        [b.x - 1.4, -16 + by],
      ], M.WHITE, g.newPart(true))
    }
  }
  if (look.role === 'employee' && frontVis) {
    const sk = Math.max(0.35, c)
    fillPoly(g, [
      [front.x - 3.2 * sk, -31.2 + by],
      [front.x, -26.4 + by],
      [front.x + 3.2 * sk, -31.2 + by],
    ], M.WHITE, g.newPart(true))
    fillPoly(g, [
      [front.x - 1.3 * sk, -27.6 + by],
      [front.x + 1.3 * sk, -27.6 + by],
      [front.x + 1.8 * sk, -19 + by],
      [front.x, -17.4 + by],
      [front.x - 1.8 * sk, -19 + by],
    ], M.ACC, g.newPart())
    const bd = bod(-0.55, a)
    if (bd.d > 0) {
      const p = g.newPart()
      fillPoly(g, [
        [bd.x - 1.8, -22.4 + by],
        [bd.x + 1.8, -22.4 + by],
        [bd.x + 1.8, -18 + by],
        [bd.x - 1.8, -18 + by],
      ], M.WHITE, p)
      line(g, [
        [bd.x - 1.6, -22 + by],
        [bd.x + 1.6, -22 + by],
      ], M.BLUE, g.newPart(true))
    }
  }
  if (look.bottom === 2)
    fillPoly(g, [
      [-W - 0.8, -17.6 + by],
      [W + 0.8, -17.6 + by],
      [W + 3.6, -9.2 + by],
      [0, -8.2 + by],
      [-W - 3.6, -9.2 + by],
    ], M.BOT, g.newPart())
  if (look.top === 1 && frontVis) fillEllipse(g, 0, -31.6 + by, W * 0.7, 2.2, M.TOP_DK, g.newPart())

  ;(['R', 'L'] as const).filter((sd) => armD[sd] >= -1.5).forEach(drawArm)

  // ── 머리
  useT('head', f)
  const earR = sph(-Math.PI / 2, a, 1.6, R + 0.2)
  const earL = sph(Math.PI / 2, a, 1.6, R + 0.2)
  const ear = (e: { x: number; y: number; k: number }) => fillEllipse(g, e.x, e.y + hy, 2.4 + 0.5 * Math.max(0, e.k), 3.2, M.SKIN, g.newPart())
  const bun = hd.bun ? sph(Math.PI, a, -10, R + 1) : null
  const drawBun = () => bun && fillEllipse(g, bun.x, bun.y - 3 + hy, 5.6, 5.4, M.HAIR, g.newPart())
  if (bun && bun.k < 0.2) drawBun()
  if (earR.k > -0.35 && earR.k < 0.15) ear(earR)
  if (earL.k > -0.35 && earL.k < 0.15) ear(earL)
  const headP = g.newPart()
  fillEllipse(g, 0, HC + hy, R, R * 0.97, M.SKIN, headP)
  if (earR.k >= 0.15) ear(earR)
  if (earL.k >= 0.15) ear(earL)
  // 머리카락
  const hairP = g.newPart()
  fillPoly(g, capPts(hd, a, 0, undefined, hy), M.HAIR, hairP)
  // 머릿결(어두운 결) + 천사링(밝은 띠)
  const strands = g.newPart(true)
  for (const lam of [-0.75, -0.15, 0.5]) {
    const p1 = sph(lam, a, -R * 0.82, R + hd.vol * 0.6)
    const p2 = sph(lam, a, hairH(hd, lam) - 2.2, R + hd.vol * 0.3)
    if (p1.k > 0.15 && p2.k > 0.15 && hd.vol > 0.8)
      line(g, [
        [p1.x, p1.y + hy],
        [(p1.x + p2.x) / 2 + 0.8, (p1.y + p2.y) / 2 + hy],
        [p2.x, p2.y + hy],
      ], M.HAIR_SH, strands)
  }
  if (hd.long)
    for (const lam of [Math.PI - 0.55, Math.PI, Math.PI + 0.55]) {
      const p1 = sph(lam, a, -2, R + hd.vol * 0.4)
      if (p1.k > 0.15)
        line(g, [
          [p1.x, p1.y + hy],
          [p1.x - 0.6, p1.y + hd.nh * 0.85 + hy],
        ], M.HAIR_SH, strands)
    }
  if (hd.vol > 0.8) {
    const ring: Pt[] = []
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const lam = -1.25 + t * 1.5 - a * 0.15
      const p = sph(lam, a, -R * 0.66, R + hd.vol * 0.75)
      if (p.k > 0.05) ring.push([p.x, p.y + hy])
    }
    if (ring.length > 1) line(g, ring, M.HAIR_HI, g.newPart(true))
  }
  if (tail && tail.k >= 0) drawTail()
  if (bun && bun.k >= 0.2) drawBun()

  // ── 모자
  const h = look.hat
  if (h) {
    const hv = Math.max(hd.vol, 1.3) + (hd.top ? 1.6 : 0.6)
    const hd2: HairDef = { ...hd, top: undefined, vol: hv }
    if (h === 1) {
      const b = sph(0, a, -3.6, R + hv)
      const brim = () => fillEllipse(g, b.x + 4.4 * s, b.y + 0.8 + hy, 8.4 - 3 * s, 2.8 - 1 * s, M.HAT_DK, g.newPart())
      if (b.k < -0.15) brim()
      fillPoly(g, capPts(hd2, a, 0, () => -3.6, hy), M.HAT, g.newPart())
      fillEllipse(g, 0, HC - R - hv + 0.8 + hy, 1.6, 1.4, M.HAT_DK, g.newPart(true))
      if (b.k >= -0.15) brim()
    } else if (h === 2) {
      fillPoly(g, capPts(hd2, a, 0.4, () => -2.8, hy), M.HAT, g.newPart())
      const bandPts = capPts({ ...hd2, vol: hv + 0.9 }, a, 0, () => -2.4, hy).filter(([, y]) => y >= HC - 6.6 + hy)
      if (bandPts.length > 2) fillPoly(g, bandPts, M.HAT_DK, g.newPart())
      fillEllipse(g, 0, HC - R - hv - 2.6 + hy, 3.6, 3.6, M.HAT_LT, g.newPart())
    } else if (h === 3) {
      const bw = R + 1.6
      const p = g.newPart()
      fillPoly(g, [
        [-bw, HC - 8 + hy],
        [bw, HC - 8 + hy],
        [bw - 0.6, HC - 2.4 + hy],
        [0, HC - 0.8 + hy],
        [-bw + 0.6, HC - 2.4 + hy],
      ], M.HAT, p)
      const top = g.newPart()
      for (const [cx, cy, r] of [
        [-7, HC - 14, 7.4],
        [7, HC - 14, 7.4],
        [0, HC - 18.5, 8.6],
      ])
        fillEllipse(g, cx + 1.2 * s, cy + hy, r, r, M.HAT, top)
    } else if (h === 4) {
      const vol = Math.max(hd.vol, 1) + 0.5
      const b1 = capPts({ ...hd, top: undefined, vol }, a, 0, () => -4.2, hy)
      const inside = new Set<number>()
      // 머리띠: 머리 둘레 띠만 (위쪽 머리카락은 그대로)
      const g2 = new Grid()
      fillPoly(g2, capPts({ ...hd, top: undefined, vol }, a, 0, () => -6.8, hy), M.HAT, 1)
      const pBand = g.newPart()
      const tmp = new Grid()
      fillPoly(tmp, b1, M.HAT, 1)
      for (let k = 0; k < SW * SH; k++) if (tmp.mat[k] && !g2.mat[k]) inside.add(k)
      inside.forEach((k) => g.set(k % SW, Math.floor(k / SW), M.HAT, pBand))
      const bow = sph(1.0, a, -6, R + 2)
      if (bow.k > -0.2) {
        const pb = g.newPart()
        fillPoly(g, [
          [bow.x, bow.y + hy],
          [bow.x - 4.4, bow.y - 3 + hy],
          [bow.x - 4.4, bow.y + 3 + hy],
        ], M.HAT, pb)
        fillPoly(g, [
          [bow.x, bow.y + hy],
          [bow.x + 4.4, bow.y - 3 + hy],
          [bow.x + 4.4, bow.y + 3 + hy],
        ], M.HAT, pb)
      }
    } else {
      fillEllipse(g, 0, HC - 6.6 + hy, R + 8.6, 4.4, M.HAT, g.newPart())
      fillPoly(g, capPts({ ...hd2, vol: hv + 0.6 }, a, 0, () => -5, hy), M.HAT, g.newPart())
      line(g, [
        [-R - hv, HC - 7.8 + hy],
        [0, HC - 6.6 + hy],
        [R + hv, HC - 7.8 + hy],
      ], M.ACC, g.newPart(true))
    }
  }
  return { a, s, c, hy, headP, hairP }
}

/* ───────── 도트 패턴 (눈·입) ───────── */
const EYES: Record<string, { n: string[]; f: string[]; cy: number }> = {
  round: { n: ['DDDD', 'DWII', 'DIIL', '.LL.'], f: ['DDD', 'WII', 'ILL', 'L..'], cy: 2 },
  sparkle: { n: ['.DDD', 'DWII', 'DIIW', 'DLLL', '.LL.'], f: ['DDD', 'WII', 'IIW', 'LL.'], cy: 2 },
  happy: { n: ['.DD.', 'D..D'], f: ['DD.', '..D'], cy: 0 },
  sharp: { n: ['DDDDD', 'DWII.', 'DIIL.', '.LL..'], f: ['DDDD', 'WII.', 'ILL.'], cy: 2 },
  sleepy: { n: ['DDDD', 'DIIL', '.LL.'], f: ['DDD', 'ILL'], cy: 0 },
  surprised: { n: ['.DD.', 'DWWD', 'D..D', '.DD.'], f: ['DD.', 'WWD', 'DD.'], cy: 2 },
  tired: { n: ['DDDD', '.LL.'], f: ['DDD', 'LL.'], cy: 0 },
  closed: { n: ['DDDD'], f: ['DDD'], cy: -1 },
}
const MOUTHS: Record<string, string[]> = {
  smile: ['MM'],
  grin: ['MMM', '.T.'],
  cat: ['M.M', '.M.'],
  neutral: ['DD'],
  surprised: ['.M.', 'M.M', '.M.'],
  yawn: ['MMM', 'MTM', '.M.'],
  talkOpen: ['MMM', '.T.'],
  talk: ['MM'],
}

/** 격자 → RGBA (명암·선·외곽선·얼굴) */
function paint(g: Grid, look: Look, ctx: ReturnType<typeof drawBody>, f: FrameSpec): Uint8ClampedArray {
  const hatCol = look.hat === 3 ? '#FBFAF6' : look.hat === 5 ? '#E8C27A' : look.hat === 4 ? look.outfit : look.hat === 2 ? look.outfit : look.outfit
  const R_ = {
    skin: ramp(look.skin),
    hair: ramp(look.hairColor),
    top: ramp(look.outfit),
    bot: ramp(look.bottomColor),
    shoe: ramp(look.shoes),
    white: ramp('#FBF8F0'),
    acc: ramp('#E2453E'),
    hat: ramp(hatCol),
    blue: ramp('#3E6FD6'),
  }
  const stripe = ramp(rgbHex(mix(rgb(look.outfit), [255, 255, 255], 0.55)))
  const famOf = (m: number): Ramp =>
    m === M.SKIN || m === M.SKIN_DK
      ? R_.skin
      : m === M.HAIR || m === M.HAIR_HI || m === M.HAIR_SH
        ? R_.hair
        : m === M.TOP || m === M.TOP_DK
          ? R_.top
          : m === M.TOP_LT
            ? stripe
            : m === M.BOT
              ? R_.bot
              : m === M.SHOE
                ? R_.shoe
                : m === M.WHITE || m === M.WHITE_DK
                  ? R_.white
                  : m === M.ACC
                    ? R_.acc
                    : m === M.BLUE
                      ? R_.blue
                      : R_.hat
  // 부위별 범위 (둥근 명암용)
  const bb = new Map<number, [number, number, number, number, number]>()
  for (let j = 0; j < SH; j++)
    for (let i = 0; i < SW; i++) {
      const p = g.part[j * SW + i]
      if (!p) continue
      const b = bb.get(p)
      if (!b) bb.set(p, [i, j, i, j, 1])
      else {
        b[0] = Math.min(b[0], i)
        b[1] = Math.min(b[1], j)
        b[2] = Math.max(b[2], i)
        b[3] = Math.max(b[3], j)
        b[4]++
      }
    }
  const out = new Uint8ClampedArray(SW * SH * 4)
  const put = (i: number, j: number, c: RGB, a = 255) => {
    const k = (j * SW + i) * 4
    out[k] = c[0]
    out[k + 1] = c[1]
    out[k + 2] = c[2]
    out[k + 3] = a
  }
  const isHair = (m: number) => m === M.HAIR || m === M.HAIR_HI || m === M.HAIR_SH
  for (let j = 0; j < SH; j++)
    for (let i = 0; i < SW; i++) {
      const m = g.mat[j * SW + i]
      if (!m) continue
      const p = g.part[j * SW + i]
      const rp = famOf(m)
      let col: RGB
      if (m === M.HAIR_HI || m === M.HAT_LT) col = rp.l
      else if (m === M.HAIR_SH || m === M.TOP_DK || m === M.WHITE_DK || m === M.HAT_DK || m === M.SKIN_DK) col = rp.s
      else {
        const b = bb.get(p)!
        const u = (i - b[0]) / Math.max(1, b[2] - b[0])
        const v = (j - b[1]) / Math.max(1, b[3] - b[1])
        let tone: 'l' | 'b' | 's' = 'b'
        if (b[4] > 14 && m !== M.SKIN) {
          if (u + v > 1.32) tone = 's'
          else if (u + v < 0.5) tone = 'l'
        }
        if (g.partAt(i + 1, j) !== p || g.partAt(i, j + 1) !== p) tone = 's'
        if (m === M.SKIN && isHair(g.matAt(i, j - 1))) tone = 's'
        col = tone === 's' ? rp.s : tone === 'l' ? rp.l : rp.b
      }
      // 앞에 그려진 부위의 가장자리: 안쪽 선
      if (!g.noLine.has(p)) {
        for (const [di, dj] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const q = g.partAt(i + di, j + dj)
          if (q && q !== p && q < p && !g.noLine.has(q)) {
            col = rp.line
            break
          }
        }
      }
      put(i, j, col)
    }
  // 바깥 외곽선 (빈칸 중 옆에 그림이 있는 칸)
  for (let j = 0; j < SH; j++)
    for (let i = 0; i < SW; i++) {
      if (g.mat[j * SW + i]) continue
      let best: RGB | null = null
      let bestL = 999
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const m = g.matAt(i + di, j + dj)
        if (!m) continue
        const o = famOf(m).o
        const L = o[0] + o[1] + o[2]
        if (L < bestL) {
          bestL = L
          best = o
        }
      }
      if (best) put(i, j, best)
    }

  // ── 얼굴 도트
  const { a, hy } = ctx
  useT('head', f)
  const DARK: RGB = [42, 30, 54]
  const irisBase = rgb(look.eyeColor)
  const iris = mix(irisBase, DARK, 0.25)
  const irisL = mix(irisBase, [255, 255, 255], 0.4)
  const MOUTH: RGB = [122, 46, 54]
  const TONGUE: RGB = [240, 138, 143]
  const stamp = (pat: string[], ci: number, cj: number, cx: number, mirror: boolean, cols: Record<string, RGB>) => {
    pat.forEach((row, r) => {
      const chars = mirror ? [...row].reverse() : [...row]
      chars.forEach((ch, k) => {
        if (ch === '.') return
        const c = cols[ch]
        if (!c) return
        const i = ci - cx + k
        const j = cj + r
        if (i >= 0 && j >= 0 && i < SW && j < SH) put(i, j, c)
      })
    })
  }
  const faceOf = f.face
  const eyeKey =
    faceOf === 'happy'
      ? 'happy'
      : faceOf === 'surprised'
        ? 'surprised'
        : faceOf === 'tired'
          ? 'tired'
          : faceOf === 'yawn' || faceOf === 'closed'
            ? 'closed'
            : (['round', 'sparkle', 'happy', 'sharp', 'sleepy'] as const)[look.eyes % 5]
  const pat = EYES[eyeKey]
  const faceC = sph(0, a, 0.6, R * 0.94)
  const eyes = [sph(-0.46, a, 0.6, R * 0.94), sph(0.46, a, 0.6, R * 0.94)]
  const eyePx: { i: number; j: number; w: number }[] = []
  for (const e of eyes) {
    if (e.k < 0.15) continue
    const [pi, pj] = toPx(e.x, e.y + hy)
    const i = Math.round(pi - 0.5)
    const j = Math.round(pj - 0.5)
    const near = e.k > 0.72
    const rows = near ? pat.n : pat.f
    const mirror = e.x < faceC.x - 0.3
    const w = rows[0].length
    const cx = mirror ? w - 2 : 1
    // 4칸 이상 눈은 바깥쪽으로 한 칸 더
    stamp(rows, i, j - pat.cy, cx, mirror, { D: DARK, W: [255, 255, 255], I: iris, L: irisL })
    eyePx.push({ i, j, w })
    // 눈썹: 앞머리에 가리지 않은 피부 위에만
    const browRow = j - pat.cy - (look.brows === 2 ? 3 : 2) - (faceOf === 'surprised' ? 1 : 0)
    const browCol = look.brows === 2 ? ramp(look.hairColor).s : ramp(look.hairColor).o
    const bw = look.brows === 1 ? 3 : 2
    for (let k = 0; k < bw; k++) {
      const bi = mirror ? i + 1 - k : i - 1 + k + (w >= 4 ? 1 : 0)
      const tilt = faceOf === 'tired' || faceOf === 'yawn' ? (k === bw - 1 ? 1 : 0) : 0
      if (g.matAt(bi, browRow + tilt) === M.SKIN) put(bi, browRow + tilt, browCol)
    }
  }
  // 볼터치
  if (look.blush)
    for (const lam of [-0.86, 0.86]) {
      const p = sph(lam, a, 3.6, R * 0.95)
      if (p.k < 0.25) continue
      const [pi, pj] = toPx(p.x, p.y + hy)
      const i = Math.round(pi - 1)
      const j = Math.round(pj - 0.5)
      const bl = mix(rgb(look.skin), [255, 110, 135], 0.5)
      put(i, j, bl)
      if (p.k > 0.6) put(i + 1, j, bl)
    }
  // 코 (옆으로 돌았을 때만 살짝)
  const nose = sph(0.1, a, 2.6, R * 0.98)
  if (nose.k > 0.2 && nose.k < 0.92) {
    const [pi, pj] = toPx(nose.x, nose.y + hy)
    put(Math.round(pi - 0.5), Math.round(pj - 0.5), ramp(look.skin).s)
  }
  // 입
  const mp = sph(0, a, 5.6, R * 0.94)
  if (mp.k > 0.2) {
    const key =
      faceOf === 'happy' || (faceOf === 'normal' && look.mouth === 1)
        ? 'grin'
        : faceOf === 'surprised'
          ? 'surprised'
          : faceOf === 'yawn'
            ? 'yawn'
            : faceOf === 'talkOpen'
              ? 'talkOpen'
              : faceOf === 'talk'
                ? 'talk'
                : faceOf === 'tired'
                  ? 'neutral'
                  : (['smile', 'grin', 'cat', 'neutral'] as const)[look.mouth % 4]
    const rows = MOUTHS[key]
    const [pi, pj] = toPx(mp.x, mp.y + hy)
    const w = rows[0].length
    const i = Math.round(pi - w / 2)
    const j = Math.round(pj - 0.5)
    stamp(rows, i, j, 0, false, { M: MOUTH, T: TONGUE, D: DARK })
  }
  // 안경
  if (look.glasses && eyePx.length) {
    const FR: RGB = look.glasses === 3 ? [35, 28, 44] : [59, 51, 64]
    for (const e of eyePx) {
      const x0 = e.i - 2
      const x1 = e.i + (e.w >= 3 ? 2 : 1)
      const y0 = e.j - 3
      const y1 = e.j + 2
      if (look.glasses === 3) {
        for (let j = y0 + 1; j <= y1 - 1; j++) for (let i = x0 + 1; i <= x1 - 1; i++) put(i, j, FR)
        put(x0 + 1, y0 + 1, [120, 116, 140])
      }
      for (let i = x0; i <= x1; i++)
        for (const j of [y0, y1]) {
          if (look.glasses === 1 && (i === x0 || i === x1)) continue
          put(i, j, FR)
        }
      for (let j = y0; j <= y1; j++)
        for (const i of [x0, x1]) {
          if (look.glasses === 1 && (j === y0 || j === y1)) continue
          put(i, j, FR)
        }
    }
    if (eyePx.length === 2) {
      const [l, r] = eyePx[0].i < eyePx[1].i ? eyePx : [eyePx[1], eyePx[0]]
      for (let i = l.i + 3; i <= r.i - 2; i++) put(i, l.j - 2, FR)
    }
  }
  return out
}

function rgbHex(c: RGB) {
  return `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
}

export function renderFrame(look: Look, ang: number, f: FrameSpec): Uint8ClampedArray {
  const g = new Grid()
  const ctx = drawBody(g, look, ang, f)
  return paint(g, look, ctx, f)
}

/* ───────── 동작별 프레임 ───────── */
export type StripKind = 'idle' | 'walk' | 'talk' | 'wave' | 'cheer' | 'stretch' | 'work' | 'nod' | 'yawn' | 'hop' | 'look'
export interface StripDef {
  frames: FrameSpec[]
  seq: number[]
  frameMs: number
  iter: number | 'infinite'
}

const base = (face: Face): FrameSpec => ({ legR: 0, legL: 0, liftR: 0, liftL: 0, armR: 0, armL: 0, bodyY: 0, headY: 0, face })
const U = PX // 1칸

export function stripDef(kind: StripKind, ang: number, face: Face, walkSec = 0.46): StripDef {
  const p = Math.sin((ang * Math.PI) / 180)
  const fa = Math.abs(Math.cos((ang * Math.PI) / 180))
  const F = (o: Partial<FrameSpec>, fc: Face = face): FrameSpec => ({ ...base(fc), ...o })
  const nearArm = ang >= 90 ? 'armR' : 'armL'
  switch (kind) {
    case 'walk':
      return {
        frames: [
          F({ legR: -24 * p, legL: 22 * p, armR: 24 * p + 4 * fa, armL: -22 * p - 4 * fa }),
          F({ legR: 2 * p, legL: -8 * p, liftL: 1.4 + 2.2 * fa, armR: 2, armL: -2, bodyY: -U }),
          F({ legR: 22 * p, legL: -24 * p, armR: -22 * p - 4 * fa, armL: 24 * p + 4 * fa }),
          F({ legR: -8 * p, legL: 2 * p, liftR: 1.4 + 2.2 * fa, armR: -2, armL: 2, bodyY: -U }),
        ],
        seq: [0, 1, 2, 3],
        frameMs: (walkSec * 1000) / 4,
        iter: 'infinite',
      }
    case 'talk':
      return { frames: [F({}, 'talkOpen'), F({}, 'talk'), F({ headY: -U * 0.6 }, 'talkOpen')], seq: [0, 1, 2, 1], frameMs: 140, iter: 'infinite' }
    case 'wave':
      return { frames: [F({ [nearArm]: -150 }, 'happy'), F({ [nearArm]: -124 }, 'happy')], seq: [0, 1, 0, 1], frameMs: 200, iter: 2 }
    case 'cheer':
      return {
        frames: [
          F({ bodyY: U, armR: 40, armL: -40 }, 'happy'),
          F({ bodyY: -8, liftR: 8, liftL: 8, armR: 165, armL: -165 }, 'happy'),
          F({ bodyY: -5, liftR: 5, liftL: 5, armR: 150, armL: -150 }, 'happy'),
          F({ armR: 70, armL: -70 }, 'happy'),
        ],
        seq: [0, 1, 2, 3],
        frameMs: 140,
        iter: 2,
      }
    case 'work':
      return { frames: [F({ armL: -112, armR: -32, headY: U }), F({ armL: -36, armR: -32, headY: U, bodyY: U * 0.5 })], seq: [0, 1], frameMs: 170, iter: 5 }
    case 'stretch':
      return { frames: [F({ armR: 90, armL: -90 }), F({ armR: 168, armL: -168, bodyY: -U }, 'closed')], seq: [0, 1, 1], frameMs: 600, iter: 1 }
    case 'yawn':
      return { frames: [F({ armR: 118, armL: -118 }, 'yawn'), F({ armR: 128, armL: -128, headY: -U * 0.6 }, 'yawn')], seq: [0, 1], frameMs: 550, iter: 2 }
    case 'nod':
      return { frames: [F({ headY: U }, face === 'normal' ? 'happy' : face), F({})], seq: [0, 1], frameMs: 220, iter: 2 }
    case 'hop':
      return { frames: [F({ bodyY: -5, liftR: 5, liftL: 5 }, 'surprised'), F({}, 'happy')], seq: [0, 1], frameMs: 250, iter: 1 }
    case 'idle':
    case 'look':
    default:
      return {
        frames: [F({}), F({ bodyY: -U * 0.7, armR: 2, armL: -2 }), F({}, face === 'tired' ? 'closed' : 'closed')],
        seq: [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 2],
        frameMs: 300,
        iter: 'infinite',
      }
  }
}

/** 시트용 정지 포즈 */
export function poseFrame(pose: 'idle' | 'walk' | 'wave' | 'cheer' | 'work', ang: number, face: Face): FrameSpec {
  if (pose === 'walk') return stripDef('walk', ang, face).frames[0]
  if (pose === 'wave') return stripDef('wave', ang, face).frames[0]
  if (pose === 'work') return stripDef('work', ang, face).frames[0]
  if (pose === 'cheer') return { ...base('happy'), armR: 160, armL: -160 }
  return base(face)
}

/* ───────── 캐시된 스트립 이미지 ───────── */
const cache = new Map<string, { url: string; n: number }>()

export function stripImage(look: Look, ang: number, frames: FrameSpec[], seq: number[], key: string): { url: string; n: number } {
  const k = `${JSON.stringify(look)}|${ang}|${key}`
  const hit = cache.get(k)
  if (hit) return hit
  if (typeof document === 'undefined') return { url: '', n: 1 }
  const rendered = frames.map((f) => renderFrame(look, ang, f))
  const canvas = document.createElement('canvas')
  canvas.width = SW * seq.length
  canvas.height = SH
  const ctx2 = canvas.getContext('2d')
  if (!ctx2) return { url: '', n: 1 }
  seq.forEach((fi, idx) => ctx2.putImageData(new ImageData(new Uint8ClampedArray(rendered[fi]), SW, SH), idx * SW, 0))
  const res = { url: canvas.toDataURL('image/png'), n: seq.length }
  if (cache.size > 400) cache.clear()
  cache.set(k, res)
  return res
}
