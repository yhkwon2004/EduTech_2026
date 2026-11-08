import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { todayKey } from '@/lib/date'
import { useWorld } from './store'
import { useGame } from '@/game/store'
import {
  CHANNEL_MIN_QUALITY,
  DEPT_MAP,
  EXPANSION_MAP,
  NO_STAFF,
  PRODUCT_MAP,
  RESEARCH_MAP,
  companyLevel,
  costMul,
  dailySalary,
  eventOrder,
  marketingMul,
  ordersFor,
  productionMs,
  qualityStars,
  researchSpeed,
  salesMul,
  staffSpeed,
  supplyMul,
  unitPrice,
  warehouseCap,
  type ChannelId,
  type DeptId,
  type Order,
  type Staff,
} from './company'
import { buyPrice } from './items'

export interface Line {
  productId: string
  startedAt: number
  readyAt: number
  qty: number
}
export interface LedgerDay {
  date: string
  revenue: number
  salary: number
  spend: number
}
export interface LogItem {
  at: number
  text: string
  /** 누가 했나: 직원 자동 / AI 경영진 / 나 */
  who: 'auto' | 'ai' | 'me'
}

interface CompanyState {
  name: string
  xp: number
  done: string[]
  active: Record<string, number>
  lines: number
  jobs: (Line | null)[]
  stock: Record<string, number>
  fulfilled: string[]
  revenue: number
  produced: number
  expansions: string[]
  founded?: string
  staff: Staff
  ledger: LedgerDay[]
  lastSettle: string
  log: LogItem[]

  setName: (n: string) => void
  startLine: (index: number, productId: string, now?: number) => 'ok' | 'busy' | 'items' | 'full'
  collectLine: (index: number, now?: number) => number
  buySupply: (id: string, qty: number) => boolean
  startResearch: (id: string, now?: number) => boolean
  collectResearch: (id: string, now?: number) => boolean
  expand: (id: string) => boolean
  sellDirect: (productId: string, qty: number) => number
  fulfill: (orderId: string) => { cash: number; xp: number } | null
  hire: (dept: DeptId) => boolean
  fire: (dept: DeptId) => boolean
  /** 날짜가 바뀌면 월급 정산 — 낸 월급 */
  settleDay: (date?: string) => number
  /** 직원이 알아서 하는 일 (몇 초마다) */
  tick: (now?: number) => string[]
  addXp: (n: number) => void
  note: (text: string, who?: LogItem['who']) => void
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
  staff: { ...NO_STAFF } as Staff,
  ledger: [] as LedgerDay[],
  lastSettle: '',
  log: [] as LogItem[],
})

const todayLedger = (ledger: LedgerDay[], date: string): LedgerDay[] => (ledger.some((l) => l.date === date) ? ledger : [...ledger.slice(-13), { date, revenue: 0, salary: 0, spend: 0 }])
const addLedger = (ledger: LedgerDay[], date: string, patch: Partial<LedgerDay>) =>
  todayLedger(ledger, date).map((l) => (l.date === date ? { ...l, revenue: l.revenue + (patch.revenue ?? 0), salary: l.salary + (patch.salary ?? 0), spend: l.spend + (patch.spend ?? 0) } : l))

export const useCompany = create<CompanyState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setName: (n) => set({ name: n, founded: get().founded ?? todayKey() }),
      note: (text, who = 'me') => set({ log: [...get().log.slice(-39), { at: Date.now(), text, who }] }),

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
        jobs[index] = { productId, startedAt: now, readyAt: now + productionMs(p, s.done, w.fast) / staffSpeed(s.staff), qty: p.batch }
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
        const ok = useWorld.getState().buy('item', id, qty, unit)
        if (ok) set({ ledger: addLedger(get().ledger, todayKey(), { spend: unit * qty }) })
        return ok
      },
      startResearch: (id, now = Date.now()) => {
        const s = get()
        const r = RESEARCH_MAP[id]
        if (!r || s.done.includes(id) || s.active[id]) return false
        const w = useWorld.getState()
        const cost = Math.round(r.cost * costMul(s.staff))
        if (!w.spendCash(cost)) return false
        set({ active: { ...s.active, [id]: now + (r.minutes * 60_000) / (w.fast ? 10 : 1) / researchSpeed(s.staff) }, ledger: addLedger(s.ledger, todayKey(), { spend: cost }) })
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
        const cost = Math.round(e.cost * costMul(s.staff))
        if (!useWorld.getState().spendCash(cost)) return false
        set({ expansions: [...s.expansions, id], lines: e.lines, jobs: [...s.jobs, null], ledger: addLedger(s.ledger, todayKey(), { spend: cost }) })
        useWorld.getState().bump('expand')
        get().addXp(100)
        return true
      },
      sellDirect: (productId, qty) => {
        const s = get()
        const have = s.stock[productId] ?? 0
        const n = Math.min(have, qty)
        if (n <= 0) return 0
        const unit = Math.round((unitPrice(PRODUCT_MAP[productId], s.done, 'direct') * marketingMul(s.staff)) / 10) * 10
        const cash = n * unit
        set({ stock: { ...s.stock, [productId]: have - n }, revenue: s.revenue + cash, ledger: addLedger(s.ledger, todayKey(), { revenue: cash }) })
        useWorld.getState().addCash(cash)
        useWorld.getState().bump('sold', n)
        get().addXp(Math.round(cash / 300))
        return cash
      },
      fulfill: (orderId) => {
        const s = get()
        if (s.fulfilled.includes(orderId)) return null
        const [date, kind] = orderId.split(':')
        const lv = companyLevel(s.xp).level
        const q = qualityStars(s.done, s.staff)
        let o: Order | null = null
        let event = false
        if (kind === 'event') {
          const ev = eventOrder(date, s.done)
          if (!ev || ev.id !== orderId || q < ev.event.minQuality) return null
          o = ev
          event = true
        } else {
          o = ordersFor(date, s.done, lv, s.staff).find((x) => x.id === orderId) ?? null
          if (!o || q < CHANNEL_MIN_QUALITY[o.channel as ChannelId]) return null
        }
        if ((s.stock[o.productId] ?? 0) < o.qty) return null
        const bonus = !event && q > CHANNEL_MIN_QUALITY[o.channel as ChannelId] ? 1.1 : 1
        const unit = Math.round((o.unit * (event ? 1 : salesMul(s.staff)) * bonus) / 10) * 10
        const cash = o.qty * unit
        set({
          stock: { ...s.stock, [o.productId]: s.stock[o.productId] - o.qty },
          fulfilled: [...s.fulfilled.slice(-200), orderId],
          revenue: s.revenue + cash,
          ledger: addLedger(s.ledger, todayKey(), { revenue: cash }),
        })
        const w = useWorld.getState()
        w.addCash(cash)
        w.bump('orders')
        w.bump('sold', o.qty)
        if (event) {
          w.bump('eventOrders')
          // 이벤트 납품은 동네 평판(가게 랭킹)에도 도움이 돼요
          const g = useGame.getState()
          if (g.started) useGame.setState({ stats: { ...g.stats, reputation: Math.min(5, Math.round((g.stats.reputation + 0.1) * 100) / 100), awareness: Math.min(100, g.stats.awareness + 3) } })
        }
        get().addXp(o.xp)
        return { cash, xp: o.xp }
      },
      hire: (dept) => {
        const s = get()
        const d = DEPT_MAP[dept]
        if (!d || (s.staff[dept] ?? 0) >= d.max) return false
        const fee = d.salary * 3
        if (!useWorld.getState().spendCash(fee)) return false
        set({ staff: { ...s.staff, [dept]: (s.staff[dept] ?? 0) + 1 }, ledger: addLedger(s.ledger, todayKey(), { spend: fee }) })
        useWorld.getState().bump('hired')
        get().addXp(20)
        return true
      },
      fire: (dept) => {
        const s = get()
        if ((s.staff[dept] ?? 0) <= 0) return false
        set({ staff: { ...s.staff, [dept]: s.staff[dept] - 1 } })
        return true
      },
      settleDay: (date = todayKey()) => {
        const s = get()
        if (s.lastSettle === date) return 0
        const due = dailySalary(s.staff)
        const w = useWorld.getState()
        const paid = Math.min(due, Math.max(0, w.cash))
        if (paid > 0) w.addCash(-paid)
        set({ lastSettle: date, ledger: addLedger(s.ledger, date, { salary: paid }) })
        if (due > 0) get().note(paid < due ? `💼 월급 ${paid.toLocaleString()}원 지급 (${(due - paid).toLocaleString()}원 부족!)` : `💼 직원 월급 ${paid.toLocaleString()}원 지급`, 'auto')
        return paid
      },
      tick: (now = Date.now()) => {
        const s = get()
        const out: string[] = []
        const prod = s.staff.production ?? 0
        if (prod >= 1) {
          s.jobs.forEach((j, i) => {
            if (!j || j.readyAt > now) return
            const n = get().collectLine(i, now)
            if (n) out.push(`⚙️ 생산팀: ${PRODUCT_MAP[j.productId].emoji} ${PRODUCT_MAP[j.productId].name} ${n}개 꺼냄`)
            if (prod >= 2 && get().startLine(i, j.productId, now) === 'ok') out.push(`⚙️ 생산팀: ${PRODUCT_MAP[j.productId].name} 다시 가동`)
          })
        }
        if ((s.staff.sales ?? 0) >= 2) {
          for (const o of openOrders(get())) {
            const r = get().fulfill(o.id)
            if (r) out.push(`🚚 영업팀: ${PRODUCT_MAP[o.productId].name} ${o.qty}개 납품 +${r.cash.toLocaleString()}원`)
          }
        }
        for (const t of out) get().note(t, 'auto')
        return out
      },
      addXp: (n) => set({ xp: get().xp + Math.max(0, n) }),
      reset: () => set(initial()),
    }),
    {
      name: 'golmok-company-v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (p) => ({ ...initial(), ...((p ?? {}) as object) }) as CompanyState,
    },
  ),
)

/** 오늘 채널 주문 (납품한 건 제외) */
export function openOrders(s: Pick<CompanyState, 'done' | 'xp' | 'fulfilled' | 'staff'>, date = todayKey()) {
  return ordersFor(date, s.done, companyLevel(s.xp).level, s.staff).filter((o) => !s.fulfilled.includes(o.id))
}

/** 오늘 이벤트 주문 (납품 전이면) */
export function openEvent(s: Pick<CompanyState, 'done' | 'fulfilled'>, date = todayKey()) {
  const ev = eventOrder(date, s.done)
  return ev && !s.fulfilled.includes(ev.id) ? ev : null
}

export type { ChannelId }
