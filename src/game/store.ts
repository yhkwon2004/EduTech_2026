import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { BizType } from '@/types'
import { hash } from '@/lib/rng'
import { todayKey, weekday } from '@/lib/date'
import { CHAPTERS, MARKETING, SEASON_DAYS, START_CASH, UPGRADES } from './data'
import { generateRivals, simulateDay, type Skills } from './sim'
import { closeSeason, flagsFromDay, missionDone, type SeasonEnd } from './progress'
import type { DayDecision, DayResult, HallEntry, MarketingId, Product, Region, Rival, ShopStats } from './types'

const uid = () => `pd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export interface GameState {
  started: boolean
  seed: number
  shopName: string
  shopEmoji: string
  color: string
  biz: BizType
  region: Region
  products: Product[]
  stats: ShopStats
  rivals: Rival[]
  tier: number
  season: number
  dayInSeason: number
  seasonScore: number
  day: number
  history: DayResult[]
  hall: HallEntry[]
  lastPlayedDate?: string
  usedMarketing: MarketingId[]
  replyWins: number
  /** 리뷰 답글 미니게임을 한 날 (하루 한 번) */
  replyDay?: string
  flags: Record<string, boolean>
  claimed: string[]
  fastPlay: boolean
  seasonEnd?: SeasonEnd

  start: (p: { shopName: string; shopEmoji: string; color: string; biz: BizType; region: Region; products: Omit<Product, 'id' | 'stock'>[] }) => void
  saveProduct: (p: Omit<Product, 'id' | 'stock'> & { id?: string }) => void
  removeProduct: (id: string) => void
  play: (decision: DayDecision, ctx: { skills: Skills; buff: number; lessonsToday: number }) => DayResult
  buy: (kind: keyof typeof UPGRADES, discount: number) => boolean
  train: (productId: string, discount: number) => boolean
  claim: (chapterId: string) => void
  answerReply: (correct: boolean) => void
  setFastPlay: (v: boolean) => void
  dismissSeason: () => void
  resetGame: () => void
}

const initialStats = (): ShopStats => ({ cash: START_CASH, awareness: 20, reputation: 3, equipment: 0, staff: 0, interior: 0, totalProfit: 0, xp: 0 })

const initial = () => ({
  started: false,
  seed: 0,
  shopName: '',
  shopEmoji: '🏠',
  color: '#176FF2',
  biz: 'food' as BizType,
  region: { sido: '서울', gu: '', dong: '' },
  products: [] as Product[],
  stats: initialStats(),
  rivals: [] as Rival[],
  tier: 0,
  season: 1,
  dayInSeason: 0,
  seasonScore: 0,
  day: 0,
  history: [] as DayResult[],
  hall: [] as HallEntry[],
  lastPlayedDate: undefined,
  usedMarketing: [] as MarketingId[],
  replyWins: 0,
  replyDay: undefined as string | undefined,
  flags: {},
  claimed: [] as string[],
  fastPlay: false,
  seasonEnd: undefined,
})

/** 개업 첫 3일은 연달아 장사 가능(튜토리얼), 그 뒤로는 하루에 한 번 */
export function canPlayToday(g: Pick<GameState, 'day' | 'lastPlayedDate' | 'fastPlay'>, today = todayKey()): boolean {
  return g.day < 3 || g.fastPlay || g.lastPlayedDate !== today
}

export function upgradeCost(kind: keyof typeof UPGRADES, level: number, discount: number): number | null {
  const u = UPGRADES[kind]
  if (level >= u.max) return null
  return Math.round(u.costs[level] * (1 - discount))
}

export function trainCost(quality: number, discount: number): number | null {
  if (quality >= 5) return null
  return Math.round(250000 * Math.ceil(quality) * (1 - discount))
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial(),

      start: ({ shopName, shopEmoji, color, biz, region, products }) => {
        const seed = hash(`${region.sido}|${region.gu}|${region.dong}|${shopName}|${Date.now()}`)
        set({
          ...initial(),
          started: true,
          seed,
          shopName,
          shopEmoji,
          color,
          biz,
          region,
          products: products.map((p) => ({ ...p, id: uid(), stock: 0 })),
          rivals: generateRivals({ seed, tier: 0, region, biz }),
        })
      },

      saveProduct: (p) => {
        const list = get().products
        if (p.id && list.some((x) => x.id === p.id)) set({ products: list.map((x) => (x.id === p.id ? { ...x, ...p, id: x.id } : x)) })
        else if (list.length < 5) set({ products: [...list, { ...p, id: uid(), stock: 0 }] })
      },
      removeProduct: (id) => {
        if (get().products.length <= 1) return
        set({ products: get().products.filter((p) => p.id !== id) })
      },

      play: (decision, ctx) => {
        const g = get()
        const date = todayKey()
        const prev = g.history[g.history.length - 1]
        const out = simulateDay({
          seed: g.seed,
          day: g.day + 1,
          date,
          weekday: weekday(date),
          tier: g.tier,
          biz: g.biz,
          stats: g.stats,
          products: g.products,
          rivals: g.rivals,
          decision,
          skills: ctx.skills,
          buff: ctx.buff,
          lessonsToday: ctx.lessonsToday,
          shopName: g.shopName,
          shopEmoji: g.shopEmoji,
          prevRank: prev?.rank,
        })
        const dayInSeason = g.dayInSeason + 1
        const seasonScore = g.seasonScore + out.result.score
        let tier = g.tier
        let rivals = out.rivals
        let season = g.season
        let nextDayInSeason = dayInSeason
        let nextSeasonScore = seasonScore
        let hall = g.hall
        let seasonEnd: SeasonEnd | undefined
        if (dayInSeason >= SEASON_DAYS) {
          const closed = closeSeason({ season, tier, region: g.region, biz: g.biz, seed: g.seed, playerScore: seasonScore, rivals })
          seasonEnd = closed.end
          hall = [...hall, { season, tier, league: closed.end.league, rank: closed.end.rank, title: closed.end.title, score: seasonScore }]
          tier = closed.nextTier
          rivals = closed.nextRivals
          season += 1
          nextDayInSeason = 0
          nextSeasonScore = 0
        }
        set({
          stats: out.stats,
          products: out.products,
          rivals,
          tier,
          season,
          dayInSeason: nextDayInSeason,
          seasonScore: nextSeasonScore,
          day: g.day + 1,
          history: [...g.history, out.result].slice(-30),
          hall,
          lastPlayedDate: date,
          usedMarketing: Array.from(new Set([...g.usedMarketing, ...decision.marketing.filter((m) => MARKETING[m])])),
          flags: flagsFromDay(g.flags, out.result),
          seasonEnd,
        })
        return out.result
      },

      buy: (kind, discount) => {
        const g = get()
        const level = g.stats[kind]
        const cost = upgradeCost(kind, level, discount)
        if (cost === null || g.stats.cash < cost) return false
        const stats = { ...g.stats, cash: g.stats.cash - cost, [kind]: level + 1 }
        if (kind === 'interior') stats.awareness = Math.min(100, stats.awareness + 3)
        set({ stats })
        return true
      },
      train: (productId, discount) => {
        const g = get()
        const p = g.products.find((x) => x.id === productId)
        if (!p) return false
        const cost = trainCost(p.quality, discount)
        if (cost === null || g.stats.cash < cost) return false
        set({
          stats: { ...g.stats, cash: g.stats.cash - cost },
          products: g.products.map((x) => (x.id === productId ? { ...x, quality: Math.min(5, Math.floor(x.quality) + 1) } : x)),
        })
        return true
      },
      claim: (chapterId) => {
        const g = get()
        const ch = CHAPTERS.find((c) => c.id === chapterId)
        if (!ch || g.claimed.includes(chapterId)) return
        const view = { products: g.products, stats: g.stats, day: g.day, tier: g.tier, hall: g.hall, usedMarketing: g.usedMarketing, replyWins: g.replyWins, flags: g.flags }
        if (!ch.missions.every((m) => missionDone(m.id, view))) return
        set({ claimed: [...g.claimed, chapterId], stats: { ...g.stats, cash: g.stats.cash + ch.reward, xp: g.stats.xp + 100 } })
      },
      answerReply: (correct) => {
        const g = get()
        if (g.replyDay === todayKey()) return
        set({
          replyDay: todayKey(),
          replyWins: g.replyWins + (correct ? 1 : 0),
          stats: correct ? { ...g.stats, reputation: Math.min(5, Math.round((g.stats.reputation + 0.03) * 100) / 100), xp: g.stats.xp + 15 } : g.stats,
        })
      },
      setFastPlay: (v) => set({ fastPlay: v }),
      dismissSeason: () => set({ seasonEnd: undefined }),
      resetGame: () => set(initial()),
    }),
    { name: 'golmok-game-v1', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)
