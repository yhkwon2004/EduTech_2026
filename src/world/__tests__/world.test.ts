import { beforeEach, describe, expect, it } from 'vitest'
import { BOTTOMS, DEFAULT_AVATAR, EYES, GLASSES, HAIR_STYLES, HATS, TOPS, VILLAGERS, randomAvatar, toLook } from '@/world/avatar'
import { BUILDINGS, findPath, PLOTS, RIVAL_LOTS, screenToTile, iso, walkable, GROUND } from '@/world/map'
import { CROPS, PRESET_RECIPES, buyPrice, recipeUnitCost, sellPrice, priceFactor } from '@/world/items'
import { JOBS, TASKS, canPromote, tasksFor, workResult, RANKS } from '@/world/jobs'
import { dailyQuests, storyFor } from '@/world/quests'
import { GRANTS, receiptsFor } from '@/world/support'
import { energyNow, levelOf, maxEnergy, useWorld, craftSlots } from '@/world/store'
import { LESSON_MAP } from '@/data/courses'
import { PRODUCT_PRESETS } from '@/game/data'

describe('map', () => {
  it('round-trips screen ↔ tile', () => {
    for (const [x, y] of [[0, 0], [5, 3], [12, 9], [25, 19]]) {
      const c = iso(x + 0.5, y + 0.5)
      expect(screenToTile(c.x, c.y)).toEqual({ x, y })
    }
  })
  it('every door is walkable and reachable from the plaza', () => {
    const start = { x: 12, y: 9 }
    for (const d of [...BUILDINGS.map((b) => b.door), ...RIVAL_LOTS.map((r) => r.door)]) {
      expect(walkable(d.x, d.y)).toBe(true)
      expect(findPath(start, d).length).toBeGreaterThan(0)
    }
  })
  it('every plot has a walkable neighbour reachable from the plaza', () => {
    for (const p of PLOTS) {
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).filter((t) => walkable(t.x, t.y))
      expect(near.length).toBeGreaterThan(0)
      expect(findPath({ x: 12, y: 9 }, near[0]).length).toBeGreaterThan(0)
    }
  })
  it('paths step one tile at a time and avoid blocked tiles', () => {
    const path = findPath({ x: 12, y: 9 }, { x: 4, y: 8 })
    let prev = { x: 12, y: 9 }
    for (const p of path) {
      expect(Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)).toBe(1)
      expect(walkable(p.x, p.y)).toBe(true)
      prev = p
    }
    expect(prev).toEqual({ x: 4, y: 8 })
  })
  it('walking into water goes to the nearest shore', () => {
    expect(GROUND[16][2]).toBe('water')
    const path = findPath({ x: 12, y: 9 }, { x: 2, y: 16 })
    expect(path.length).toBeGreaterThan(0)
    expect(walkable(path.at(-1)!.x, path.at(-1)!.y)).toBe(true)
  })
})

describe('items & recipes', () => {
  it('growing is cheaper than buying', () => {
    for (const c of CROPS) expect(c.seed / c.yield).toBeLessThan(c.price)
  })
  it('preset products have recipes with realistic cost rates', () => {
    for (const presets of Object.values(PRODUCT_PRESETS))
      for (const p of presets) {
        const r = PRESET_RECIPES[p.name]
        expect(r, p.name).toBeDefined()
        if (r.type === 'craft') {
          const rate = recipeUnitCost(r, p.cost) / p.price
          expect(rate, p.name).toBeGreaterThan(0.08)
          expect(rate, p.name).toBeLessThan(0.5)
        }
      }
  })
  it('market prices vary by day but are deterministic', () => {
    expect(priceFactor('2026-11-06', 'meat')).toBe(priceFactor('2026-11-06', 'meat'))
    const days = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'].map((d) => buyPrice(d, 'meat'))
    expect(new Set(days).size).toBeGreaterThan(1)
    expect(sellPrice('2026-11-06', 'cabbage')).toBeLessThan(buyPrice('2026-11-06', 'cabbage'))
  })
})

describe('jobs', () => {
  it('every role has six tasks with one best answer linked to real lessons', () => {
    for (const j of JOBS) {
      expect(TASKS[j.id]).toHaveLength(6)
      for (const t of TASKS[j.id]) {
        expect(t.options.filter((o) => o.score === 100)).toHaveLength(1)
        if (t.lessonId) expect(LESSON_MAP[t.lessonId]).toBeDefined()
      }
    }
    expect(tasksFor('finance', '2026-11-06')).toHaveLength(3)
  })
  it('pays more for better work and promotes with lessons', () => {
    const good = workResult([100, 100, 100], 0, 0)
    const bad = workResult([10, 20, 30], 0, 0)
    expect(good.pay).toBeGreaterThan(bad.pay)
    expect(good.perf).toBe(100)
    expect(canPromote(0, RANKS[1].perf, 0)).toBe(false)
    expect(canPromote(0, RANKS[1].perf, 1)).toBe(true)
  })
})

describe('quests', () => {
  it('has an owner chain and an employee chain that continues into owning a shop', () => {
    expect(storyFor('owner', false)[0].id).toBe('board')
    // 창업부터 해야 공방·영업이 열려요
    expect(storyFor('owner', false)[1].id).toBe('o-learn')
    expect(storyFor('owner', false).map((q) => q.id)).toContain('o-build-market')
    const emp = storyFor('employee', false).map((q) => q.id)
    expect(emp).toContain('e-startup')
    expect(storyFor('employee', true).map((q) => q.id)).toContain('o-open')
  })
  it('gives 3 daily quests including the path core quest', () => {
    const o = dailyQuests('2026-11-06', 'owner')
    expect(o).toHaveLength(3)
    expect(o.some((q) => q.key === 'shopDays')).toBe(true)
    expect(dailyQuests('2026-11-06', 'employee').some((q) => q.key === 'workDays')).toBe(true)
  })
  it('support content links to lessons', () => {
    for (const g of GRANTS) expect(LESSON_MAP[g.lessonId]).toBeDefined()
    expect(receiptsFor('2026-11-06')).toHaveLength(4)
  })
})

describe('world store', () => {
  beforeEach(() => {
    useWorld.getState().reset()
    useWorld.getState().create({ name: '테스트', avatar: { hair: 0, hairColor: '#000', outfit: '#00f', skin: '#fc9' }, region: { sido: '서울', gu: '마포구', dong: '망원동' }, path: 'owner' })
    useWorld.setState({ energy: 20, energyAt: Date.now() })
  })
  it('levels and energy regen', () => {
    expect(levelOf(0).level).toBe(1)
    expect(levelOf(100).level).toBe(2)
    expect(maxEnergy(1)).toBe(23)
    const t0 = 1_000_000
    expect(energyNow({ energy: 5, energyAt: t0, exp: 0 }, t0 + 90_000 * 3).energy).toBe(8)
    expect(energyNow({ energy: 22, energyAt: t0, exp: 0 }, t0 + 90_000 * 10).energy).toBe(23)
  })
  it('plants, waters and harvests on a real-time clock', () => {
    const s = useWorld.getState()
    const t = Date.now()
    expect(s.plant('f0', 'rice', t)).toBe('wrong') // 벼는 논에서만
    expect(s.plant('f0', 'cabbage', t)).toBe('ok')
    expect(useWorld.getState().plant('f0', 'cabbage', t)).toBe('busy')
    expect(useWorld.getState().harvest('f0', t + 1000)).toBe(0) // 아직
    expect(useWorld.getState().water('f0', t + 1000)).toBe(true)
    const ready = useWorld.getState().plots.f0.readyAt!
    expect(ready - t).toBeLessThan(3 * 60_000)
    expect(useWorld.getState().harvest('f0', ready + 1)).toBe(4) // 3 + 물 준 보너스 1
    expect(useWorld.getState().inventory.cabbage).toBe(4)
    expect(useWorld.getState().counters.harvested).toBe(4)
  })
  it('crafts from ingredients into product stock', () => {
    const recipe = { type: 'craft' as const, inputs: [{ id: 'cabbage', qty: 2 }], yield: 5, minutes: 1 }
    const t = Date.now()
    expect(useWorld.getState().startCraft('p1', recipe, 1, t)).toBe('items')
    useWorld.setState({ inventory: { cabbage: 3 } })
    expect(useWorld.getState().startCraft('p1', recipe, 1, t)).toBe('ok')
    expect(useWorld.getState().inventory.cabbage).toBe(1)
    expect(useWorld.getState().startCraft('p1', recipe, 1, t)).toBe('slot') // 레벨1 = 슬롯 1개
    expect(useWorld.getState().collectCraft(0, t + 1000)).toBe(0)
    expect(useWorld.getState().collectCraft(0, t + 61_000)).toBe(5)
    expect(useWorld.getState().stock.p1).toBe(5)
    expect(craftSlots(6, 1)).toBe(4)
  })
  it('buys, sells and runs a job', () => {
    useWorld.setState({ cash: 10000 })
    expect(useWorld.getState().buy('seed', 'cabbage', 3, 900)).toBe(true)
    expect(useWorld.getState().cash).toBe(7300)
    expect(useWorld.getState().buy('item', 'meat', 10, 5000)).toBe(false)
    useWorld.setState({ inventory: { cabbage: 5 } })
    expect(useWorld.getState().sell('cabbage', 2, 500)).toBe(true)
    expect(useWorld.getState().counters.cropsSold).toBe(2)
    useWorld.getState().joinJob('hr')
    useWorld.getState().recordWork(90, 70000)
    expect(useWorld.getState().job!.perf).toBe(90)
    expect(useWorld.getState().path).toBe('employee')
    useWorld.getState().quitJob()
    expect(useWorld.getState().fromEmployee).toBe(true)
  })
  it('borrows, repays and claims quests once', () => {
    useWorld.setState({ cash: 0 })
    expect(useWorld.getState().borrow(1000000)).toBe(true)
    expect(useWorld.getState().repay(400000)).toBe(true)
    expect(useWorld.getState().loan).toBe(600000)
    useWorld.getState().claimDaily('d-plant', { cash: 1000, exp: 10 })
    useWorld.getState().claimDaily('d-plant', { cash: 1000, exp: 10 })
    expect(useWorld.getState().cash).toBe(601000)
  })
})

describe('avatar', () => {
  it('fills defaults for old saves and keeps chosen values', () => {
    const l = toLook({ hair: 2, hairColor: '#111111', outfit: '#222222', skin: '#333333' }, 'owner')
    expect(l.hair).toBe(2)
    expect(l.role).toBe('owner')
    expect(l.eyes).toBe(DEFAULT_AVATAR.eyes)
    expect(l.hat).toBe(0)
    expect(l.bottomColor).toBe(DEFAULT_AVATAR.bottomColor)
  })
  it('random avatars stay inside the option lists', () => {
    for (let i = 0; i < 40; i++) {
      const a = randomAvatar(i)
      expect(a.hair).toBeLessThan(HAIR_STYLES.length)
      expect(a.eyes).toBeLessThan(EYES.length)
      expect(a.hat).toBeLessThan(HATS.length)
      expect(a.glasses).toBeLessThan(GLASSES.length)
      expect(a.top).toBeLessThan(TOPS.length)
      expect(a.bottom).toBeLessThan(BOTTOMS.length)
    }
  })
  it('has a distinct villager cast with lines', () => {
    expect(VILLAGERS.length).toBeGreaterThanOrEqual(7)
    expect(new Set(VILLAGERS.map((v) => v.name)).size).toBe(VILLAGERS.length)
    for (const v of VILLAGERS) expect(v.lines.length).toBeGreaterThan(0)
  })
})
