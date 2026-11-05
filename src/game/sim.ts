import type { BizType, CategoryId } from '@/types'
import { hash, pick, rng } from '@/lib/rng'
import { josa } from '@/lib/josa'
import {
  BIZ_PROFILE,
  EVENTS,
  MARKET_SIZE,
  MARKETING,
  PERSONALITY,
  RENT,
  REVIEW_TEXT,
  RIVAL_PREFIX,
  RIVAL_TYPES,
  WEATHER,
} from './data'
import type {
  DayDecision,
  DayResult,
  GameEvent,
  GameEventChoice,
  MarketingId,
  Personality,
  Product,
  ProductResult,
  Region,
  Review,
  Rival,
  ShopDayLine,
  ShopStats,
  Weather,
} from './types'

export type Skills = Record<CategoryId, number>

type Line = ShopDayLine & { growth: number; rival?: Rival }

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number, unit = 1) => Math.round(v / unit) * unit

/** 동네 평균 가격이 지나치게 높게 잡히지 않도록 원가 기준으로 범위를 묶음 */
export function clampRef(p: Pick<Product, 'cost' | 'ref' | 'kind'>): number {
  const maxRatio = p.kind === 'service' ? 0.08 : 0.2 // 원가율 하한
  const lo = p.cost / 0.65
  const hi = p.cost / maxRatio
  return clamp(p.ref || p.cost / 0.33, lo, Math.max(lo, hi))
}

export function costRate(p: Pick<Product, 'cost' | 'price'>): number {
  return p.price > 0 ? p.cost / p.price : 1
}

/** 가격 매력: 동네 평균보다 싸면 ↑, 비싸면 ↓ */
export function priceFactor(ref: number, price: number): number {
  return clamp((ref / Math.max(1, price)) ** 1.6, 0.12, 2.6)
}

export function qualityFactor(q: number): number {
  return (q / 3) ** 0.8
}

export function capacityOf(biz: BizType, stats: Pick<ShopStats, 'equipment' | 'staff'>, skills?: Partial<Skills>): number {
  const p = BIZ_PROFILE[biz]
  const labor = 1 + 0.1 * (skills?.labor ?? 0)
  return Math.round(p.baseCapacity + stats.equipment * p.equipCapacity + stats.staff * p.staffCapacity * labor)
}

function varietyFactor(n: number): number {
  return [0.8, 0.85, 0.95, 1, 1.05, 1.08][clamp(n, 0, 5)]
}

function attractiveness(params: {
  awareness: number
  reputation: number
  value: number
  variety: number
  demandBoost: number
}): number {
  const { awareness, reputation, value, variety, demandBoost } = params
  return (0.35 + awareness / 100) * (reputation / 3.5) ** 1.6 * clamp(value, 0.2, 2.2) ** 0.9 * varietyFactor(variety) * Math.max(0.2, 1 + demandBoost)
}

export function weatherFor(seed: number, day: number): Weather {
  const r = rng(hash(`w${seed}:${day}`))()
  return r < 0.38 ? 'sunny' : r < 0.62 ? 'cloudy' : r < 0.8 ? 'rain' : r < 0.9 ? 'cold' : 'hot'
}

const WEEKDAY_MUL = [1.15, 0.9, 0.95, 1, 1, 1.1, 1.25]

export function marketSizeFor(params: { tier: number; biz: BizType; weekday: number; weather: Weather; seed: number; day: number }): number {
  const { tier, biz, weekday, weather, seed, day } = params
  const noise = 0.95 + rng(hash(`m${seed}:${day}`))() * 0.1
  return Math.round(MARKET_SIZE[tier] * BIZ_PROFILE[biz].marketMul * WEEKDAY_MUL[weekday] * WEATHER[weather].mul * noise)
}

/** 첫날은 상황 카드 없음, 그 뒤로 매일 하나 */
export function eventFor(seed: number, day: number): GameEvent | null {
  if (day <= 1) return null
  const r = rng(hash(`e${seed}:${day}`))
  return EVENTS[Math.floor(r() * EVENTS.length)]
}

/* ───────── 경쟁 가게 ───────── */

export function generateRivals(params: { seed: number; tier: number; region: Region; biz: BizType }): Rival[] {
  const { seed, tier, region, biz } = params
  const r = rng(hash(`rivals${seed}:${tier}`))
  const base = BIZ_PROFILE[biz].baseCapacity
  const personalities: Personality[] = ['price', 'quality', 'marketing', 'steady', 'trendy', 'steady', 'quality']
  const usedNames = new Set<string>()
  const short = (tier === 0 ? region.dong : tier === 1 ? region.gu : region.sido).replace(/(동|구|시|군)$/, '')
  return personalities.map((personality, i) => {
    let name = ''
    let t = RIVAL_TYPES[0]
    for (let k = 0; k < 20 && (!name || usedNames.has(name)); k++) {
      t = pick(r, RIVAL_TYPES)
      const usePlace = r() < 0.4
      name = usePlace ? `${short} ${t.type}` : `${pick(r, RIVAL_PREFIX)} ${t.type}`
    }
    usedNames.add(name)
    const boss = i === 1 // 한 곳은 처음부터 강한 '동네 1등'
    const aw = clamp(16 + tier * 14 + r() * 22 + (boss ? 18 : 0) + (personality === 'marketing' ? 10 : 0), 5, 92)
    const rep = clamp(3.0 + tier * 0.22 + r() * 0.6 + (boss ? 0.35 : 0) + (personality === 'quality' ? 0.15 : 0), 2.6, 4.7)
    const priceLevel = personality === 'price' ? 0.8 : personality === 'quality' ? 1.18 : 0.95 + r() * 0.1
    const quality = personality === 'quality' ? 4 + r() * 0.6 : personality === 'price' ? 2.5 + r() * 0.4 : 3 + r() * 0.6
    return {
      id: `rv${i}`,
      name,
      emoji: t.emoji,
      type: t.type,
      personality,
      awareness: Math.round(aw),
      reputation: Math.round(rep * 100) / 100,
      priceLevel: Math.round(priceLevel * 100) / 100,
      quality: Math.round(quality * 10) / 10,
      capacity: Math.round(base * (0.85 + r() * 0.45 + tier * 0.15)),
      seasonScore: 0,
      lastScore: 0,
      lastRank: 0,
    }
  })
}

interface RivalPlan {
  rival: Rival
  demandBoost: number
  marketingCost: number
  news?: string
}

function planRival(rv: Rival, r: () => number, day: number, pressure: number): RivalPlan {
  let demandBoost = 0
  let marketingCost = 0
  let news: string | undefined
  const p = rv.personality
  const next = { ...rv }
  const mkChance = clamp({ price: 0.35, quality: 0.2, marketing: 0.8, steady: 0.3, trendy: 0.55 }[p] + pressure, 0, 0.95)
  if (r() < mkChance) {
    const kind = pick(r, ['flyer', 'map', 'sns', 'tasting'] as const)
    const m = MARKETING[kind]
    demandBoost += m.demand
    marketingCost += m.cost
    next.awareness = clamp(next.awareness + m.awareness * (1 - next.awareness / 130), 0, 100)
    if (r() < 0.5) news = `${josa(rv.name, '이/가')} ${josa(m.label, '을/를')} 했어요`
  }
  if (pressure > 0 && rv.lastRank > 0 && rv.lastRank <= 3 && r() < 0.35) {
    demandBoost += 0.1
    next.awareness = clamp(next.awareness + 3, 0, 100)
    news = `${josa(rv.name, '이/가')} 1등 자리를 되찾으려고 이벤트를 열었어요`
  }
  if (p === 'price' && r() < 0.25 + pressure) {
    demandBoost += 0.15
    news = `${josa(rv.name, '이/가')} 오늘 할인 행사를 했어요`
  }
  if (p === 'trendy' && r() < 0.15) {
    demandBoost += 0.35
    next.awareness = clamp(next.awareness + 8, 0, 100)
    news = `${josa(rv.name, '이/가')} SNS에서 화제가 됐어요 🔥`
  }
  if (p === 'quality' && day % 5 === 0 && r() < 0.5) {
    next.quality = clamp(next.quality + 0.2, 1, 5)
    news = `${josa(rv.name, '이/가')} 신메뉴를 냈어요`
  }
  if (p === 'steady' && r() < 0.08) {
    next.capacity = Math.round(next.capacity * 1.1)
    news = `${josa(rv.name, '이/가')} 설비를 늘렸어요`
  }
  if (r() < 0.04) {
    next.reputation = clamp(next.reputation - 0.15, 1, 5)
    news = `${rv.name}에 아쉬운 리뷰가 몰렸어요`
  }
  return { rival: next, demandBoost, marketingCost, news }
}

/* ───────── 하루 영업 ───────── */

export interface SimInput {
  seed: number
  day: number
  date: string
  weekday: number
  tier: number
  biz: BizType
  stats: ShopStats
  products: Product[]
  rivals: Rival[]
  decision: DayDecision
  skills: Skills
  /** 실제 할 일·도전 달성으로 받는 버프 (0~0.15) */
  buff: number
  /** 오늘 끝낸 레슨 수 (성장 점수) */
  lessonsToday: number
  shopName?: string
  shopEmoji?: string
  /** 어제 내 순위 — 상위권이면 경쟁 가게가 견제해요 */
  prevRank?: number
}

export interface SimOutput {
  result: DayResult
  stats: ShopStats
  products: Product[]
  rivals: Rival[]
}

function eventEffect(input: SimInput): { choice?: GameEventChoice; event?: GameEvent } {
  const ev = eventFor(input.seed, input.day)
  if (!ev || input.decision.eventChoice === undefined) return {}
  return { event: ev, choice: ev.choices[input.decision.eventChoice] }
}

export function simulateDay(input: SimInput): SimOutput {
  const { seed, day, date, weekday, tier, biz, stats, products, rivals, decision, skills, buff, lessonsToday } = input
  const r = rng(hash(`day${seed}:${day}`))
  const weather = weatherFor(seed, day)
  const { choice, event } = eventEffect(input)
  const eff = choice?.effect ?? {}

  // ── 오늘 가격·마케팅
  const sale = decision.marketing.includes('sale')
  const mk = decision.marketing.filter((m, i, a) => a.indexOf(m) === i && MARKETING[m] && (!MARKETING[m].needSkill || (skills[MARKETING[m].needSkill!] ?? 0) >= 1))
  const mkSkill = 1 + 0.08 * (skills.marketing ?? 0) + 0.04 * (skills.digital ?? 0)
  let mkDemand = 0
  let mkCost = 0
  let mkAwareness = 0
  let mkRep = 0
  for (const id of mk) {
    const m = MARKETING[id]
    const rainBoost = id === 'delivery' && weather === 'rain' ? 2 : 1
    mkDemand += m.demand * (id === 'sns' ? mkSkill * 1.2 : mkSkill) * rainBoost
    mkCost += m.cost
    mkAwareness += m.awareness * (id === 'sns' ? mkSkill : 1)
    mkRep += m.reputation ?? 0
  }

  const priced = products.map((p) => ({ ...p, price: Math.max(100, round(decision.prices[p.id] ?? p.price, 10)), ref: clampRef(p) }))
  const appeal = priced.map((p) => priceFactor(p.ref, p.price * (sale ? 0.9 : 1)) * qualityFactor(p.quality))
  const value = appeal.length ? appeal.reduce((s, a) => s + a, 0) / appeal.length : 0.2

  // ── 동네 시장 나눠 갖기
  const market = marketSizeFor({ tier, biz, weekday, weather, seed, day }) * (1 + (eff.demand ?? 0) * 0.3)
  const playerA = attractiveness({
    awareness: stats.awareness,
    reputation: stats.reputation,
    value,
    variety: priced.length,
    demandBoost: mkDemand + (eff.demand ?? 0) + buff + 0.02 * (skills.service ?? 0),
  })
  const pressure = input.prevRank && input.prevRank <= 2 ? 0.18 : input.prevRank && input.prevRank <= 4 ? 0.08 : 0
  const plans = rivals.map((rv) => planRival(rv, r, day, pressure))
  const rivalA = plans.map(({ rival: rv, demandBoost }) =>
    attractiveness({
      awareness: rv.awareness,
      reputation: rv.reputation,
      value: (1 / rv.priceLevel) ** 1.6 * qualityFactor(rv.quality),
      variety: 3,
      demandBoost,
    }),
  )
  const pow = (a: number) => a ** 1.3
  const total = pow(playerA) + rivalA.reduce((s, a) => s + pow(a), 0)
  const share = pow(playerA) / total
  const potential = Math.round(market * share * (0.94 + r() * 0.12))

  // ── 손님 받기 (수용량)
  const cap = Math.round(capacityOf(biz, stats, skills) * (1 + (eff.capacity ?? 0)))
  const served = Math.min(potential, cap)
  const variety = priced.length
  const extraBuy = variety >= 3 ? 0.25 : variety === 2 ? 0.12 : 0
  const appealSum = appeal.reduce((s, a) => s + a, 0) || 1

  const costMul = clamp(1 + (eff.cost ?? 0) - 0.03 * (skills.ops ?? 0), 0.7, 1.5)
  // 재료는 가진 돈 안에서만 살 수 있어요
  const wantCost = priced.reduce((sum, p) => sum + (p.kind === 'goods' ? Math.max(0, decision.plan[p.id] ?? 0) * p.cost * costMul : 0), 0)
  const afford = wantCost > 0 ? clamp(Math.max(0, stats.cash) / wantCost, 0, 1) : 1
  const results: ProductResult[] = []
  const nextProducts: Product[] = []
  let revenue = 0
  let ingredients = 0
  let wasteValue = 0
  let unmetUnits = 0
  let madeTotal = 0
  priced.forEach((p, i) => {
    const demand = Math.round(served * (1 + extraBuy) * (appeal[i] / appealSum))
    let sold: number
    let made = 0
    let wasted = 0
    let stock = 0
    if (p.kind === 'service') {
      sold = demand
      ingredients += sold * p.cost * costMul
    } else {
      made = Math.max(0, Math.floor((decision.plan[p.id] ?? 0) * afford))
      const available = made + (p.perishable ? 0 : p.stock)
      sold = Math.min(demand, available)
      unmetUnits += demand - sold
      ingredients += made * p.cost * costMul
      const left = available - sold
      if (p.perishable) {
        wasted = left
        wasteValue += left * p.cost * costMul
      } else stock = left
      madeTotal += made
    }
    const unitPrice = p.price * (sale ? 0.9 : 1)
    revenue += sold * unitPrice
    results.push({ id: p.id, name: p.name, emoji: p.emoji, demand, sold, made, wasted, revenue: Math.round(sold * unitPrice) })
    nextProducts.push({ ...products[i], price: p.price, stock })
  })

  const overflow = potential - served
  const lostCustomers = Math.round(overflow + unmetUnits / (1 + extraBuy))
  const servedOk = Math.max(0, served - unmetUnits / (1 + extraBuy))
  const wages = stats.staff * BIZ_PROFILE[biz].wage
  const rent = Math.round(RENT[tier] * (1 - 0.03 * (skills.tax ?? 0)))
  const eventCash = eff.cash ?? 0
  const profit = Math.round(revenue - ingredients - wages - rent - mkCost + eventCash)

  // ── 평판·인지도
  const qAvg = priced.length ? priced.reduce((s, p) => s + p.quality, 0) / priced.length : 3
  const vAvg = priced.length ? priced.reduce((s, p) => s + p.ref / (p.price * (sale ? 0.9 : 1)), 0) / priced.length : 1
  const serviceRatio = potential > 0 ? servedOk / potential : 1
  const sat =
    0.4 * ((qAvg - 1) / 4) + 0.3 * clamp((vAvg - 0.7) / 0.6, 0, 1) + 0.3 * clamp(serviceRatio, 0, 1) + 0.06 * stats.interior + 0.02 * stats.staff
  const target = clamp(1.5 + 3.5 * sat, 1, 5)
  const reputation = clamp(
    stats.reputation + (target - stats.reputation) * 0.18 + mkRep + (eff.reputation ?? 0) + 0.01 * (skills.hygiene ?? 0) + 0.005 * (skills.service ?? 0),
    1,
    5,
  )
  const wom = (servedOk / Math.max(20, BIZ_PROFILE[biz].baseCapacity / 2)) * (stats.reputation - 3.2) * 0.4
  const awareness = clamp(stats.awareness * 0.96 + mkAwareness * 0.75 * (1 - stats.awareness / 130) + wom + (eff.awareness ?? 0), 0, 100)

  // ── 경쟁 가게 하루
  const avgTicket = priced.length ? priced.reduce((s, p) => s + p.ref, 0) / priced.length : 5000
  const rivalLines: (Line & { rival: Rival })[] = plans.map(({ rival: rv, marketingCost, news }, i) => {
    const pot = Math.round(market * (pow(rivalA[i]) / total) * (0.94 + r() * 0.12))
    const cust = Math.min(pot, rv.capacity)
    const rev = cust * (1 + extraBuy * 0.8) * avgTicket * rv.priceLevel
    const margin = 1 - clamp(0.36 / rv.priceLevel, 0.2, 0.6)
    const rivalWages = Math.max(0, Math.round((rv.capacity - BIZ_PROFILE[biz].baseCapacity) / BIZ_PROFILE[biz].staffCapacity)) * BIZ_PROFILE[biz].wage
    const pr = Math.round(rev * margin - RENT[tier] - marketingCost - rivalWages)
    const tgt = clamp(1.5 + 3.5 * (0.4 * ((rv.quality - 1) / 4) + 0.3 * clamp((1 / rv.priceLevel - 0.7) / 0.6, 0, 1) + 0.3 * clamp(cust / Math.max(1, pot), 0, 1)), 1, 5)
    const rep = clamp(rv.reputation + (tgt - rv.reputation) * 0.12 + (r() - 0.5) * 0.04, 1, 5)
    const aw = clamp(rv.awareness * 0.97 + (cust / Math.max(20, BIZ_PROFILE[biz].baseCapacity / 2)) * (rv.reputation - 3.2) * 0.8, 0, 100)
    const growth = (rep - rv.reputation) * 20 + (aw - rv.awareness) * 0.5
    return {
      id: rv.id,
      name: rv.name,
      emoji: rv.emoji,
      customers: cust,
      revenue: Math.round(rev),
      profit: pr,
      reputation: rep,
      awareness: aw,
      score: 0,
      rank: 0,
      isPlayer: false,
      growth,
      rival: { ...rv, reputation: Math.round(rep * 100) / 100, awareness: Math.round(aw * 10) / 10, news },
    }
  })

  const playerGrowth = (reputation - stats.reputation) * 20 + (awareness - stats.awareness) * 0.5 + Math.min(3, lessonsToday) * 3 + buff * 20
  const lines: Line[] = [
    {
      id: 'me',
      name: '',
      emoji: '',
      customers: servedOk,
      revenue: Math.round(revenue),
      profit,
      reputation,
      awareness,
      score: 0,
      rank: 0,
      isPlayer: true,
      growth: playerGrowth,
    },
    ...rivalLines,
  ]
  const parts = scoreLines(lines)
  const sorted = [...lines].sort((a, b) => b.score - a.score)
  sorted.forEach((l, i) => (l.rank = i + 1))
  const me = lines[0]

  // ── 리뷰·조언
  const pricey = vAvg < 0.85
  const cheap = vAvg > 1.3
  const stockoutLost = Math.round(unmetUnits / (1 + extraBuy))
  const stockoutRate = potential > 0 ? stockoutLost / potential : 0
  const wasteRate = madeTotal > 0 ? results.reduce((s, x) => s + x.wasted, 0) / madeTotal : 0
  const reviews = makeReviews(r, { target, pricey, cheap, stockout: stockoutRate > 0.12, wait: overflow > potential * 0.1, quality: qAvg })
  const tips = makeTips({
    wasteRate,
    stockoutRate,
    overflow: overflow > potential * 0.08,
    pricey,
    cheapLowMargin: cheap && priced.some((p) => costRate(p) > 0.5),
    lowAwareness: awareness < 30 && mk.length === 0,
    lowRep: reputation < 3.3,
    loss: profit < 0,
    stockoutLost,
    overflowLost: overflow,
  })

  const nextStats: ShopStats = {
    ...stats,
    cash: Math.round(stats.cash + profit),
    reputation: Math.round(reputation * 100) / 100,
    awareness: Math.round(awareness * 10) / 10,
    totalProfit: stats.totalProfit + profit,
    xp: stats.xp + 20 + Math.round(me.score / 5) + (me.rank <= 3 ? 15 : 0),
  }

  const result: DayResult = {
    day,
    date,
    weather,
    weekday,
    marketSize: Math.round(market),
    capacity: cap,
    customers: Math.round(servedOk),
    lostCustomers,
    products: results,
    revenue: Math.round(revenue),
    costs: { ingredients: Math.round(ingredients), marketing: mkCost, wages, rent, delivery: 0 },
    wasteValue: Math.round(wasteValue),
    profit,
    reputationBefore: stats.reputation,
    reputation: nextStats.reputation,
    awarenessBefore: stats.awareness,
    awareness: nextStats.awareness,
    share: servedOk / Math.max(1, lines.reduce((s, l) => s + l.customers, 0)),
    score: Math.round(me.score),
    scoreParts: parts[0],
    rank: me.rank,
    prevRank: input.prevRank ?? 0,
    table: sorted.map((l) => ({
      id: l.id,
      name: l.isPlayer ? input.shopName ?? '내 가게' : l.name,
      emoji: l.isPlayer ? input.shopEmoji ?? '🏠' : l.emoji,
      customers: Math.round(l.customers),
      revenue: l.revenue,
      profit: l.profit,
      reputation: Math.round(l.reputation * 100) / 100,
      awareness: Math.round(l.awareness),
      score: Math.round(l.score),
      rank: l.rank,
      isPlayer: l.isPlayer,
    })),
    reviews,
    tips,
    eventNote: choice ? `${event?.title} → ${choice.label}: ${choice.result}` : undefined,
    buff,
    xpGained: nextStats.xp - stats.xp,
  }

  const nextRivals: Rival[] = rivalLines.map((l) => ({
    ...l.rival,
    lastScore: Math.round(l.score),
    lastRank: l.rank,
    seasonScore: l.rival.seasonScore + Math.round(l.score),
  }))

  return { result, stats: nextStats, products: nextProducts, rivals: nextRivals }
}

/** 동네 안에서 상대 평가: 이익 40 · 평판 25 · 손님 점유 20 · 성장 15 */
function scoreLines(lines: Line[]) {
  const norm = (get: (l: Line) => number) => {
    const vals = lines.map(get)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    return lines.map((l) => (hi - lo < 1e-9 ? 50 : ((get(l) - lo) / (hi - lo)) * 100))
  }
  const p = norm((l) => l.profit)
  const rp = norm((l) => l.reputation)
  const sh = norm((l) => l.customers)
  const gr = norm((l) => l.growth)
  return lines.map((l, i) => {
    const parts = { profit: p[i] * 0.4, reputation: rp[i] * 0.25, share: sh[i] * 0.2, growth: gr[i] * 0.15 }
    l.score = parts.profit + parts.reputation + parts.share + parts.growth
    return {
      profit: Math.round(parts.profit),
      reputation: Math.round(parts.reputation),
      share: Math.round(parts.share),
      growth: Math.round(parts.growth),
    }
  })
}

function makeReviews(
  r: () => number,
  c: { target: number; pricey: boolean; cheap: boolean; stockout: boolean; wait: boolean; quality: number },
): Review[] {
  const out: Review[] = []
  const star = () => clamp(Math.round(c.target + (r() - 0.5) * 1.6), 1, 5)
  const add = (pool: string[], tone: Review['tone'], s?: number) => out.push({ text: pick(r, pool), tone, stars: s ?? star() })
  if (c.stockout) add(REVIEW_TEXT.stockout, 'bad', clamp(star() - 1, 1, 5))
  if (c.wait) add(REVIEW_TEXT.wait, 'bad', clamp(star() - 1, 1, 5))
  if (c.pricey) add(REVIEW_TEXT.pricey, 'bad')
  if (c.cheap) add(REVIEW_TEXT.value, 'good', clamp(star() + 1, 1, 5))
  if (c.quality >= 3.8) add(REVIEW_TEXT.quality, 'good', clamp(star() + 1, 1, 5))
  if (c.target >= 3.8) add(REVIEW_TEXT.friendly, 'good')
  if (out.length < 2) add(c.target >= 3.2 ? REVIEW_TEXT.friendly : REVIEW_TEXT.plain, c.target >= 3.2 ? 'good' : 'neutral')
  return out.slice(0, 3)
}

function makeTips(c: {
  wasteRate: number
  stockoutRate: number
  overflow: boolean
  pricey: boolean
  cheapLowMargin: boolean
  lowAwareness: boolean
  lowRep: boolean
  loss: boolean
  stockoutLost: number
  overflowLost: number
}): { text: string; lessonId?: string }[] {
  const t: { text: string; lessonId?: string }[] = []
  if (c.loss) t.push({ text: '오늘은 적자예요. 원가율과 고정비(임대료·인건비)를 다시 계산해 보세요.', lessonId: 'l-cost-1' })
  if (c.stockoutRate > 0.1) t.push({ text: `품절로 손님 ${c.stockoutLost}명을 놓쳤어요. 잘 팔리는 상품 준비량을 늘려 보세요.`, lessonId: 'l-cost-3' })
  if (c.wasteRate > 0.15) t.push({ text: `만든 것의 ${Math.round(c.wasteRate * 100)}%를 버렸어요. 어제 판매량을 보고 준비량을 줄여 보세요.`, lessonId: 'l-cost-3' })
  if (c.overflow) t.push({ text: `가게가 꽉 차서 손님 ${c.overflowLost}명이 그냥 돌아갔어요. 설비나 알바에 투자할 때예요!` })
  if (c.pricey) t.push({ text: '가격이 동네 평균보다 비싸요. 품질을 올리거나 가격을 조정해 보세요.', lessonId: 'l-cost-2' })
  if (c.cheapLowMargin) t.push({ text: '싸게 팔아 손님은 많지만 원가율이 50%를 넘는 상품이 있어요.', lessonId: 'l-cost-1' })
  if (c.lowAwareness) t.push({ text: '아직 우리 가게를 아는 사람이 적어요. 홍보를 하나 해 보세요.', lessonId: 'l-place-1' })
  if (c.lowRep) t.push({ text: '평판이 낮아요. 품질·응대를 챙기고 리뷰에 정성껏 답해 보세요.', lessonId: 'l-svc-2' })
  if (!t.length) t.push({ text: '균형 잡힌 하루였어요! 내일은 홍보나 투자로 한 단계 더 올라가 봐요.' })
  return t.slice(0, 3)
}

/* ───────── 준비량 추천 ───────── */

/** 어제 수요 + 10% (첫날은 수용량을 상품 매력대로 나눠서) */
export function suggestPlan(params: { products: Product[]; lastDemand?: Record<string, number>; capacity: number }): Record<string, number> {
  const { products, lastDemand, capacity } = params
  const goods = products.filter((p) => p.kind === 'goods')
  const out: Record<string, number> = {}
  if (lastDemand && goods.some((p) => lastDemand[p.id] !== undefined)) {
    for (const p of goods) out[p.id] = Math.max(0, Math.round((lastDemand[p.id] ?? 10) * 1.1) - (p.perishable ? 0 : p.stock))
    return out
  }
  const appeal = goods.map((p) => priceFactor(clampRef(p), p.price) * qualityFactor(p.quality))
  const sum = appeal.reduce((s, a) => s + a, 0) || 1
  goods.forEach((p, i) => (out[p.id] = Math.max(0, Math.round(capacity * 0.9 * (appeal[i] / sum)) - (p.perishable ? 0 : p.stock))))
  return out
}

export function personalityLabel(p: Personality) {
  return PERSONALITY[p].label
}

export type { MarketingId }
