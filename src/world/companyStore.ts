import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { todayKey } from '@/lib/date'
import { useWorld } from './store'
import { EXPANSION_MAP, PRODUCT_MAP, RESEARCH_MAP, companyLevel, ordersFor, productionMs, supplyMul, unitPrice, warehouseCap, type ChannelId } from './company'
import { buyPrice } from './items'

export interface Line {
  productId: string
  startedAt: number
  readyAt: number
  qty: number
}

interface CompanyState {
  name: string
  xp: number
  /** 끝낸 연구 */
  done: string[]
  /** 진행 중 연구: 끝나는 시각 */
  active: Record<string, number>
  lines: number
  /** 라인별 작업 (null = 비어 있음) */
  jobs: (Line | null)[]
  /** 완제품 재고 */
  stock: Record<string, number>
  /** 납품한 주문 id */
  fulfilled: string[]
  /** 누적 매출·생산 */
  revenue: number
  produced: number
  expansions: string[]
  founded?: string

  setName: (n: string) => void
  startLine: (index: number, productId: string, now?: number) => 'ok' | 'busy' | 'items' | 'full'
  collectLine: (index: number, now?: number) => number
  buySupply: (id: string, qty: number) => boolean
  startResearch: (id: string, now?: number) => boolean
  /** 끝난 연구 받기 — 처음이면 true */
  collectResearch: (id: string, now?: number) => boolean
  expand: (id: string) => boolean
  sellDirect: (productId: string, qty: number) => number
  fulfill: (orderId: string) => { cash: number; xp: number } | null
  addXp: (n: number) => void
  reset: () => void
}

const initial = () => ({
  name: '',
  xp: 0,
  done: [] as string[],
  active: {} as Record<string, number>,
  lines: 1,
  jobs: [null] as (Line | null)[],
  stock: {} as Record<string, number>,
  fulfilled: [] as string[],
  revenue: 0,
  produced: 0,
  expansions: [] as string[],
  founded: undefined as string | undefined,
})

export const useCompany = create<CompanyState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setName: (n) => set({ name: n, founded: get().founded ?? todayKey() }),

      startLine: (index, productId, now = Date.now()) => {
        const s = get()
        const p = PRODUCT_MAP[productId]
        if (!p || index >= s.lines || s.jobs[index]) return 'busy'
        const stockTotal = Object.values(s.stock).reduce((a, b) => a + b, 0)
        if (stockTotal + p.batch > warehouseCap(s.done)) return 'full'
        const w = useWorld.getState()
        if (p.inputs.some((i) => (w.inventory[i.id] ?? 0) < i.qty)) return 'items'
        const inv = { ...w.inventory }
        for (const i of p.inputs) inv[i.id] -= i.qty
        useWorld.setState({ inventory: inv })
        const jobs = [...s.jobs]
        while (jobs.length < s.lines) jobs.push(null)
        jobs[index] = { productId, startedAt: now, readyAt: now + productionMs(p, s.done, w.fast), qty: p.batch }
        set({ jobs })
        return 'ok'
      },
      collectLine: (index, now = Date.now()) => {
        const s = get()
        const j = s.jobs[index]
        if (!j || j.readyAt > now) return 0
        const jobs = [...s.jobs]
        jobs[index] = null
        set({ jobs, stock: { ...s.stock, [j.productId]: (s.stock[j.productId] ?? 0) + j.qty }, produced: s.produced + j.qty })
        useWorld.getState().bump('produced', j.qty)
        get().addXp(Math.round(j.qty / 4))
        return j.qty
      },
      buySupply: (id, qty) => {
        const mul = supplyMul(get().done)
        if (!mul || qty <= 0) return false
        const unit = Math.round((buyPrice(todayKey(), id) * mul) / 10) * 10
        return useWorld.getState().buy('item', id, qty, unit)
      },
      startResearch: (id, now = Date.now()) => {
        const s = get()
        const r = RESEARCH_MAP[id]
        if (!r || s.done.includes(id) || s.active[id]) return false
        const w = useWorld.getState()
        if (!w.spendCash(r.cost)) return false
        set({ active: { ...s.active, [id]: now + (r.minutes * 60_000) / (w.fast ? 10 : 1) } })
        return true
      },
      collectResearch: (id, now = Date.now()) => {
        const s = get()
        const at = s.active[id]
        if (!at || at > now) return false
        const active = { ...s.active }
        delete active[id]
        set({ active, done: [...s.done, id] })
        useWorld.getState().bump('research')
        get().addXp(60)
        return true
      },
      expand: (id) => {
        const s = get()
        const e = EXPANSION_MAP[id]
        if (!e || s.expansions.includes(id) || companyLevel(s.xp).level < e.level || e.lines !== s.lines + 1) return false
        if (!useWorld.getState().spendCash(e.cost)) return false
        set({ expansions: [...s.expansions, id], lines: e.lines, jobs: [...s.jobs, null] })
        useWorld.getState().bump('expand')
        get().addXp(100)
        return true
      },
      sellDirect: (productId, qty) => {
        const s = get()
        const have = s.stock[productId] ?? 0
        const n = Math.min(have, qty)
        if (n <= 0) return 0
        const unit = unitPrice(PRODUCT_MAP[productId], s.done, 'direct')
        const cash = n * unit
        set({ stock: { ...s.stock, [productId]: have - n }, revenue: s.revenue + cash })
        useWorld.getState().addCash(cash)
        useWorld.getState().bump('sold', n)
        get().addXp(Math.round(cash / 300))
        return cash
      },
      fulfill: (orderId) => {
        const s = get()
        if (s.fulfilled.includes(orderId)) return null
        const [date] = orderId.split(':')
        const lv = companyLevel(s.xp).level
        const o = ordersFor(date, s.done, lv).find((x) => x.id === orderId)
        if (!o || (s.stock[o.productId] ?? 0) < o.qty) return null
        const cash = o.qty * o.unit
        set({ stock: { ...s.stock, [o.productId]: s.stock[o.productId] - o.qty }, fulfilled: [...s.fulfilled.slice(-200), orderId], revenue: s.revenue + cash })
        useWorld.getState().addCash(cash)
        useWorld.getState().bump('orders')
        useWorld.getState().bump('sold', o.qty)
        get().addXp(o.xp)
        return { cash, xp: o.xp }
      },
      addXp: (n) => set({ xp: get().xp + Math.max(0, n) }),
      reset: () => set(initial()),
    }),
    { name: 'golmok-company-v1', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)

/** 오늘 채널 주문 (납품한 건 제외) */
export function openOrders(s: Pick<CompanyState, 'done' | 'xp' | 'fulfilled'>, date = todayKey()) {
  return ordersFor(date, s.done, companyLevel(s.xp).level).filter((o) => !s.fulfilled.includes(o.id))
}

export type { ChannelId }
