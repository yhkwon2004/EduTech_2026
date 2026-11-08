export type CategoryId =
  | 'marketing'
  | 'digital'
  | 'tax'
  | 'service'
  | 'ops'
  | 'support'
  | 'labor'
  | 'hygiene'

export type BizType = 'food' | 'cafe' | 'retail' | 'beauty' | 'service' | 'etc'

export interface LessonCard {
  /** 카드 성격: 개념 / 실전 팁 / 예시 / 체크리스트 */
  kind: 'concept' | 'tip' | 'example' | 'check'
  title: string
  body: string
  /** 체크리스트 카드일 때 항목 */
  items?: string[]
}

export interface Quiz {
  q: string
  options: string[]
  answer: number
  explain: string
}

export interface Lesson {
  id: string
  title: string
  minutes: number
  cards: LessonCard[]
  quiz: Quiz[]
  takeaway: string
}

export interface Course {
  id: string
  title: string
  subtitle: string
  category: CategoryId
  level: '입문' | '기초' | '실전'
  description: string
  outcomes: string[]
  tags: string[]
  lessons: Lesson[]
}

export interface Faq {
  id: string
  category: CategoryId
  q: string
  a: string
  tags: string[]
  /** 더 배울 수 있는 레슨 */
  lessonId?: string
}

export interface Answer {
  id: string
  author: string
  role: 'owner' | 'mentor' | 'me' | 'helper'
  body: string
  createdAt: string
  helpful: number
  markedHelpful?: boolean
  /** 자동 도우미가 연결한 참고 자료 */
  links?: { kind: 'faq' | 'lesson'; id: string }[]
}

export interface Question {
  id: string
  category: CategoryId
  title: string
  body: string
  author: string
  bizLabel: string
  createdAt: string
  likes: number
  liked?: boolean
  mine?: boolean
  answers: Answer[]
}

export interface Settings {
  speechRate: number
  /** 배경음악 */
  bgm?: boolean
  /** 효과음 */
  sfx?: boolean
  /** AI 경영진 — 내 Anthropic API 키 (이 기기에만 저장) */
  aiKey?: string
  aiModel?: string
  /** 가벼운 효과 (저사양 기기) */
  lowFx?: boolean
  /** 도움말을 본 적 있나 */
  helpSeen?: boolean
}

export interface LessonProgress {
  card: number
  done: boolean
  completedAt?: string
  score?: number
}

export interface LearnLog {
  date: string
  minutes: number
  lessonId: string
}

export interface ReviewItem {
  lessonId: string
  quizIndex: number
  addedAt: string
}
