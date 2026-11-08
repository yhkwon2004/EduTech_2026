import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Region } from '@/game/types'
import { todayKey } from '@/lib/date'
import { CROP_MAP, type Recipe } from './items'
import { canPromote, RANKS, type JobId } from './jobs'
import { BUILDINGS, INITIAL_BUILT, PLOT_MAP } from './map'
import type { Path } from './quests'
import { LOAN } from './support'
import { DEFAULT_AVATAR, type Avatar } from './avatar'

export interface PlotState {
  crop?: string
  plantedAt?: number
  readyAt?: number
  watered?: boolean
}

export interface CraftJob {
  productId: string
  qty: number
  startedAt: number
  readyAt: number
}

export interface JobState {
  id: JobId
  rank: number
  perf: number
  joinedAt: string
  lastWork?: string
  history: { date: string; perf: number; pay: number }[]
}

export type { Avatar } from './avatar'

const ENERGY_MS = 90_000

export function levelOf(exp: number): { level: number; cur: number; next: number; progress: number } {
  let level = 1
  while (50 * (level + 1) * level <= exp) level++
  const cur = 50 * level * (level - 1)
  const next = 50 * (level + 1) * level
  return { level, cur, next, progress: (exp - cur) / (next - cur) }
}

export function maxEnergy(level: number): number {
  return 20 + level * 3
}

/** 시간이 지나 회복된 체력 */
export function energyNow(s: { energy: number; energyAt: number; exp: number }, now = Date.now()): { energy: number; nextIn: number } {
  const max = maxEnergy(levelOf(s.exp).level)
  if (s.energy >= max) return { energy: s.energy, nextIn: 0 }
  const gained = Math.floor((now - s.energyAt) / ENERGY_MS)
  const energy = Math.min(max, s.energy + gained)
  const nextIn = energy >= max ? 0 : ENERGY_MS - ((now - s.energyAt) % ENERGY_MS)
  return { energy, nextIn }
}

export function craftSlots(level: number, bought: number): number {
  return 1 + (level >= 3 ? 1 : 0) + (level >= 6 ? 1 : 0) + bought
}

export interface WorldState {
  created: boolean
  name: string
  avatar: Avatar
  region: Region
  path: Path | null
  /** 직장인으로 시작했다가 창업했는지 */
  fromEmployee: boolean
  cash: number
  exp: number
  energy: number
  energyAt: number
  inventory: Record<string, number>
  seeds: Record<string, number>
  /** 상품 재고 (상품 id → 개수) */
  stock: Record<string, number>
  recipes: Record<string, Recipe>
  plots: Record<string, PlotState>
  crafting: CraftJob[]
  slotsBought: number
  job?: JobState
  counters: Record<string, number>
  daily: { date: string; counts: Record<string, number>; claimed: string[] }
  visited: Record<string, boolean>
  storyClaimed: string[]
  pos: { x: number; y: number }
  loan: number
  loanDate?: string
  grants: string[]
  receiptsDay?: string
  fast: boolean
  invested: number
  /** 지은 건물: 완공 시각 (지금보다 뒤면 공사 중) */
  buildings: Record<string, number>
  startBuild: (id: string, cost: number, minutes: number, now?: number) => boolean
  /** 완공 (공사가 끝났을 때) — 처음 완공이면 true */
  finishBuild: (id: string, now?: number) => boolean

  create: (p: { name: string; avatar: Avatar; region: Region; path: Path }) => void
  setAvatar: (a: Partial<Avatar>, name?: string) => void
  setPath: (p: Path) => void
  setPos: (p: { x: number; y: number }) => void
  /** 체력을 쓰면 true, 모자라면 false */
  spend: (n: number) => boolean
  gainEnergy: (n: number) => void
  addExp: (n: number) => number
  addCash: (n: number) => void
  /** 돈이 있으면 빼고 true */
  spendCash: (n: number) => boolean
  setCash: (n: number) => void
  bump: (key: string, n?: number) => void
  visit: (id: string) => void

  buy: (kind: 'seed' | 'item', id: string, qty: number, unit: number) => boolean
  sell: (id: string, qty: number, unit: number) => boolean
  plant: (plotId: string, cropId: string, now?: number) => 'ok' | 'energy' | 'seed' | 'busy' | 'wrong'
  water: (plotId: string, now?: number) => boolean
  harvest: (plotId: string, now?: number) => number
  startCraft: (productId: string, recipe: Recipe & { type: 'craft' }, minutesMul: number, now?: number) => 'ok' | 'energy' | 'slot' | 'items'
  collectCraft: (index: number, now?: number) => number
  buyStock: (productId: string, qty: number, unit: number) => boolean
  setStock: (productId: string, n: number) => void
  setRecipe: (productId: string, r: Recipe) => void
  buySlot: (price: number) => boolean

  joinJob: (id: JobId) => void
  changeJob: (id: JobId) => void
  recordWork: (perf: number, pay: number, date?: string) => void
  promote: (roleLessons: number) => boolean
  quitJob: () => void

  claimStory: (id: string, reward: { cash: number; exp: number }) => void
  claimDaily: (id: string, reward: { cash: number; exp: number }) => void

  borrow: (amount: number) => boolean
  repay: (amount: number) => boolean
  settleInterest: () => number
  grant: (id: string, amount: number) => void
  fileReceipts: (reward: number) => void
  setFast: (v: boolean) => void
  noteInvest: () => void
  reset: () => void
}

const initial = () => ({
  created: false,
  name: '',
  avatar: { ...DEFAULT_AVATAR } as Avatar,
  region: { sido: '서울', gu: '마포구', dong: '망원동' },
  path: null as Path | null,
  fromEmployee: false,
  cash: 0,
  exp: 0,
  energy: 23,
  energyAt: Date.now(),
  inventory: {} as Record<string, number>,
  seeds: { cabbage: 2, rice: 1 } as Record<string, number>,
  stock: {} as Record<string, number>,
  recipes: {} as Record<string, Recipe>,
  plots: {} as Record<string, PlotState>,
  crafting: [] as CraftJob[],
  slotsBought: 0,
  job: undefined as JobState | undefined,
  counters: {} as Record<string, number>,
  daily: { date: todayKey(), counts: {} as Record<string, number>, claimed: [] as string[] },
  visited: {} as Record<string, boolean>,
  storyClaimed: [] as string[],
  pos: { x: 12, y: 9 },
  loan: 0,
  loanDate: undefined as string | undefined,
  grants: [] as string[],
  receiptsDay: undefined as string | undefined,
  fast: false,
  invested: 0,
  buildings: Object.fromEntries(INITIAL_BUILT.map((id) => [id, 0])) as Record<string, number>,
})

/** 오늘 카운터 (날짜가 바뀌면 새로) */
function todayCounts(s: Pick<WorldState, 'daily'>, date = todayKey()) {
  return s.daily.date === date ? s.daily : { date, counts: {}, claimed: [] }
}

export const useWorld = create<WorldState>()(
  persist(
    (set, get) => {
      const settle = () => {
        const s = get()
        const now = Date.now()
        const { energy } = energyNow(s, now)
        if (energy !== s.energy) {
          const gained = energy - s.energy
          set({ energy, energyAt: s.energyAt + gained * ENERGY_MS })
        }
        return get().energy
      }
      const bumpBoth = (key: string, n = 1) => {
        const s = get()
        const d = todayCounts(s)
        set({ counters: { ...s.counters, [key]: (s.counters[key] ?? 0) + n }, daily: { ...d, counts: { ...d.counts, [key]: (d.counts[key] ?? 0) + n } } })
      }
      return {
        ...initial(),

        create: ({ name, avatar, region, path }) =>
          set({
            ...initial(),
            created: true,
            name,
            avatar,
            region,
            path,
            cash: path === 'owner' ? 0 : 300000,
            energyAt: Date.now(),
          }),
        setAvatar: (a, name) => set({ avatar: { ...get().avatar, ...a }, ...(name ? { name } : {}) }),
        setPath: (p) => set({ path: p }),
        setPos: (p) => set({ pos: p }),
        spend: (n) => {
          const e = settle()
          if (e < n) return false
          const s = get()
          const max = maxEnergy(levelOf(s.exp).level)
          // 가득 찬 상태에서 쓰면 회복 타이머를 지금부터 시작
          set({ energy: e - n, energyAt: e >= max ? Date.now() : s.energyAt })
          return true
        },
        gainEnergy: (n) => {
          const e = settle()
          const max = maxEnergy(levelOf(get().exp).level)
          set({ energy: Math.min(max, e + n) })
        },
        addExp: (n) => {
          const before = levelOf(get().exp).level
          set({ exp: get().exp + n })
          const after = levelOf(get().exp).level
          if (after > before) set({ energy: maxEnergy(after), energyAt: Date.now() })
          return after - before
        },
        addCash: (n) => set({ cash: Math.round(get().cash + n) }),
        spendCash: (n) => {
          if (get().cash < n) return false
          set({ cash: Math.round(get().cash - n) })
          return true
        },
        setCash: (n) => set({ cash: Math.round(n) }),
        bump: (key, n = 1) => bumpBoth(key, n),
        visit: (id) => !get().visited[id] && set({ visited: { ...get().visited, [id]: true } }),

        buy: (kind, id, qty, unit) => {
          const s = get()
          const cost = qty * unit
          if (qty <= 0 || s.cash < cost) return false
          if (kind === 'seed') set({ cash: s.cash - cost, seeds: { ...s.seeds, [id]: (s.seeds[id] ?? 0) + qty } })
          else set({ cash: s.cash - cost, inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + qty } })
          bumpBoth(kind === 'seed' ? 'seedsBought' : 'bought', 1)
          return true
        },
        sell: (id, qty, unit) => {
          const s = get()
          if (qty <= 0 || (s.inventory[id] ?? 0) < qty) return false
          set({ cash: s.cash + qty * unit, inventory: { ...s.inventory, [id]: s.inventory[id] - qty } })
          if (CROP_MAP[id]) bumpBoth('cropsSold', qty)
          return true
        },

        plant: (plotId, cropId, now = Date.now()) => {
          const s = get()
          const plot = PLOT_MAP[plotId]
          const crop = CROP_MAP[cropId]
          if (!plot || !crop) return 'wrong'
          if (!!crop.paddy !== (plot.kind === 'paddy')) return 'wrong'
          if (s.plots[plotId]?.crop) return 'busy'
          if ((s.seeds[cropId] ?? 0) < 1) return 'seed'
          if (!get().spend(1)) return 'energy'
          const ms = (crop.minutes * 60_000) / (get().fast ? 10 : 1)
          set({
            seeds: { ...get().seeds, [cropId]: get().seeds[cropId] - 1 },
            plots: { ...get().plots, [plotId]: { crop: cropId, plantedAt: now, readyAt: now + ms, watered: false } },
          })
          bumpBoth('planted')
          get().addExp(2)
          return 'ok'
        },
        water: (plotId, now = Date.now()) => {
          const p = get().plots[plotId]
          if (!p?.crop || p.watered || !p.readyAt || now >= p.readyAt) return false
          if (!get().spend(1)) return false
          const left = p.readyAt - now
          set({ plots: { ...get().plots, [plotId]: { ...p, watered: true, readyAt: now + Math.round(left * 0.6) } } })
          bumpBoth('watered')
          get().addExp(1)
          return true
        },
        harvest: (plotId, now = Date.now()) => {
          const p = get().plots[plotId]
          if (!p?.crop || !p.readyAt || now < p.readyAt) return 0
          if (!get().spend(1)) return -1
          const crop = CROP_MAP[p.crop]
          const qty = crop.yield + (p.watered ? 1 : 0)
          const plots = { ...get().plots }
          delete plots[plotId]
          set({ plots, inventory: { ...get().inventory, [crop.id]: (get().inventory[crop.id] ?? 0) + qty } })
          bumpBoth('harvested', qty)
          get().addExp(4)
          return qty
        },

        startCraft: (productId, recipe, minutesMul, now = Date.now()) => {
          const s = get()
          const slots = craftSlots(levelOf(s.exp).level, s.slotsBought)
          if (s.crafting.length >= slots) return 'slot'
          if (recipe.inputs.some((i) => (s.inventory[i.id] ?? 0) < i.qty)) return 'items'
          if (!get().spend(2)) return 'energy'
          const inv = { ...get().inventory }
          for (const i of recipe.inputs) inv[i.id] -= i.qty
          const ms = (recipe.minutes * 60_000 * minutesMul) / (get().fast ? 10 : 1)
          set({ inventory: inv, crafting: [...get().crafting, { productId, qty: recipe.yield, startedAt: now, readyAt: now + ms }] })
          return 'ok'
        },
        collectCraft: (index, now = Date.now()) => {
          const s = get()
          const job = s.crafting[index]
          if (!job || now < job.readyAt) return 0
          set({
            crafting: s.crafting.filter((_, i) => i !== index),
            stock: { ...s.stock, [job.productId]: (s.stock[job.productId] ?? 0) + job.qty },
          })
          bumpBoth('crafted')
          get().addExp(6)
          return job.qty
        },
        buyStock: (productId, qty, unit) => {
          const s = get()
          if (qty <= 0 || s.cash < qty * unit) return false
          set({ cash: s.cash - qty * unit, stock: { ...s.stock, [productId]: (s.stock[productId] ?? 0) + qty } })
          bumpBoth('bought')
          return true
        },
        setStock: (productId, n) => set({ stock: { ...get().stock, [productId]: Math.max(0, Math.round(n)) } }),
        setRecipe: (productId, r) => set({ recipes: { ...get().recipes, [productId]: r } }),
        buySlot: (price) => {
          const s = get()
          if (s.slotsBought >= 2 || s.cash < price) return false
          set({ cash: s.cash - price, slotsBought: s.slotsBought + 1 })
          return true
        },

        joinJob: (id) => set({ job: { id, rank: 0, perf: 0, joinedAt: todayKey(), history: [] }, path: 'employee' }),
        changeJob: (id) => {
          const j = get().job
          if (j) set({ job: { ...j, id } })
        },
        recordWork: (perf, pay, date = todayKey()) => {
          const j = get().job
          if (!j) return
          set({
            job: { ...j, perf: j.perf + perf, lastWork: date, history: [...j.history, { date, perf, pay }].slice(-30) },
            cash: get().cash + pay,
          })
          bumpBoth('workDays')
          get().addExp(15)
        },
        promote: (roleLessons) => {
          const j = get().job
          if (!j || !canPromote(j.rank, j.perf, roleLessons)) return false
          set({ job: { ...j, rank: Math.min(RANKS.length - 1, j.rank + 1) } })
          get().addExp(40)
          return true
        },
        quitJob: () => set({ job: undefined, path: 'owner', fromEmployee: true }),

        claimStory: (id, reward) => {
          if (get().storyClaimed.includes(id)) return
          set({ storyClaimed: [...get().storyClaimed, id], cash: get().cash + reward.cash })
          get().addExp(reward.exp)
        },
        claimDaily: (id, reward) => {
          const d = todayCounts(get())
          if (d.claimed.includes(id)) return
          set({ daily: { ...d, claimed: [...d.claimed, id] }, cash: get().cash + reward.cash })
          get().addExp(reward.exp)
        },

        borrow: (amount) => {
          const s = get()
          if (amount <= 0 || s.loan + amount > LOAN.max) return false
          set({ loan: s.loan + amount, cash: s.cash + amount, loanDate: s.loanDate ?? todayKey() })
          return true
        },
        repay: (amount) => {
          const s = get()
          const a = Math.min(amount, s.loan)
          if (a <= 0 || s.cash < a) return false
          set({ loan: s.loan - a, cash: s.cash - a, loanDate: s.loan - a > 0 ? s.loanDate : undefined })
          return true
        },
        /** 날짜가 바뀐 만큼 이자 (현금에서 자동 납부) */
        settleInterest: () => {
          const s = get()
          const today = todayKey()
          if (!s.loan || !s.loanDate || s.loanDate >= today) return 0
          const days = Math.max(0, Math.round((new Date(today).getTime() - new Date(s.loanDate).getTime()) / 86400000))
          const interest = Math.round(s.loan * LOAN.dailyRate * days)
          set({ cash: s.cash - interest, loanDate: today })
          return interest
        },
        grant: (id, amount) => {
          if (get().grants.includes(id)) return
          set({ grants: [...get().grants, id], cash: get().cash + amount })
          bumpBoth('grants')
          get().addExp(30)
        },
        fileReceipts: (reward) => {
          if (get().receiptsDay === todayKey()) return
          set({ receiptsDay: todayKey(), cash: get().cash + reward })
          get().addExp(15)
        },
        setFast: (v) => set({ fast: v }),
        startBuild: (id, cost, minutes, now = Date.now()) => {
          const s = get()
          if (s.buildings[id] !== undefined || s.cash < cost) return false
          set({ cash: s.cash - cost, buildings: { ...s.buildings, [id]: now + (minutes * 60_000) / (s.fast ? 10 : 1) } })
          return true
        },
        finishBuild: (id, now = Date.now()) => {
          const s = get()
          const at = s.buildings[id]
          if (at === undefined || at > now || s.counters[`built:${id}`]) return false
          bumpBoth(`built:${id}`)
          bumpBoth('built')
          set({ buildings: { ...get().buildings, [id]: 0 } })
          return true
        },
        noteInvest: () => set({ invested: get().invested + 1 }),
        reset: () => set({ ...initial(), energyAt: Date.now() }),
      }
    },
    {
      name: 'golmok-world-v1',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // v2: 꾸미기 항목이 늘었어요. 예전 '모자' 머리는 짧은 머리 + 야구모자로
      // v3: 건물 짓기 — 이미 하던 마을은 다 지어진 걸로
      migrate: (persisted, version) => {
        const p = { ...((persisted ?? {}) as Record<string, unknown>) }
        if (version < 2 && p.avatar) {
          const a = { ...(p.avatar as Avatar) }
          if (a.hair === 3) Object.assign(a, { hair: 0, hat: 1 })
          p.avatar = { ...DEFAULT_AVATAR, ...a }
        }
        if (version < 3 && !p.buildings) p.buildings = Object.fromEntries(BUILDINGS.map((b) => [b.id, 0]))
        return p as unknown as WorldState
      },
    },
  ),
)

export function todayOf(s: Pick<WorldState, 'daily'>) {
  return todayCounts(s)
}
