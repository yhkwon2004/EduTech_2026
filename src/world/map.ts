/**
 * 골목 마을 지도 — 아이소메트릭 격자 (x: 오른쪽 아래, y: 왼쪽 아래)
 * 화면 좌표: sx = (x - y) * 32, sy = (x + y) * 16
 */

export const TW = 64
export const TH = 32
export const MAP_W = 26
export const MAP_H = 20

export function iso(x: number, y: number, z = 0): { x: number; y: number } {
  return { x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) - z }
}

/** 화면(월드 px) → 타일 좌표 */
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TW / 2)
  const b = sy / (TH / 2)
  return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) }
}

export type Ground = 'grass' | 'road' | 'plaza' | 'path' | 'water' | 'sand' | 'soil'

export type BuildingId = 'shop' | 'workshop' | 'market' | 'academy' | 'company' | 'support' | 'board'
export type HitId = BuildingId | `rival:${number}` | `plot:${string}`

export interface BuildingDef {
  id: BuildingId
  name: string
  x: number
  y: number
  w: number
  d: number
  /** 문 앞 타일 (캐릭터가 걸어가는 곳) */
  door: { x: number; y: number }
  /** 문이 있는 면: 'y' = 왼쪽 아래 면, 'x' = 오른쪽 아래 면 */
  doorSide: 'x' | 'y'
  desc: string
}

export interface RivalLot {
  index: number
  x: number
  y: number
  door: { x: number; y: number }
  doorSide: 'x' | 'y'
}

export interface PlotDef {
  id: string
  x: number
  y: number
  kind: 'field' | 'paddy'
  /** 이 레벨부터 사용 */
  level: number
}

export type DecoKind = 'tree' | 'pine' | 'bush' | 'flowers' | 'lamp' | 'bench' | 'fenceX' | 'fenceY' | 'rock' | 'lily' | 'reeds' | 'cart' | 'well'

export interface DecoDef {
  kind: DecoKind
  x: number
  y: number
  v?: number
}

export const BUILDINGS: BuildingDef[] = [
  { id: 'shop', name: '내 가게', x: 14, y: 5, w: 3, d: 3, door: { x: 15, y: 8 }, doorSide: 'y', desc: '영업하기 · 판매 항목 · 가게 투자' },
  { id: 'workshop', name: '공방 주방', x: 18, y: 6, w: 2, d: 2, door: { x: 18, y: 8 }, doorSide: 'y', desc: '재료로 상품 만들기' },
  { id: 'market', name: '도매시장', x: 3, y: 5, w: 3, d: 3, door: { x: 4, y: 8 }, doorSide: 'y', desc: '씨앗·재료 사고 작물 팔기' },
  { id: 'academy', name: '골목 배움터', x: 7, y: 5, w: 3, d: 3, door: { x: 8, y: 8 }, doorSide: 'y', desc: '3분 레슨 · 복습 · 상담 창구' },
  { id: 'support', name: '창업지원센터', x: 6, y: 1, w: 2, d: 2, door: { x: 7, y: 3 }, doorSide: 'y', desc: '지원사업 · 정책자금 · 세금 신고' },
  { id: 'company', name: '골목상사', x: 8, y: 12, w: 3, d: 3, door: { x: 11, y: 13 }, doorSide: 'x', desc: '입사 · 출근 · 승진' },
  { id: 'board', name: '마을 게시판', x: 10, y: 7, w: 1, d: 1, door: { x: 10, y: 8 }, doorSide: 'y', desc: '퀘스트 · 랭킹 · 동네 소식' },
]

export const BUILDING_MAP = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, BuildingDef>

/** 경쟁 가게 7곳의 자리 */
/** 창업 전에 보이는 이웃 가게 이름 */
export const RIVAL_PLACEHOLDER = [
  { name: '행복 분식', emoji: '🍢' },
  { name: '달빛 카페', emoji: '☕' },
  { name: '소문난 국밥', emoji: '🍲' },
  { name: '청년 베이커리', emoji: '🥐' },
  { name: '꽃길 꽃집', emoji: '🌸' },
  { name: '정다운 반찬', emoji: '🥬' },
  { name: '새벽 떡집', emoji: '🍡' },
]

export const RIVAL_LOTS: RivalLot[] = [
  { index: 0, x: 0, y: 6, door: { x: 1, y: 8 }, doorSide: 'y' },
  { index: 1, x: 21, y: 6, door: { x: 21, y: 8 }, doorSide: 'y' },
  { index: 2, x: 23, y: 6, door: { x: 23, y: 8 }, doorSide: 'y' },
  { index: 3, x: 14, y: 1, door: { x: 14, y: 3 }, doorSide: 'y' },
  { index: 4, x: 17, y: 1, door: { x: 17, y: 3 }, doorSide: 'y' },
  { index: 5, x: 3, y: 11, door: { x: 5, y: 11 }, doorSide: 'x' },
  { index: 6, x: 0, y: 1, door: { x: 1, y: 3 }, doorSide: 'y' },
]

export const PLOTS: PlotDef[] = [
  ...[15, 16, 17, 18].map((x, i) => ({ id: `f${i}`, x, y: 12, kind: 'field' as const, level: i < 3 ? 1 : 2 })),
  ...[15, 16, 17, 18].map((x, i) => ({ id: `f${i + 4}`, x, y: 13, kind: 'field' as const, level: i < 1 ? 2 : i < 3 ? 3 : 5 })),
  ...[
    [21, 12],
    [22, 12],
    [21, 13],
    [22, 13],
  ].map(([x, y], i) => ({ id: `r${i}`, x, y, kind: 'paddy' as const, level: i < 2 ? 1 : i < 3 ? 3 : 4 })),
]

export const PLOT_MAP = Object.fromEntries(PLOTS.map((p) => [p.id, p])) as Record<string, PlotDef>

function buildGround(): Ground[][] {
  const g: Ground[][] = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => 'grass' as Ground))
  const set = (x: number, y: number, t: Ground) => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) g[y][x] = t
  }
  // 큰길
  for (let x = 0; x < MAP_W; x++) set(x, 9, 'road')
  for (let y = 0; y < MAP_H; y++) set(12, y, 'road')
  // 광장
  for (let x = 11; x <= 13; x++) for (let y = 8; y <= 10; y++) set(x, y, 'plaza')
  // 골목길
  for (let x = 0; x <= 11; x++) set(x, 3, 'path')
  for (let x = 13; x <= 19; x++) set(x, 3, 'path')
  for (let x = 4; x <= 11; x++) set(x, 11, 'path')
  // 가게 앞 보도
  for (let x = 0; x < MAP_W; x++) if (g[8][x] === 'grass') set(x, 8, 'path')
  // 밭·논 주변 흙길
  for (let x = 14; x <= 23; x++) set(x, 11, 'path')
  for (let x = 14; x <= 23; x++) set(x, 14, 'path')
  set(14, 12, 'path')
  set(14, 13, 'path')
  set(19, 12, 'path')
  set(19, 13, 'path')
  set(20, 12, 'path')
  set(20, 13, 'path')
  set(23, 12, 'path')
  set(23, 13, 'path')
  for (const p of PLOTS) set(p.x, p.y, p.kind === 'paddy' ? 'water' : 'soil')
  // 연못
  for (let x = 1; x <= 4; x++) for (let y = 15; y <= 18; y++) set(x, y, 'water')
  set(2, 14, 'water')
  set(3, 14, 'water')
  set(5, 16, 'water')
  for (const [x, y] of [
    [0, 15],
    [0, 16],
    [1, 14],
    [4, 14],
    [5, 15],
    [5, 17],
    [1, 19],
    [2, 19],
    [3, 19],
    [4, 19],
  ])
    if (g[y]?.[x] === 'grass') set(x, y, 'sand')
  return g
}

export const GROUND = buildGround()

/** 장식 — 길·건물에 겹치지 않게 지정 */
export const DECOS: DecoDef[] = [
  // 나무
  ...[
    [0, 0],
    [3, 0],
    [9, 0],
    [11, 1],
    [20, 0],
    [23, 1],
    [25, 0],
    [25, 4],
    [2, 2],
    [10, 5],
    [13, 4],
    [20, 4],
    [0, 12],
    [1, 10],
    [6, 13],
    [7, 16],
    [9, 18],
    [13, 16],
    [16, 17],
    [19, 16],
    [22, 17],
    [25, 15],
    [25, 11],
    [24, 2],
    [14, 18],
  ].map(([x, y], i) => ({ kind: (i % 3 === 0 ? 'pine' : 'tree') as DecoKind, x, y, v: i })),
  ...[
    [5, 4],
    [10, 4],
    [17, 5],
    [6, 7],
    [20, 7],
    [0, 4],
    [13, 15],
    [6, 18],
    [24, 12],
    [11, 17],
  ].map(([x, y], i) => ({ kind: 'bush' as DecoKind, x, y, v: i })),
  ...[
    [2, 8],
    [6, 8],
    [16, 8],
    [20, 8],
    [11, 6],
    [7, 10],
    [16, 10],
    [24, 10],
    [5, 13],
    [9, 16],
    [17, 16],
    [8, 2],
  ].map(([x, y], i) => ({ kind: 'flowers' as DecoKind, x, y, v: i })),
  { kind: 'lamp', x: 11, y: 7 },
  { kind: 'lamp', x: 14, y: 10 },
  { kind: 'lamp', x: 11, y: 10 },
  { kind: 'lamp', x: 3, y: 10 },
  { kind: 'lamp', x: 22, y: 10 },
  { kind: 'lamp', x: 13, y: 2 },
  { kind: 'bench', x: 10, y: 10 },
  { kind: 'bench', x: 14, y: 8 },
  { kind: 'well', x: 13, y: 7 },
  { kind: 'cart', x: 2, y: 8 },
  { kind: 'rock', x: 5, y: 18 },
  { kind: 'rock', x: 0, y: 14 },
  { kind: 'lily', x: 2, y: 16 },
  { kind: 'lily', x: 3, y: 17 },
  { kind: 'reeds', x: 1, y: 15 },
  { kind: 'reeds', x: 4, y: 18 },
  // 밭 울타리
  ...[15, 16, 17, 18].map((x) => ({ kind: 'fenceX' as DecoKind, x, y: 10 })),
  ...[21, 22].map((x) => ({ kind: 'fenceX' as DecoKind, x, y: 10 })),
  ...[15, 16, 17, 18, 21, 22].map((x) => ({ kind: 'fenceX' as DecoKind, x, y: 15 })),
]

/** 걸을 수 있는 타일 */
function buildWalk(): boolean[][] {
  const w = GROUND.map((row) => row.map((t) => t !== 'water' && t !== 'soil'))
  const block = (x: number, y: number) => {
    if (w[y]?.[x] !== undefined) w[y][x] = false
  }
  for (const b of BUILDINGS) for (let i = 0; i < b.w; i++) for (let j = 0; j < b.d; j++) block(b.x + i, b.y + j)
  for (const r of RIVAL_LOTS) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) block(r.x + i, r.y + j)
  for (const d of DECOS) if (d.kind !== 'flowers' && d.kind !== 'lily') block(d.x, d.y)
  return w
}

export const WALK = buildWalk()

export function walkable(x: number, y: number): boolean {
  return !!WALK[y]?.[x]
}

/** A* 길찾기 (4방향). 목적지가 막혀 있으면 가장 가까운 걸을 수 있는 칸으로 */
export function findPath(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] {
  const goal = walkable(to.x, to.y) ? to : nearestWalkable(to, from)
  if (!goal) return []
  if (from.x === goal.x && from.y === goal.y) return []
  const key = (x: number, y: number) => y * MAP_W + x
  const open: { x: number; y: number; f: number; g: number }[] = [{ ...from, f: 0, g: 0 }]
  const came = new Map<number, number>()
  const gScore = new Map<number, number>([[key(from.x, from.y), 0]])
  const h = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y)
  const closed = new Set<number>()
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i
    const cur = open.splice(bi, 1)[0]
    const ck = key(cur.x, cur.y)
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: { x: number; y: number }[] = []
      let k: number | undefined = ck
      while (k !== undefined && k !== key(from.x, from.y)) {
        path.push({ x: k % MAP_W, y: Math.floor(k / MAP_W) })
        k = came.get(k)
      }
      return path.reverse()
    }
    closed.add(ck)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (!walkable(nx, ny)) continue
      const nk = key(nx, ny)
      if (closed.has(nk)) continue
      // 길 위를 걷는 걸 살짝 선호
      const t = GROUND[ny][nx]
      const step = t === 'road' || t === 'plaza' || t === 'path' ? 1 : 1.25
      const g = cur.g + step
      if (g < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, g)
        came.set(nk, ck)
        const existing = open.find((o) => o.x === nx && o.y === ny)
        if (existing) {
          existing.g = g
          existing.f = g + h(nx, ny)
        } else open.push({ x: nx, y: ny, g, f: g + h(nx, ny) })
      }
    }
  }
  return []
}

export function nearestWalkable(t: { x: number; y: number }, from?: { x: number; y: number }): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null
  let bestD = Infinity
  for (let r = 1; r <= 4; r++) {
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        const x = t.x + dx
        const y = t.y + dy
        if (!walkable(x, y)) continue
        const d = Math.abs(dx) + Math.abs(dy) + (from ? (Math.abs(x - from.x) + Math.abs(y - from.y)) * 0.01 : 0)
        if (d < bestD) {
          bestD = d
          best = { x, y }
        }
      }
    if (best) return best
  }
  return best
}

/** 지도 전체를 담는 월드 px 경계 */
export const WORLD_BOUNDS = (() => {
  const left = iso(0, MAP_H).x
  const right = iso(MAP_W, 0).x
  const top = iso(0, 0).y - 140
  const bottom = iso(MAP_W, MAP_H).y + 20
  return { left, right, top, bottom, width: right - left, height: bottom - top }
})()
