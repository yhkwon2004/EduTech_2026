import { describe, expect, it } from 'vitest'
import type { BizType } from '@/types'
import { capacityOf, clampRef, eventFor, generateRivals, simulateDay, suggestPlan, type Skills } from '@/game/sim'
import { CHAPTERS, EVENTS, PRODUCT_PRESETS, START_CASH } from '@/game/data'
import { closeSeason, flagsFromDay, missionDone, shopLevel } from '@/game/progress'
import { realLifeBuff, skillsFromProgress } from '@/game/skills'
import type { DayDecision, Product, ShopStats } from '@/game/types'
import { LESSON_MAP } from '@/data/courses'

const zero: Skills = { marketing: 0, digital: 0, tax: 0, service: 0, ops: 0, support: 0, labor: 0, hygiene: 0 }
const region = { sido: '서울', gu: '마포구', dong: '망원동' }
const startStats = (): ShopStats => ({ cash: START_CASH, awareness: 20, reputation: 3, equipment: 0, staff: 0, interior: 0, totalProfit: 0, xp: 0 })
const productsFor = (biz: BizType, n = 3): Product[] => PRODUCT_PRESETS[biz].slice(0, n).map((p, i) => ({ ...p, id: 'p' + i, stock: 0 }))

function play(policy: 'good' | 'bad', days: number, biz: BizType = 'food') {
  const seed = 777
  let products = productsFor(biz)
  let stats = startStats()
  let rivals = generateRivals({ seed, tier: 0, region, biz })
  let last: Record<string, number> | undefined
  let prevRank = 0
  const ranks: number[] = []
  for (let day = 1; day <= days; day++) {
    const cap = capacityOf(biz, stats, zero)
    const ev = eventFor(seed, day)
    const decision: DayDecision = {
      plan: policy === 'good' ? suggestPlan({ products, lastDemand: last, capacity: cap }) : Object.fromEntries(products.map((p) => [p.id, 150])),
      prices: Object.fromEntries(products.map((p) => [p.id, policy === 'bad' ? p.ref * 1.6 : p.ref])),
      marketing: policy === 'good' ? ['sns', 'map', 'flyer'] : [],
      eventChoice: ev ? (policy === 'good' ? ev.choices.findIndex((c) => c.best) : ev.choices.length - 1) : undefined,
    }
    const o = simulateDay({ seed, day, date: `2026-11-${String(day).padStart(2, '0')}`, weekday: day % 7, tier: 0, biz, stats, products, rivals, decision, skills: zero, buff: policy === 'good' ? 0.05 : 0, lessonsToday: 0, prevRank })
    stats = o.stats
    products = o.products
    rivals = o.rivals
    prevRank = o.result.rank
    last = Object.fromEntries(o.result.products.map((p) => [p.id, p.demand]))
    if (policy === 'good' && o.result.lostCustomers > 10 && stats.cash > 1500000 && stats.equipment < 4)
      stats = { ...stats, cash: stats.cash - [600000, 1200000, 2400000, 4000000][stats.equipment], equipment: stats.equipment + 1 }
    ranks.push(o.result.rank)
  }
  return { ranks, stats }
}

describe('rivals', () => {
  it('generates 7 named neighbours deterministically', () => {
    const a = generateRivals({ seed: 1, tier: 0, region, biz: 'food' })
    const b = generateRivals({ seed: 1, tier: 0, region, biz: 'food' })
    expect(a).toHaveLength(7)
    expect(new Set(a.map((r) => r.name)).size).toBe(7)
    expect(a).toEqual(b)
    const higher = generateRivals({ seed: 1, tier: 2, region, biz: 'food' })
    const avg = (l: typeof a) => l.reduce((s, r) => s + r.awareness, 0) / l.length
    expect(avg(higher)).toBeGreaterThan(avg(a))
  })
})

describe('simulateDay', () => {
  const products = productsFor('food')
  const base = {
    seed: 9, day: 2, date: '2026-11-02', weekday: 1, tier: 0, biz: 'food' as const, stats: startStats(), products,
    rivals: generateRivals({ seed: 9, tier: 0, region, biz: 'food' }), skills: zero, buff: 0, lessonsToday: 0,
  }
  it('never sells more than it made and balances the books', () => {
    const decision: DayDecision = { plan: { p0: 10, p1: 5, p2: 0 }, prices: {}, marketing: ['flyer'] }
    const { result } = simulateDay({ ...base, decision })
    for (const p of result.products) expect(p.sold).toBeLessThanOrEqual(p.made)
    expect(result.products.find((p) => p.id === 'p2')!.sold).toBe(0)
    const c = result.costs
    expect(result.profit).toBe(Math.round(result.revenue - c.ingredients - c.wages - c.rent - c.marketing))
    expect(result.table.map((l) => l.rank).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(result.table.filter((l) => l.isPlayer)).toHaveLength(1)
  })
  it('only buys ingredients it can afford', () => {
    const { result } = simulateDay({ ...base, stats: { ...startStats(), cash: 0 }, decision: { plan: { p0: 100 }, prices: {}, marketing: [] } })
    expect(result.products[0].made).toBe(0)
  })
  it('wastes perishable leftovers but keeps shelf-stable stock', () => {
    const retail = productsFor('retail', 2) // 도시락(폐기) + 생수(보관)
    const o = simulateDay({ ...base, biz: 'retail', products: retail, decision: { plan: { p0: 300, p1: 300 }, prices: {}, marketing: [] } })
    expect(o.result.products[0].wasted).toBeGreaterThan(0)
    expect(o.result.products[1].wasted).toBe(0)
    expect(o.products[1].stock).toBeGreaterThan(0)
  })
  it('services cost per sale, no waste', () => {
    const svc = productsFor('beauty')
    const o = simulateDay({ ...base, biz: 'beauty', products: svc, decision: { plan: {}, prices: {}, marketing: [] } })
    expect(o.result.wasteValue).toBe(0)
    expect(o.result.products.some((p) => p.sold > 0)).toBe(true)
  })
  it('cheaper price brings more customers than a much higher one', () => {
    const plan = { p0: 200, p1: 200, p2: 200 }
    const cheap = simulateDay({ ...base, decision: { plan, prices: { p0: 7000, p1: 8000, p2: 3200 }, marketing: [] } }).result
    const pricey = simulateDay({ ...base, decision: { plan, prices: { p0: 14000, p1: 16000, p2: 6400 }, marketing: [] } }).result
    expect(cheap.customers).toBeGreaterThan(pricey.customers)
  })
  it('locks delivery ads until the digital skill is learned', () => {
    const plan = { p0: 200, p1: 200, p2: 200 }
    const locked = simulateDay({ ...base, decision: { plan, prices: {}, marketing: ['delivery'] } }).result
    expect(locked.costs.marketing).toBe(0)
    const unlocked = simulateDay({ ...base, skills: { ...zero, digital: 1 }, decision: { plan, prices: {}, marketing: ['delivery'] } }).result
    expect(unlocked.costs.marketing).toBe(60000)
  })
  it('suggests tomorrow’s plan from today’s demand', () => {
    expect(suggestPlan({ products, lastDemand: { p0: 40, p1: 20, p2: 10 }, capacity: 80 })).toEqual({ p0: 44, p1: 22, p2: 11 })
  })
  it('clamps an unrealistic market price', () => {
    expect(clampRef({ cost: 1000, ref: 999999, kind: 'goods' })).toBe(5000)
  })
})

describe('balance', () => {
  it('good play reaches the top 3 within a week; reckless play stays at the bottom', () => {
    const good = play('good', 7)
    expect(Math.min(...good.ranks.slice(3))).toBeLessThanOrEqual(3)
    const bad = play('bad', 7)
    expect(bad.ranks[6]).toBe(8)
  })
  it('works for a service business too', () => {
    const r = play('good', 10, 'beauty')
    expect(Math.min(...r.ranks)).toBeLessThanOrEqual(3)
  })
})

describe('progression', () => {
  it('closes a season with promotion for the top 3', () => {
    const rivals = generateRivals({ seed: 3, tier: 0, region, biz: 'food' }).map((r, i) => ({ ...r, seasonScore: 100 + i * 10 }))
    const win = closeSeason({ season: 1, tier: 0, region, biz: 'food', seed: 3, playerScore: 999, rivals })
    expect(win.end.rank).toBe(1)
    expect(win.end.title).toBe('망원동 최고 사장님')
    expect(win.nextTier).toBe(1)
    expect(win.nextRivals.every((r) => r.seasonScore === 0)).toBe(true)
    const lose = closeSeason({ season: 1, tier: 0, region, biz: 'food', seed: 3, playerScore: 0, rivals })
    expect(lose.end.rank).toBe(8)
    expect(lose.nextTier).toBe(0)
    const top = closeSeason({ season: 3, tier: 2, region, biz: 'food', seed: 3, playerScore: 999, rivals })
    expect(top.end.champion).toBe(true)
    expect(top.end.title).toBe('서울 최고 소상공인')
  })
  it('checks chapter missions', () => {
    const view = { products: productsFor('food'), stats: startStats(), day: 0, tier: 0, hall: [], usedMarketing: [], replyWins: 0, flags: {} }
    expect(missionDone('products2', view)).toBe(true)
    expect(missionDone('margin', view)).toBe(true)
    expect(missionDone('firstDay', view)).toBe(false)
    const flags = flagsFromDay({}, { customers: 60, capacity: 80, profit: 1, rank: 2, products: [{ made: 10, wasted: 1 }] } as never)
    expect(flags).toMatchObject({ busy60: true, profit1: true, waste10: true, top3: true })
    expect(CHAPTERS.every((c) => c.missions.length > 0)).toBe(true)
  })
  it('levels and buffs', () => {
    expect(shopLevel(0).level).toBe(1)
    expect(shopLevel(120).level).toBe(2)
    expect(realLifeBuff(1, 5)).toBe(0.15)
    expect(realLifeBuff(0.5, 1)).toBeCloseTo(0.06)
    expect(skillsFromProgress({ 'l-tax-1': { done: true, card: 0 }, 'l-place-1': { done: true, card: 0 } })).toMatchObject({ tax: 1, marketing: 1 })
  })
  it('links events to existing lessons and has one best choice each', () => {
    for (const e of EVENTS) {
      if (e.lessonId) expect(LESSON_MAP[e.lessonId]).toBeDefined()
      expect(e.choices.filter((c) => c.best)).toHaveLength(1)
    }
  })
})
