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

export type EventType = 'store' | 'learn' | 'deadline' | 'order' | 'personal'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'

export interface ScheduleEvent {
  id: string
  title: string
  /** 시작 날짜 YYYY-MM-DD (반복 일정이면 반복 시작일) */
  date: string
  /** HH:mm, 비어 있으면 종일 */
  start?: string
  end?: string
  type: EventType
  repeat: Repeat
  memo?: string
  lessonId?: string
  /** 반복 일정의 날짜별 완료 여부 */
  doneOn: Record<string, boolean>
  /** 기본 제공(세무 달력 등) 일정 여부 */
  preset?: boolean
}

/** 특정 날짜에 펼쳐진 일정 */
export interface Occurrence {
  event: ScheduleEvent
  date: string
  done: boolean
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

export interface Profile {
  name: string
  shopName: string
  bizType: BizType
  interests: CategoryId[]
  dailyGoal: number
  openTime: string
  closeTime: string
}

export interface Settings {
  largeText: boolean
  showTaxCalendar: boolean
  notify: boolean
  speechRate: number
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
