import type { BizType, CategoryId } from '@/types'

/** 판매 항목 — 사장님이 자유롭게 정함 */
export interface Product {
  id: string
  name: string
  emoji: string
  /** 1개(1회) 만드는 데 드는 원가 */
  cost: number
  /** 판매가 */
  price: number
  /** 동네 평균 가격 (손님이 비교하는 기준) */
  ref: number
  /** 품질 1~5 (교육·투자로 올림) */
  quality: number
  /** goods: 미리 만들어 두는 상품 · service: 예약/시술처럼 받을 때 원가가 드는 서비스 */
  kind: 'goods' | 'service'
  /** goods일 때: 그날 못 팔면 폐기(true) / 다음 날로 남음(false) */
  perishable: boolean
  /** 남아 있는 재고 (perishable=false 상품) */
  stock: number
}

export type Personality = 'price' | 'quality' | 'marketing' | 'steady' | 'trendy'

export interface Rival {
  id: string
  name: string
  emoji: string
  type: string
  personality: Personality
  awareness: number
  reputation: number
  /** 가격 수준: 1 = 동네 평균, 0.8 = 20% 저렴 */
  priceLevel: number
  quality: number
  capacity: number
  /** 이번 시즌 누적 점수 */
  seasonScore: number
  lastScore: number
  lastRank: number
  /** 오늘 한 일 (뉴스) */
  news?: string
}

export interface ShopStats {
  cash: number
  awareness: number
  reputation: number
  equipment: number
  staff: number
  interior: number
  totalProfit: number
  xp: number
}

export interface Region {
  sido: string
  gu: string
  dong: string
}

export type MarketingId = 'flyer' | 'sns' | 'map' | 'sale' | 'tasting' | 'delivery'

export interface DayDecision {
  /** 상품별 오늘 만들 수량 (goods) */
  plan: Record<string, number>
  /** 상품별 오늘 가격 */
  prices: Record<string, number>
  marketing: MarketingId[]
  /** 오늘의 상황 카드 선택 */
  eventChoice?: number
}

export interface ProductResult {
  id: string
  name: string
  emoji: string
  demand: number
  sold: number
  made: number
  wasted: number
  revenue: number
}

export interface ShopDayLine {
  id: string
  name: string
  emoji: string
  customers: number
  revenue: number
  profit: number
  reputation: number
  awareness: number
  score: number
  rank: number
  isPlayer: boolean
}

export interface Review {
  stars: number
  text: string
  tone: 'good' | 'bad' | 'neutral'
}

export interface DayResult {
  day: number
  date: string
  weather: Weather
  weekday: number
  marketSize: number
  capacity: number
  customers: number
  lostCustomers: number
  products: ProductResult[]
  revenue: number
  costs: { ingredients: number; marketing: number; wages: number; rent: number; delivery: number }
  wasteValue: number
  profit: number
  reputationBefore: number
  reputation: number
  awarenessBefore: number
  awareness: number
  share: number
  score: number
  scoreParts: { profit: number; reputation: number; share: number; growth: number }
  rank: number
  prevRank: number
  table: ShopDayLine[]
  reviews: Review[]
  tips: { text: string; lessonId?: string }[]
  eventNote?: string
  buff: number
  xpGained: number
}

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'cold' | 'hot'

export interface GameEventChoice {
  label: string
  effect: {
    cash?: number
    awareness?: number
    reputation?: number
    demand?: number
    cost?: number
    capacity?: number
  }
  result: string
  best?: boolean
}

export interface GameEvent {
  id: string
  title: string
  body: string
  category: CategoryId
  choices: GameEventChoice[]
  lessonId?: string
}

export interface HallEntry {
  season: number
  tier: number
  league: string
  rank: number
  title?: string
  score: number
}

export interface ChapterMission {
  id: string
  label: string
}

export interface Chapter {
  id: string
  title: string
  story: string
  missions: ChapterMission[]
  reward: number
}

export type { BizType }
