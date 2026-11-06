import { hash, rng } from '@/lib/rng'
import type { BuildingId } from './map'

export type Path = 'owner' | 'employee'

/** 퀘스트 판정에 쓰는 지금 상태 */
export interface QuestCtx {
  path: Path | null
  shopStarted: boolean
  visited: Record<string, boolean>
  counters: Record<string, number>
  today: Record<string, number>
  jobRank: number
  hasJob: boolean
  roleLessons: number
  cash: number
  bestRank: number
  invested: number
  tier: number
  champion: boolean
  level: number
}

export interface StoryQuest {
  id: string
  title: string
  hint: string
  target: BuildingId | 'farm'
  reward: { cash: number; exp: number }
  done: (c: QuestCtx) => boolean
}

const OWNER_STORY: StoryQuest[] = [
  { id: 'o-setup', title: '내 가게 창업하기', hint: '가게 이름과 업종, 팔 상품·가격·만드는 법을 정해요.', target: 'shop', reward: { cash: 5000, exp: 30 }, done: (c) => c.shopStarted },
  { id: 'o-seed', title: '도매시장에서 씨앗 사기', hint: '배추·고추·벼 씨앗을 사 보세요. 직접 키우면 재료비가 싸져요.', target: 'market', reward: { cash: 3000, exp: 20 }, done: (c) => (c.counters.seedsBought ?? 0) >= 1 },
  { id: 'o-plant', title: '텃밭에 씨앗 심기', hint: '밭이나 논을 눌러 씨앗을 심어요. 벼는 논에서만 자라요.', target: 'farm', reward: { cash: 3000, exp: 20 }, done: (c) => (c.counters.planted ?? 0) >= 1 },
  { id: 'o-harvest', title: '첫 수확하기', hint: '다 자라면 반짝여요. 눌러서 거둬요.', target: 'farm', reward: { cash: 5000, exp: 30 }, done: (c) => (c.counters.harvested ?? 0) >= 1 },
  { id: 'o-craft', title: '공방에서 첫 상품 만들기', hint: '재료가 모자라면 도매시장에서 사 와요.', target: 'workshop', reward: { cash: 8000, exp: 40 }, done: (c) => (c.counters.crafted ?? 0) >= 1 },
  { id: 'o-open', title: '가게에서 첫 영업하기', hint: '만든 상품을 진열하고 가격·홍보를 정해 문을 열어요.', target: 'shop', reward: { cash: 20000, exp: 60 }, done: (c) => (c.counters.shopDays ?? 0) >= 1 },
  { id: 'o-learn', title: '배움터에서 레슨 1개 듣기', hint: '레슨을 들으면 노하우 레벨이 올라 가게가 강해져요.', target: 'academy', reward: { cash: 10000, exp: 50 }, done: (c) => (c.counters.lessons ?? 0) >= 1 },
  { id: 'o-top3', title: '동네 하루 순위 TOP 3', hint: '품절·폐기를 줄이고 홍보를 해 보세요. 랭킹은 게시판에서!', target: 'board', reward: { cash: 50000, exp: 80 }, done: (c) => c.bestRank > 0 && c.bestRank <= 3 },
  { id: 'o-invest', title: '가게에 투자하기', hint: '설비·알바·인테리어·품질 중 하나에 투자해요.', target: 'shop', reward: { cash: 30000, exp: 80 }, done: (c) => c.invested >= 1 },
  { id: 'o-support', title: '창업지원센터에서 지원사업 신청', hint: '서류를 맞게 고르면 지원금을 받아요.', target: 'support', reward: { cash: 20000, exp: 60 }, done: (c) => (c.counters.grants ?? 0) >= 1 },
  { id: 'o-promote', title: '시즌 TOP 3로 다음 리그 진출', hint: '7일 시즌 누적 점수로 겨뤄요.', target: 'board', reward: { cash: 200000, exp: 200 }, done: (c) => c.tier >= 1 },
  { id: 'o-champ', title: '시·도 리그 우승 — 지역 최고 소상공인', hint: '동네 → 구 → 시·도 리그 끝까지!', target: 'board', reward: { cash: 1000000, exp: 500 }, done: (c) => c.champion },
]

const EMPLOYEE_STORY: StoryQuest[] = [
  { id: 'e-join', title: '골목상사에 입사하기', hint: '하고 싶은 직무를 골라 입사해요.', target: 'company', reward: { cash: 5000, exp: 20 }, done: (c) => c.hasJob },
  { id: 'e-work', title: '첫 출근하기', hint: '회사에 가서 오늘 업무 3가지를 해결해요.', target: 'company', reward: { cash: 10000, exp: 40 }, done: (c) => (c.counters.workDays ?? 0) >= 1 },
  { id: 'e-learn', title: '직무 관련 레슨 1개 듣기', hint: '승진하려면 직무 분야 레슨이 필요해요.', target: 'academy', reward: { cash: 10000, exp: 50 }, done: (c) => c.roleLessons >= 1 },
  { id: 'e-side', title: '부업: 작물 키워 시장에 팔기', hint: '텃밭에서 키운 작물을 도매시장에 팔아 봐요.', target: 'farm', reward: { cash: 10000, exp: 40 }, done: (c) => (c.counters.cropsSold ?? 0) >= 1 },
  { id: 'e-r1', title: '사원으로 승진', hint: '실적을 쌓고 레슨을 들으면 인사팀에서 승진 심사를 받아요.', target: 'company', reward: { cash: 30000, exp: 80 }, done: (c) => c.jobRank >= 1 },
  { id: 'e-r3', title: '대리로 승진', hint: '꾸준한 출근과 배움이 승진의 길이에요.', target: 'company', reward: { cash: 100000, exp: 150 }, done: (c) => c.jobRank >= 3 },
  { id: 'e-save', title: '창업 자금 150만 원 모으기', hint: '월급을 모아 내 가게를 준비해요. 지원센터의 정책자금도 알아 두세요.', target: 'support', reward: { cash: 50000, exp: 100 }, done: (c) => c.cash >= 1500000 },
  { id: 'e-startup', title: '퇴사하고 내 가게 창업', hint: '골목상사에서 퇴사하면 창업할 수 있어요.', target: 'company', reward: { cash: 100000, exp: 200 }, done: (c) => c.shopStarted },
]

export function storyFor(path: Path | null, startedFromEmployee: boolean): StoryQuest[] {
  const intro: StoryQuest = {
    id: 'board',
    title: '마을 게시판 살펴보기',
    hint: '광장 옆 게시판에서 오늘의 퀘스트와 동네 랭킹을 볼 수 있어요.',
    target: 'board',
    reward: { cash: 2000, exp: 10 },
    done: (c) => !!c.visited.board,
  }
  if (path === 'employee') return [intro, ...EMPLOYEE_STORY, ...(startedFromEmployee ? OWNER_STORY : [])]
  return [intro, ...OWNER_STORY]
}

export interface DailyQuest {
  id: string
  title: string
  key: string
  need: number
  reward: { cash: number; exp: number }
  for?: Path
}

const DAILY_POOL: DailyQuest[] = [
  { id: 'd-harvest', title: '작물 6개 수확하기', key: 'harvested', need: 6, reward: { cash: 4000, exp: 25 } },
  { id: 'd-plant', title: '씨앗 3번 심기', key: 'planted', need: 3, reward: { cash: 3000, exp: 20 } },
  { id: 'd-craft', title: '공방에서 2번 만들기', key: 'crafted', need: 2, reward: { cash: 5000, exp: 30 }, for: 'owner' },
  { id: 'd-shop', title: '오늘 가게 영업하기', key: 'shopDays', need: 1, reward: { cash: 8000, exp: 40 }, for: 'owner' },
  { id: 'd-work', title: '오늘 출근해서 업무 끝내기', key: 'workDays', need: 1, reward: { cash: 8000, exp: 40 }, for: 'employee' },
  { id: 'd-lesson', title: '배움터 레슨 1개 듣기', key: 'lessons', need: 1, reward: { cash: 6000, exp: 40 } },
  { id: 'd-faq', title: '상담 창구에서 FAQ 2개 읽기', key: 'faq', need: 2, reward: { cash: 3000, exp: 20 } },
  { id: 'd-buy', title: '도매시장에서 재료 사기', key: 'bought', need: 1, reward: { cash: 2000, exp: 15 } },
  { id: 'd-sell', title: '시장에 작물 3개 팔기', key: 'cropsSold', need: 3, reward: { cash: 3000, exp: 20 } },
  { id: 'd-rival', title: '경쟁 가게 2곳 둘러보기', key: 'rivalVisits', need: 2, reward: { cash: 2000, exp: 15 } },
  { id: 'd-water', title: '밭에 물 3번 주기', key: 'watered', need: 3, reward: { cash: 2000, exp: 15 } },
]

/** 날짜마다 3개 (진로에 맞는 것만) */
export function dailyQuests(date: string, path: Path | null): DailyQuest[] {
  const pool = DAILY_POOL.filter((q) => !q.for || q.for === path)
  const r = rng(hash(`daily:${date}:${path}`))
  const sorted = [...pool].sort(() => r() - 0.5)
  // 진로 핵심 퀘스트(영업/출근)는 하나 꼭 넣기
  const coreKey = path === 'owner' ? 'shopDays' : path === 'employee' ? 'workDays' : ''
  const core = sorted.find((q) => q.key === coreKey)
  const rest = sorted.filter((q) => q !== core)
  return (core ? [core, ...rest] : rest).slice(0, 3)
}
