import { beforeEach, describe, expect, it } from 'vitest'
import { useWorld } from '@/world/store'
import { useCompany, openOrders } from '@/world/companyStore'
import { CHANNELS, EXPANSIONS, PRODUCTS, RESEARCH, RESEARCH_MAP, companyLevel, openChannels, ordersFor, productionMs, researchState, unitPrice, unlockedProducts, warehouseCap } from '@/world/company'
import { DEFAULT_AVATAR } from '@/world/avatar'
import { INGREDIENT_MAP, CROP_MAP } from '@/world/items'

describe('푸드 컴퍼니 데이터', () => {
  it('모든 제품의 원료는 작물이나 도매 재료예요', () => {
    for (const p of PRODUCTS) for (const i of p.inputs) expect(CROP_MAP[i.id] ?? INGREDIENT_MAP[i.id], `${p.name}:${i.id}`).toBeTruthy()
  })
  it('연구로 열리는 제품은 연구 정의와 맞아요', () => {
    for (const p of PRODUCTS) if (p.research) expect(RESEARCH_MAP[p.research].products).toContain(p.id)
    for (const r of RESEARCH) if (r.after) expect(RESEARCH_MAP[r.after].level).toBeLessThanOrEqual(r.level)
  })
  it('레벨은 EXP 300·n² 마다', () => {
    expect(companyLevel(0).level).toBe(1)
    expect(companyLevel(299).level).toBe(1)
    expect(companyLevel(300).level).toBe(2)
    expect(companyLevel(1200).level).toBe(3)
    expect(companyLevel(1e9).level).toBe(9)
  })
  it('유통 채널은 연구 + 레벨로 열려요', () => {
    expect(openChannels([], 1)).toEqual(['direct'])
    expect(openChannels(['dist1'], 1)).toEqual(['direct'])
    expect(openChannels(['dist1'], 2)).toEqual(['direct', 'cvs'])
    expect(CHANNELS.map((c) => c.id)).toContain('export')
  })
  it('주문은 날짜마다 정해져 있고 열린 제품만 나와요', () => {
    const a = ordersFor('2026-11-08', ['dist1'], 2)
    const b = ordersFor('2026-11-08', ['dist1'], 2)
    expect(a).toEqual(b)
    expect(a.length).toBe(3)
    for (const o of a) expect(unlockedProducts(['dist1']).map((p) => p.id)).toContain(o.productId)
    expect(ordersFor('2026-11-09', ['dist1'], 2)).not.toEqual(a)
  })
  it('연구 효과: 속도·가격·창고', () => {
    const p = PRODUCTS[0]
    expect(productionMs(p, ['auto1'])).toBeCloseTo(productionMs(p, []) / 1.2)
    expect(unitPrice(p, ['quality1'])).toBe(Math.round((p.price * 1.1) / 10) * 10)
    expect(unitPrice(p, [], 'cvs')).toBe(Math.round((p.price * 1.3) / 10) * 10)
    expect(warehouseCap(['warehouse1'])).toBe(400)
  })
})

describe('공장 운영', () => {
  beforeEach(() => {
    useWorld.getState().reset()
    useWorld.getState().create({ name: '민지', avatar: { ...DEFAULT_AVATAR }, region: { sido: '서울', gu: '마포구', dong: '망원동' }, path: 'owner' })
    useWorld.getState().addCash(500000)
    useWorld.setState({ inventory: { rice: 10, seaweed: 10 } })
    useCompany.getState().reset()
  })
  it('원료를 넣어 생산하고 꺼내면 재고·EXP가 늘어요', () => {
    const c = useCompany.getState()
    expect(c.startLine(0, 'onigiri', 1000)).toBe('ok')
    expect(useWorld.getState().inventory.rice).toBe(7)
    expect(useCompany.getState().startLine(0, 'onigiri', 1000)).toBe('busy')
    expect(useCompany.getState().collectLine(0, 2000)).toBe(0)
    const readyAt = useCompany.getState().jobs[0]!.readyAt
    expect(useCompany.getState().collectLine(0, readyAt)).toBe(20)
    expect(useCompany.getState().stock.onigiri).toBe(20)
    expect(useCompany.getState().xp).toBe(5)
    expect(useWorld.getState().counters.produced).toBe(20)
  })
  it('원료가 모자라면 못 돌려요', () => {
    useWorld.setState({ inventory: { rice: 1 } })
    expect(useCompany.getState().startLine(0, 'onigiri', 0)).toBe('items')
  })
  it('연구: 돈·레벨·선행 조건, 끝나면 제품이 열려요', () => {
    const c = useCompany.getState()
    expect(researchState(RESEARCH_MAP.bakery, c, 1e9).state).toBe('locked')
    expect(researchState(RESEARCH_MAP.kimchi, c, 1e9).state).toBe('ready')
    expect(c.startResearch('kimchi', 0)).toBe(true)
    expect(useWorld.getState().cash).toBe(500000 - 20000)
    expect(researchState(RESEARCH_MAP.auto1, useCompany.getState(), 1e9).why).toContain('연구소가 바빠요')
    expect(useCompany.getState().collectResearch('kimchi', 1000)).toBe(false)
    expect(useCompany.getState().collectResearch('kimchi', 2 * 60_000)).toBe(true)
    expect(unlockedProducts(useCompany.getState().done).map((p) => p.id)).toContain('kimchi')
    expect(useWorld.getState().counters.research).toBe(1)
  })
  it('증설은 회사 레벨과 순서대로', () => {
    expect(useCompany.getState().expand('line2')).toBe(false)
    useCompany.getState().addXp(300)
    expect(useCompany.getState().expand('line3')).toBe(false)
    expect(useCompany.getState().expand('line2')).toBe(true)
    expect(useCompany.getState().lines).toBe(2)
    expect(useCompany.getState().jobs.length).toBe(2)
    expect(EXPANSIONS[EXPANSIONS.length - 1].lines).toBe(5)
  })
  it('직판과 납품', () => {
    useCompany.setState({ stock: { onigiri: 100 }, done: ['dist1'], xp: 300 })
    const cash0 = useWorld.getState().cash
    expect(useCompany.getState().sellDirect('onigiri', 10)).toBe(12000)
    expect(useWorld.getState().cash).toBe(cash0 + 12000)
    const orders = openOrders(useCompany.getState(), '2026-11-08').filter((o) => o.productId === 'onigiri' && o.qty <= 90)
    if (orders.length) {
      const o = orders[0]
      const r = useCompany.getState().fulfill(o.id)
      expect(r?.cash).toBe(o.qty * o.unit)
      expect(useCompany.getState().fulfill(o.id)).toBeNull()
      expect(useWorld.getState().counters.orders).toBe(1)
    }
  })
})
