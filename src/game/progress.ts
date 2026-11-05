import { CHAPTERS, CHAMPION_TITLE, LEAGUE_NAME, SEASON_DAYS } from './data'
import { costRate, generateRivals } from './sim'
import type { BizType } from '@/types'
import type { DayResult, HallEntry, MarketingId, Product, Region, Rival, ShopStats } from './types'

export interface ProgressView {
  products: Product[]
  stats: ShopStats
  day: number
  tier: number
  hall: HallEntry[]
  usedMarketing: MarketingId[]
  replyWins: number
  flags: Record<string, boolean>
}

export function missionDone(id: string, g: ProgressView): boolean {
  switch (id) {
    case 'products2':
      return g.products.length >= 2
    case 'margin':
      return g.products.length > 0 && g.products.every((p) => costRate(p) <= 0.5)
    case 'firstDay':
      return g.day >= 1
    case 'busy60':
    case 'profit1':
    case 'waste10':
    case 'top3':
      return !!g.flags[id]
    case 'reply1':
      return g.replyWins >= 1
    case 'rep38':
      return g.stats.reputation >= 3.8
    case 'days3':
      return g.day >= 3
    case 'aw50':
      return g.stats.awareness >= 50
    case 'mk3':
      return new Set(g.usedMarketing).size >= 3
    case 'equip1':
      return g.stats.equipment >= 1
    case 'staff1':
      return g.stats.staff >= 1
    case 'profit1m':
      return g.stats.totalProfit >= 1000000
    case 'promote':
      return g.tier >= 1
    case 'champion':
      return g.hall.some((h) => h.tier === 2 && h.rank === 1)
    default:
      return false
  }
}

/** 아직 보상을 받지 않은 첫 장 */
export function currentChapter(claimed: string[]) {
  return CHAPTERS.find((c) => !claimed.includes(c.id)) ?? null
}

/** 하루 결과로 미션 플래그 갱신 */
export function flagsFromDay(flags: Record<string, boolean>, r: DayResult): Record<string, boolean> {
  const made = r.products.reduce((s, p) => s + p.made, 0)
  const wasted = r.products.reduce((s, p) => s + p.wasted, 0)
  return {
    ...flags,
    busy60: flags.busy60 || r.customers >= r.capacity * 0.6,
    profit1: flags.profit1 || r.profit > 0,
    waste10: flags.waste10 || (made > 0 && wasted / made <= 0.1),
    top3: flags.top3 || r.rank <= 3,
  }
}

export interface SeasonEnd {
  season: number
  tier: number
  league: string
  rank: number
  score: number
  promoted: boolean
  title?: string
  champion: boolean
}

/** 시즌 마지막 날 — 순위 확정, 우승 칭호, TOP 3 승급 */
export function closeSeason(params: {
  season: number
  tier: number
  region: Region
  biz: BizType
  seed: number
  playerScore: number
  rivals: Rival[]
}): { end: SeasonEnd; nextTier: number; nextRivals: Rival[] } {
  const { season, tier, region, biz, seed, playerScore, rivals } = params
  const rank = 1 + rivals.filter((r) => r.seasonScore > playerScore).length
  const promoted = rank <= 3 && tier < 2
  const champion = rank === 1 && tier === 2
  const end: SeasonEnd = {
    season,
    tier,
    league: LEAGUE_NAME(tier, region),
    rank,
    score: playerScore,
    promoted,
    title: rank === 1 ? CHAMPION_TITLE(tier, region) : undefined,
    champion,
  }
  const nextTier = promoted ? tier + 1 : tier
  const nextRivals = promoted
    ? generateRivals({ seed: seed + season * 101, tier: nextTier, region, biz })
    : rivals.map((r) => ({ ...r, seasonScore: 0 }))
  return { end, nextTier, nextRivals }
}

export function seasonDaysLeft(dayInSeason: number): number {
  return SEASON_DAYS - dayInSeason
}

export function shopLevel(xp: number): { level: number; progress: number; next: number } {
  // 레벨 n에 필요한 누적 XP = 60·n·(n-1)
  let level = 1
  while (60 * (level + 1) * level <= xp) level++
  const cur = 60 * level * (level - 1)
  const next = 60 * (level + 1) * level
  return { level, progress: (xp - cur) / (next - cur), next }
}
