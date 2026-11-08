import { hash, rng } from '@/lib/rng'

/**
 * 골목 푸드 컴퍼니 — 식품 공장 경영 (원작 없는 오리지널 타이쿤)
 * 원료(텃밭 작물·도매 재료) → 생산 라인에서 포장식품 생산 → 유통 채널에 납품 → 회사 EXP → 레벨업
 * 레벨이 오르면 연구개발(R&D)·공장 증설·새 유통 채널이 열려요.
 */

export interface FoodProduct {
  id: string
  name: string
  emoji: string
  inputs: { id: string; qty: number }[]
  /** 한 번 돌리면 나오는 개수 */
  batch: number
  minutes: number
  /** 직판 기준가 (개당) */
  price: number
  /** 이 연구를 끝내야 생산 (없으면 처음부터) */
  research?: string
  desc: string
}

export const PRODUCTS: FoodProduct[] = [
  {
    id: 'onigiri',
    name: '삼각김밥',
    emoji: '🍙',
    inputs: [
      { id: 'rice', qty: 3 },
      { id: 'seaweed', qty: 2 },
    ],
    batch: 20,
    minutes: 2,
    price: 1200,
    desc: '편의점의 영원한 베스트셀러',
  },
  {
    id: 'ricecake',
    name: '꿀떡',
    emoji: '🍡',
    inputs: [
      { id: 'rice', qty: 4 },
      { id: 'sugar', qty: 1 },
    ],
    batch: 20,
    minutes: 2,
    price: 900,
    desc: '쌀로 만드는 간식',
  },
  {
    id: 'chips',
    name: '감자칩',
    emoji: '🥔',
    inputs: [
      { id: 'potato', qty: 4 },
      { id: 'cup', qty: 2 },
    ],
    batch: 24,
    minutes: 2.5,
    price: 1500,
    desc: '바삭하게 튀겨 포장',
  },
  {
    id: 'kimchi',
    name: '포장김치',
    emoji: '🥬',
    inputs: [
      { id: 'cabbage', qty: 5 },
      { id: 'pepper', qty: 2 },
      { id: 'sauce', qty: 2 },
    ],
    batch: 16,
    minutes: 3,
    price: 2500,
    research: 'kimchi',
    desc: '발효 공정으로 깊은 맛',
  },
  {
    id: 'bread',
    name: '식빵',
    emoji: '🍞',
    inputs: [
      { id: 'wheat', qty: 4 },
      { id: 'egg', qty: 1 },
      { id: 'butter', qty: 1 },
      { id: 'milk', qty: 1 },
    ],
    batch: 16,
    minutes: 3,
    price: 2200,
    research: 'bakery',
    desc: '아침 식탁의 기본',
  },
  {
    id: 'cookie',
    name: '쿠키 박스',
    emoji: '🍪',
    inputs: [
      { id: 'wheat', qty: 3 },
      { id: 'butter', qty: 2 },
      { id: 'sugar', qty: 2 },
      { id: 'egg', qty: 2 },
    ],
    batch: 12,
    minutes: 3,
    price: 3000,
    research: 'bakery',
    desc: '선물용 상자 포장',
  },
  {
    id: 'coffee',
    name: '병커피',
    emoji: '🧋',
    inputs: [
      { id: 'coffee', qty: 3 },
      { id: 'milk', qty: 2 },
      { id: 'cup', qty: 4 },
    ],
    batch: 20,
    minutes: 2.5,
    price: 2000,
    research: 'beverage',
    desc: '출근길 필수 음료',
  },
  {
    id: 'juice',
    name: '토마토주스',
    emoji: '🧃',
    inputs: [
      { id: 'tomato', qty: 4 },
      { id: 'sugar', qty: 1 },
      { id: 'cup', qty: 4 },
    ],
    batch: 16,
    minutes: 2,
    price: 1800,
    research: 'beverage',
    desc: '착즙 음료',
  },
  {
    id: 'dumpling',
    name: '냉동만두',
    emoji: '🥟',
    inputs: [
      { id: 'wheat', qty: 3 },
      { id: 'meat', qty: 2 },
      { id: 'cabbage', qty: 2 },
    ],
    batch: 20,
    minutes: 4,
    price: 3200,
    research: 'frozen',
    desc: '급속 냉동으로 오래 보관',
  },
  {
    id: 'cutlet',
    name: '냉동돈까스',
    emoji: '🍖',
    inputs: [
      { id: 'meat', qty: 4 },
      { id: 'egg', qty: 2 },
      { id: 'wheat', qty: 2 },
    ],
    batch: 12,
    minutes: 4,
    price: 4000,
    research: 'frozen',
    desc: '마트 냉동 코너 인기 상품',
  },
  {
    id: 'jam',
    name: '딸기잼',
    emoji: '🍓',
    inputs: [
      { id: 'strawberry', qty: 4 },
      { id: 'sugar', qty: 3 },
    ],
    batch: 12,
    minutes: 3,
    price: 3500,
    research: 'dessert',
    desc: '유리병에 담은 수제 잼',
  },
  {
    id: 'cake',
    name: '딸기 케이크',
    emoji: '🍰',
    inputs: [
      { id: 'strawberry', qty: 3 },
      { id: 'wheat', qty: 2 },
      { id: 'milk', qty: 2 },
      { id: 'sugar', qty: 2 },
      { id: 'butter', qty: 1 },
    ],
    batch: 6,
    minutes: 4,
    price: 7000,
    research: 'dessert',
    desc: '프리미엄 디저트',
  },
  {
    id: 'lunchbox',
    name: '프리미엄 도시락',
    emoji: '🍱',
    inputs: [
      { id: 'rice', qty: 4 },
      { id: 'meat', qty: 2 },
      { id: 'egg', qty: 2 },
      { id: 'cabbage', qty: 2 },
      { id: 'cup', qty: 4 },
    ],
    batch: 10,
    minutes: 4,
    price: 5500,
    research: 'lunchbox',
    desc: '온라인·수출용 대표 상품',
  },
]
export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<string, FoodProduct>

/* ───────── 연구개발 ───────── */
export type ResearchEffect =
  | { kind: 'product' }
  | { kind: 'speed'; value: number }
  | { kind: 'price'; value: number }
  | { kind: 'warehouse'; value: number }
  | { kind: 'channel'; channel: ChannelId }
  | { kind: 'supply'; value: number }
  | { kind: 'lab' }

export interface ResearchDef {
  id: string
  name: string
  emoji: string
  desc: string
  cost: number
  minutes: number
  /** 회사 레벨 */
  level: number
  /** 먼저 끝내야 하는 연구 */
  after?: string
  effect: ResearchEffect
  /** 열리는 제품 (effect product 일 때) */
  products?: string[]
}

export const RESEARCH: ResearchDef[] = [
  { id: 'kimchi', name: '발효 공정', emoji: '🧪', desc: '포장김치를 만들 수 있어요', cost: 20000, minutes: 2, level: 1, effect: { kind: 'product' }, products: ['kimchi'] },
  { id: 'auto1', name: '자동화 I', emoji: '⚙️', desc: '모든 라인 생산 속도 +20%', cost: 30000, minutes: 3, level: 1, effect: { kind: 'speed', value: 0.2 } },
  { id: 'dist1', name: '유통 계약: 편의점', emoji: '🏪', desc: '편의점 납품 주문이 들어와요 (기준가 ×1.3)', cost: 25000, minutes: 2, level: 2, effect: { kind: 'channel', channel: 'cvs' } },
  { id: 'bakery', name: '제빵 라인', emoji: '🍞', desc: '식빵·쿠키 박스', cost: 50000, minutes: 4, level: 2, after: 'kimchi', effect: { kind: 'product' }, products: ['bread', 'cookie'] },
  { id: 'quality1', name: '품질 관리 I', emoji: '✅', desc: '모든 제품 가격 +10%', cost: 40000, minutes: 3, level: 2, effect: { kind: 'price', value: 0.1 } },
  { id: 'supply', name: '원료 공급 계약', emoji: '🚚', desc: '공장에서 원료를 바로 사요 (시세 ×1.15)', cost: 35000, minutes: 2, level: 2, effect: { kind: 'supply', value: 1.15 } },
  { id: 'beverage', name: '음료 라인', emoji: '🧋', desc: '병커피·토마토주스', cost: 70000, minutes: 4, level: 3, after: 'bakery', effect: { kind: 'product' }, products: ['coffee', 'juice'] },
  { id: 'warehouse1', name: '물류 창고 I', emoji: '📦', desc: '완제품 보관 +200', cost: 45000, minutes: 3, level: 3, effect: { kind: 'warehouse', value: 200 } },
  { id: 'dist2', name: '유통 계약: 대형마트', emoji: '🛒', desc: '대형마트 대량 주문 (×1.5)', cost: 80000, minutes: 4, level: 3, after: 'dist1', effect: { kind: 'channel', channel: 'mart' } },
  { id: 'auto2', name: '자동화 II', emoji: '🤖', desc: '생산 속도 +20% 더', cost: 120000, minutes: 5, level: 4, after: 'auto1', effect: { kind: 'speed', value: 0.2 } },
  { id: 'frozen', name: '냉동 공정', emoji: '❄️', desc: '냉동만두·냉동돈까스', cost: 150000, minutes: 5, level: 4, after: 'beverage', effect: { kind: 'product' }, products: ['dumpling', 'cutlet'] },
  { id: 'package', name: '포장 디자인', emoji: '🎀', desc: '가격 +10%, 온라인몰 입점 조건', cost: 90000, minutes: 4, level: 4, after: 'quality1', effect: { kind: 'price', value: 0.1 } },
  { id: 'dist3', name: '유통 계약: 온라인몰', emoji: '📱', desc: '온라인 주문 (×1.6)', cost: 160000, minutes: 5, level: 5, after: 'package', effect: { kind: 'channel', channel: 'online' } },
  { id: 'lab2', name: '연구소 확장', emoji: '🔬', desc: '연구 2개 동시 진행', cost: 200000, minutes: 5, level: 5, effect: { kind: 'lab' } },
  { id: 'dessert', name: '디저트 라인', emoji: '🍰', desc: '딸기잼·딸기 케이크', cost: 250000, minutes: 6, level: 5, after: 'frozen', effect: { kind: 'product' }, products: ['jam', 'cake'] },
  { id: 'warehouse2', name: '물류 창고 II', emoji: '🏬', desc: '완제품 보관 +300', cost: 180000, minutes: 5, level: 5, after: 'warehouse1', effect: { kind: 'warehouse', value: 300 } },
  { id: 'quality2', name: '품질 관리 II (HACCP)', emoji: '🏅', desc: '가격 +15%', cost: 300000, minutes: 6, level: 6, after: 'quality1', effect: { kind: 'price', value: 0.15 } },
  { id: 'lunchbox', name: '프리미엄 도시락', emoji: '🍱', desc: '수출용 대표 상품', cost: 350000, minutes: 6, level: 6, after: 'dessert', effect: { kind: 'product' }, products: ['lunchbox'] },
  { id: 'dist4', name: '유통 계약: 수출', emoji: '✈️', desc: '해외 바이어 대량 주문 (×2.0)', cost: 500000, minutes: 8, level: 7, after: 'dist3', effect: { kind: 'channel', channel: 'export' } },
]
export const RESEARCH_MAP = Object.fromEntries(RESEARCH.map((r) => [r.id, r])) as Record<string, ResearchDef>

/* ───────── 공장 증설 ───────── */
export interface ExpansionDef {
  id: string
  name: string
  emoji: string
  desc: string
  cost: number
  level: number
  /** 생산 라인 수가 이만큼 되어요 */
  lines: number
}
export const EXPANSIONS: ExpansionDef[] = [
  { id: 'line2', name: '2호 라인 증설', emoji: '🏭', desc: '동시에 2가지를 생산해요', cost: 50000, level: 2, lines: 2 },
  { id: 'line3', name: '3호 라인 증설', emoji: '🏭', desc: '라인 3개', cost: 150000, level: 3, lines: 3 },
  { id: 'line4', name: '4호 라인 증설', emoji: '🏭', desc: '라인 4개', cost: 400000, level: 5, lines: 4 },
  { id: 'line5', name: '5호 라인 증설', emoji: '🏭', desc: '라인 5개 (최대)', cost: 1000000, level: 7, lines: 5 },
]
export const EXPANSION_MAP = Object.fromEntries(EXPANSIONS.map((e) => [e.id, e])) as Record<string, ExpansionDef>

/* ───────── 유통 채널 ───────── */
export type ChannelId = 'direct' | 'cvs' | 'mart' | 'online' | 'export'
export interface ChannelDef {
  id: ChannelId
  name: string
  emoji: string
  mul: number
  /** 주문 수량 범위 */
  qty: [number, number]
  /** 하루 주문 수 */
  orders: number
  desc: string
}
export const CHANNELS: ChannelDef[] = [
  { id: 'direct', name: '직판', emoji: '🏪', mul: 1, qty: [0, 0], orders: 0, desc: '언제든 기준가로 바로 팔아요' },
  { id: 'cvs', name: '편의점', emoji: '🏪', mul: 1.3, qty: [10, 30], orders: 3, desc: '소량·자주' },
  { id: 'mart', name: '대형마트', emoji: '🛒', mul: 1.5, qty: [30, 80], orders: 2, desc: '대량 주문' },
  { id: 'online', name: '온라인몰', emoji: '📱', mul: 1.6, qty: [20, 60], orders: 3, desc: '포장이 중요해요' },
  { id: 'export', name: '수출', emoji: '✈️', mul: 2, qty: [80, 200], orders: 2, desc: '해외 바이어' },
]
export const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, ChannelDef>

export interface Order {
  id: string
  channel: ChannelId
  productId: string
  qty: number
  unit: number
  xp: number
}

/* ───────── 회사 레벨 ───────── */
export const LEVEL_PERKS: Record<number, string[]> = {
  2: ['🏪 편의점 유통 연구', '🏭 2호 라인', '🍞 제빵 라인 연구', '🚚 원료 공급 계약'],
  3: ['🛒 대형마트 유통 연구', '🏭 3호 라인', '🧋 음료 라인', '📦 물류 창고'],
  4: ['❄️ 냉동 공정', '🤖 자동화 II', '🎀 포장 디자인'],
  5: ['📱 온라인몰', '🔬 연구소 확장', '🍰 디저트 라인', '🏭 4호 라인'],
  6: ['🏅 HACCP 품질 관리', '🍱 프리미엄 도시락'],
  7: ['✈️ 수출', '🏭 5호 라인 (최대)'],
}
export const MAX_LEVEL = 9
export function companyLevel(xp: number) {
  let level = 1
  while (level < MAX_LEVEL && 300 * level * level <= xp) level++
  const cur = level === 1 ? 0 : 300 * (level - 1) * (level - 1)
  const next = 300 * level * level
  return { level, cur, next, progress: level >= MAX_LEVEL ? 1 : (xp - cur) / (next - cur) }
}

/* ───────── 계산 ───────── */
export interface CompanyView {
  xp: number
  done: string[]
  lines: number
  fast?: boolean
}

export function speedMul(done: string[]) {
  return 1 + done.reduce((n, id) => n + (RESEARCH_MAP[id]?.effect.kind === 'speed' ? (RESEARCH_MAP[id].effect as { value: number }).value : 0), 0)
}
export function priceMul(done: string[]) {
  return 1 + done.reduce((n, id) => n + (RESEARCH_MAP[id]?.effect.kind === 'price' ? (RESEARCH_MAP[id].effect as { value: number }).value : 0), 0)
}
export function warehouseCap(done: string[]) {
  return 200 + done.reduce((n, id) => n + (RESEARCH_MAP[id]?.effect.kind === 'warehouse' ? (RESEARCH_MAP[id].effect as { value: number }).value : 0), 0)
}
export function labSlots(done: string[]) {
  return done.includes('lab2') ? 2 : 1
}
export function supplyMul(done: string[]): number | null {
  const r = done.find((id) => RESEARCH_MAP[id]?.effect.kind === 'supply')
  return r ? (RESEARCH_MAP[r].effect as { value: number }).value : null
}
export function openChannels(done: string[], level: number): ChannelId[] {
  const out: ChannelId[] = ['direct']
  for (const id of done) {
    const e = RESEARCH_MAP[id]?.effect
    if (e?.kind === 'channel' && level >= RESEARCH_MAP[id].level) out.push(e.channel)
  }
  return out
}
export function unlockedProducts(done: string[]) {
  return PRODUCTS.filter((p) => !p.research || done.includes(p.research))
}
export function productionMs(p: FoodProduct, done: string[], fast = false) {
  return (p.minutes * 60_000) / speedMul(done) / (fast ? 10 : 1)
}
export function unitPrice(p: FoodProduct, done: string[], channel: ChannelId = 'direct') {
  return Math.round((p.price * priceMul(done) * CHANNEL_MAP[channel].mul) / 10) * 10
}

/** 연구를 시작할 수 있나 */
export function researchState(r: ResearchDef, c: { xp: number; done: string[]; active: Record<string, number> }, cash: number): { state: 'done' | 'active' | 'ready' | 'locked'; why: string[] } {
  if (c.done.includes(r.id)) return { state: 'done', why: [] }
  if (c.active[r.id]) return { state: 'active', why: [] }
  const why: string[] = []
  const lv = companyLevel(c.xp).level
  if (lv < r.level) why.push(`회사 Lv.${r.level}`)
  if (r.after && !c.done.includes(r.after)) why.push(`「${RESEARCH_MAP[r.after].name}」 먼저`)
  if (Object.keys(c.active).length >= labSlots(c.done)) why.push('연구소가 바빠요')
  if (cash < r.cost) why.push(`${r.cost.toLocaleString()}원`)
  return { state: why.length ? 'locked' : 'ready', why }
}

/** 오늘의 납품 주문 (날짜·채널·열린 제품으로 정해져요) */
export function ordersFor(date: string, done: string[], level: number, staff?: { marketing?: number }): Order[] {
  const products = unlockedProducts(done)
  const out: Order[] = []
  const extra = Math.min(3, staff?.marketing ?? 0)
  for (const ch of openChannels(done, level)) {
    const def = CHANNEL_MAP[ch]
    if (!def.orders) continue
    const r = rng(hash(`orders:${date}:${ch}:${level}`))
    for (let k = 0; k < def.orders + extra; k++) {
      const p = products[Math.floor(r() * products.length)]
      const qty = Math.round((def.qty[0] + r() * (def.qty[1] - def.qty[0])) / 2) * 2
      const unit = Math.round((unitPrice(p, done, ch) * (0.95 + r() * 0.15)) / 10) * 10
      out.push({ id: `${date}:${ch}:${k}`, channel: ch, productId: p.id, qty, unit, xp: Math.round((qty * unit) / 150) })
    }
  }
  return out
}

/* ───────── 직원 (부서) ───────── */
export type DeptId = 'production' | 'rnd' | 'sales' | 'marketing' | 'finance'
export interface DeptDef {
  id: DeptId
  name: string
  emoji: string
  /** 부서장 이름·역할 (AI 경영진) */
  head: string
  title: string
  /** 1명당 하루 월급 */
  salary: number
  /** 직원 효과 설명 */
  perk: string
  max: number
}
export const DEPTS: DeptDef[] = [
  { id: 'production', name: '생산팀', emoji: '⚙️', head: '강민호', title: '생산팀장', salary: 6000, perk: '1명: 끝난 라인 자동 꺼내기 · 2명+: 같은 제품 자동 재가동 · 1명당 속도 +5%', max: 3 },
  { id: 'rnd', name: '제품개발팀', emoji: '🔬', head: '서윤아', title: '제품개발팀장', salary: 8000, perk: '1명당 연구 속도 +15%', max: 3 },
  { id: 'sales', name: '영업팀', emoji: '🚚', head: '박태현', title: '영업팀장', salary: 7000, perk: '1명당 납품 단가 +5% · 2명+: 재고 있으면 주문 자동 납품', max: 3 },
  { id: 'marketing', name: '마케팅팀', emoji: '📣', head: '이수진', title: '마케팅팀장', salary: 7000, perk: '1명당 직판 가격 +4% · 채널마다 주문 +1', max: 3 },
  { id: 'finance', name: '재무팀', emoji: '💼', head: '정우성', title: '재무팀장', salary: 7000, perk: '1명당 월급 총액 -10% · 연구·증설 비용 -5%', max: 3 },
]
export const DEPT_MAP = Object.fromEntries(DEPTS.map((d) => [d.id, d])) as Record<DeptId, DeptDef>
export type Staff = Record<DeptId, number>
export const NO_STAFF: Staff = { production: 0, rnd: 0, sales: 0, marketing: 0, finance: 0 }

export function staffCount(staff: Staff) {
  return Object.values(staff).reduce((a, b) => a + b, 0)
}
/** 하루 월급 총액 (재무팀 할인 반영) */
export function dailySalary(staff: Staff) {
  const base = DEPTS.reduce((n, d) => n + d.salary * (staff[d.id] ?? 0), 0)
  return Math.round(base * Math.max(0.5, 1 - 0.1 * (staff.finance ?? 0)))
}
export function costMul(staff: Staff) {
  return Math.max(0.7, 1 - 0.05 * (staff.finance ?? 0))
}
export function staffSpeed(staff: Staff) {
  return 1 + 0.05 * (staff.production ?? 0)
}
export function researchSpeed(staff: Staff) {
  return 1 + 0.15 * (staff.rnd ?? 0)
}
export function salesMul(staff: Staff) {
  return 1 + 0.05 * (staff.sales ?? 0)
}
export function marketingMul(staff: Staff) {
  return 1 + 0.04 * (staff.marketing ?? 0)
}

/* ───────── 품질 등급 ───────── */
/** ★1~3: 품질 관리·포장·HACCP 연구 + 제품개발팀 */
export function qualityStars(done: string[], staff: Staff = NO_STAFF) {
  let q = 1
  if (done.includes('quality1')) q++
  if (done.includes('quality2') || done.includes('package')) q++
  if ((staff.rnd ?? 0) >= 2 && !done.includes('quality2')) q = Math.min(3, q + 1)
  return Math.min(3, q)
}
export const CHANNEL_MIN_QUALITY: Record<ChannelId, number> = { direct: 1, cvs: 1, mart: 2, online: 2, export: 3 }

/* ───────── 시즌 이벤트 주문 ───────── */
export interface SeasonEvent {
  id: string
  name: string
  emoji: string
  desc: string
  /** 추천 제품 */
  products: string[]
  mul: number
  qty: [number, number]
  /** 월/일 범위 (양 끝 포함) */
  from: [number, number]
  to: [number, number]
  minQuality: number
}
export const EVENTS: SeasonEvent[] = [
  {
    id: 'newyear',
    name: '설날 선물세트',
    emoji: '🧧',
    desc: '명절 선물세트 대량 주문',
    products: ['cookie', 'jam', 'kimchi', 'lunchbox'],
    mul: 2.2,
    qty: [40, 120],
    from: [1, 15],
    to: [2, 20],
    minQuality: 2,
  },
  {
    id: 'spring',
    name: '봄 소풍 시즌',
    emoji: '🌸',
    desc: '나들이 도시락·간식 수요',
    products: ['onigiri', 'lunchbox', 'juice', 'chips'],
    mul: 1.8,
    qty: [40, 100],
    from: [4, 1],
    to: [5, 10],
    minQuality: 1,
  },
  {
    id: 'summer',
    name: '여름 휴가 시즌',
    emoji: '🏖️',
    desc: '시원한 음료·간편식',
    products: ['juice', 'coffee', 'chips', 'onigiri'],
    mul: 1.8,
    qty: [60, 140],
    from: [7, 15],
    to: [8, 20],
    minQuality: 1,
  },
  {
    id: 'chuseok',
    name: '추석 선물세트',
    emoji: '🌕',
    desc: '한가위 선물세트 대량 주문',
    products: ['cookie', 'jam', 'kimchi', 'cake'],
    mul: 2.2,
    qty: [40, 120],
    from: [9, 10],
    to: [10, 10],
    minQuality: 2,
  },
  {
    id: 'pepero',
    name: '11월 11일 과자 데이',
    emoji: '🍫',
    desc: '과자·디저트 주문 폭주',
    products: ['cookie', 'cake', 'ricecake', 'chips'],
    mul: 2.0,
    qty: [40, 100],
    from: [11, 5],
    to: [11, 12],
    minQuality: 1,
  },
  {
    id: 'exam',
    name: '수능 응원 세트',
    emoji: '🍡',
    desc: '찹쌀떡·간식 응원 선물',
    products: ['ricecake', 'cookie', 'coffee', 'onigiri'],
    mul: 1.9,
    qty: [40, 100],
    from: [11, 13],
    to: [11, 20],
    minQuality: 1,
  },
  {
    id: 'xmas',
    name: '크리스마스 파티',
    emoji: '🎄',
    desc: '케이크·쿠키·파티 음식',
    products: ['cake', 'cookie', 'juice', 'cutlet'],
    mul: 2.2,
    qty: [40, 120],
    from: [12, 10],
    to: [12, 25],
    minQuality: 2,
  },
]
export function eventFor(date: string): SeasonEvent | null {
  const m = Number(date.slice(5, 7))
  const d = Number(date.slice(8, 10))
  const v = m * 100 + d
  return EVENTS.find((e) => v >= e.from[0] * 100 + e.from[1] && v <= e.to[0] * 100 + e.to[1]) ?? null
}
/** 이벤트 주문 (날짜별 1개, 열린 제품 중에서) */
export function eventOrder(date: string, done: string[]): (Order & { event: SeasonEvent }) | null {
  const ev = eventFor(date)
  if (!ev) return null
  const open = unlockedProducts(done).map((p) => p.id)
  const cands = ev.products.filter((p) => open.includes(p))
  if (!cands.length) return null
  const r = rng(hash(`event:${date}:${ev.id}`))
  const p = PRODUCT_MAP[cands[Math.floor(r() * cands.length)]]
  const qty = Math.round((ev.qty[0] + r() * (ev.qty[1] - ev.qty[0])) / 2) * 2
  const unit = Math.round((p.price * priceMul(done) * ev.mul) / 10) * 10
  return { id: `${date}:event:${ev.id}`, channel: 'direct', productId: p.id, qty, unit, xp: Math.round((qty * unit) / 100), event: ev }
}
