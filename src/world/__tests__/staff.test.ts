import { beforeEach, describe, expect, it } from 'vitest'
import { useWorld } from '@/world/store'
import { useCompany, openEvent } from '@/world/companyStore'
import { DEPTS, EVENTS, NO_STAFF, dailySalary, eventFor, eventOrder, qualityStars, researchSpeed, staffSpeed } from '@/world/company'
import { offlineAdvice, runTool, snapshot } from '@/world/ai'
import { DEFAULT_AVATAR } from '@/world/avatar'

describe('직원·품질·이벤트 규칙', () => {
  it('월급은 재무팀이 깎아 줘요', () => {
    expect(dailySalary(NO_STAFF)).toBe(0)
    expect(dailySalary({ ...NO_STAFF, production: 2 })).toBe(12000)
    expect(dailySalary({ ...NO_STAFF, production: 2, finance: 1 })).toBe(Math.round((12000 + 7000) * 0.9))
    expect(staffSpeed({ ...NO_STAFF, production: 3 })).toBeCloseTo(1.15)
    expect(researchSpeed({ ...NO_STAFF, rnd: 2 })).toBeCloseTo(1.3)
  })
  it('품질 별은 연구와 개발팀으로', () => {
    expect(qualityStars([])).toBe(1)
    expect(qualityStars(['quality1'])).toBe(2)
    expect(qualityStars(['quality1', 'package'])).toBe(3)
    expect(qualityStars([], { ...NO_STAFF, rnd: 2 })).toBe(2)
  })
  it('시즌 이벤트는 날짜로 정해지고 열린 제품만 주문해요', () => {
    expect(eventFor('2026-11-08')?.id).toBe('pepero')
    expect(eventFor('2026-12-20')?.id).toBe('xmas')
    expect(eventFor('2026-03-03')).toBeNull()
    for (const e of EVENTS) expect(e.from[0] * 100 + e.from[1]).toBeLessThanOrEqual(e.to[0] * 100 + e.to[1])
    const o = eventOrder('2026-11-08', [])!
    expect(['ricecake', 'chips']).toContain(o.productId)
    expect(eventOrder('2026-11-08', [])).toEqual(o)
  })
})

describe('공장 직원 운영', () => {
  beforeEach(() => {
    useWorld.getState().reset()
    useWorld.getState().create({ name: '민지', avatar: { ...DEFAULT_AVATAR }, region: { sido: '서울', gu: '마포구', dong: '망원동' }, path: 'owner' })
    useWorld.getState().addCash(300000)
    useWorld.setState({ inventory: { rice: 40, seaweed: 40 } })
    useCompany.getState().reset()
  })
  it('고용·월급 정산·자동 작업', () => {
    const c = useCompany.getState()
    expect(c.hire('production')).toBe(true)
    expect(useCompany.getState().hire('production')).toBe(true)
    expect(useWorld.getState().cash).toBe(300000 - 18000 * 2)
    expect(useCompany.getState().settleDay('2026-11-08')).toBe(12000)
    expect(useCompany.getState().settleDay('2026-11-08')).toBe(0)
    expect(useCompany.getState().ledger.find((l) => l.date === '2026-11-08')?.salary).toBe(12000)
    // 생산팀 2명: 끝난 라인을 꺼내고 다시 돌려요
    expect(useCompany.getState().startLine(0, 'onigiri', 0)).toBe('ok')
    const readyAt = useCompany.getState().jobs[0]!.readyAt
    const acts = useCompany.getState().tick(readyAt)
    expect(acts.length).toBe(2)
    expect(useCompany.getState().stock.onigiri).toBe(20)
    expect(useCompany.getState().jobs[0]).not.toBeNull()
    expect(DEPTS.every((d) => d.max >= 1)).toBe(true)
  })
  it('이벤트 주문은 품질이 맞아야 납품돼요', () => {
    useCompany.setState({ stock: { ricecake: 200, chips: 200 }, done: [] })
    const ev = openEvent(useCompany.getState(), '2026-11-08')!
    expect(ev.event.minQuality).toBe(1)
    const r = useCompany.getState().fulfill(ev.id)
    expect(r?.cash).toBe(ev.qty * ev.unit)
    expect(useWorld.getState().counters.eventOrders).toBe(1)
    useCompany.setState({ stock: { cookie: 200, jam: 200 }, done: ['bakery', 'dessert'], fulfilled: [] })
    const x = eventOrder('2026-12-20', ['bakery', 'dessert'])!
    expect(x.event.minQuality).toBe(2)
    expect(useCompany.getState().fulfill(x.id)).toBeNull()
  })
  it('AI 도구는 게임 상태를 바꾸고 결과를 돌려줘요', () => {
    expect(runTool('start_production', { line: 1, productId: 'onigiri' }).ok).toBe(true)
    expect(runTool('start_production', { line: 1, productId: 'onigiri' }).ok).toBe(false)
    expect(runTool('start_research', { researchId: 'bakery' }).ok).toBe(false)
    expect(runTool('start_research', { researchId: 'kimchi' }).ok).toBe(true)
    expect(runTool('hire', { dept: 'sales' }).ok).toBe(true)
    expect(runTool('rename_company', { name: '민지 푸드 컴퍼니' }).ok).toBe(true)
    expect(useCompany.getState().name).toBe('민지 푸드 컴퍼니')
    expect(runTool('nope', {}).ok).toBe(false)
    const snap = snapshot()
    expect(snap.company.staff.sales).toBe(1)
    expect(snap.researchActive).toContain('kimchi')
    for (const d of DEPTS) expect(offlineAdvice(d.id)).toContain(d.head)
  })
})
