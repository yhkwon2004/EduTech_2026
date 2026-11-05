import type { LearnLog, LessonProgress, Question, ScheduleEvent } from '@/types'
import { COURSES } from '@/data/courses'
import { addDays } from './date'

export function minutesByDate(logs: LearnLog[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const l of logs) map[l.date] = (map[l.date] ?? 0) + l.minutes
  return map
}

/** 오늘(또는 어제)까지 이어진 연속 학습일 */
export function streak(logs: LearnLog[], today: string): number {
  const days = new Set(logs.map((l) => l.date))
  let cursor = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function lastNDays(logs: LearnLog[], today: string, n = 7): { date: string; minutes: number }[] {
  const map = minutesByDate(logs)
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - (n - 1))
    return { date, minutes: map[date] ?? 0 }
  })
}

export function totalMinutes(logs: LearnLog[]): number {
  return logs.reduce((s, l) => s + l.minutes, 0)
}

export interface Badge {
  id: string
  name: string
  desc: string
  icon: string
  earned: boolean
}

export function badges(params: {
  logs: LearnLog[]
  progress: Record<string, LessonProgress>
  questions: Question[]
  events: ScheduleEvent[]
  today: string
}): Badge[] {
  const { logs, progress, questions, events, today } = params
  const doneLessons = Object.values(progress).filter((p) => p.done).length
  const courseDone = COURSES.some((c) => c.lessons.every((l) => progress[l.id]?.done))
  const s = streak(logs, today)
  const days = new Set(logs.map((l) => l.date)).size
  const myQ = questions.filter((q) => q.mine).length
  const myA = questions.reduce((n, q) => n + q.answers.filter((a) => a.role === 'me').length, 0)
  const doneEvents = events.reduce((n, e) => n + Object.values(e.doneOn).filter(Boolean).length, 0)
  const perfect = Object.values(progress).some((p) => p.done && p.score === 100)

  return [
    { id: 'first', name: '첫걸음', desc: '첫 레슨 완료', icon: 'Sprout', earned: doneLessons >= 1 },
    { id: 's3', name: '3일 연속', desc: '3일 연속 학습', icon: 'Flame', earned: s >= 3 },
    { id: 's7', name: '일주일 습관', desc: '7일 연속 학습', icon: 'Crown', earned: s >= 7 },
    { id: 'l10', name: '열 걸음', desc: '레슨 10개 완료', icon: 'Medal', earned: doneLessons >= 10 },
    { id: 'course', name: '코스 수료', desc: '코스 하나 끝까지', icon: 'GraduationCap', earned: courseDone },
    { id: 'perfect', name: '만점', desc: '퀴즈 만점', icon: 'Star', earned: perfect },
    { id: 'ask', name: '질문왕', desc: '첫 질문 올리기', icon: 'MessageCircleQuestionMark', earned: myQ >= 1 },
    { id: 'help', name: '동네 선배', desc: '다른 사장님께 답변', icon: 'HandHeart', earned: myA >= 1 },
    { id: 'plan', name: '일정 달인', desc: '일정 10개 완료', icon: 'CalendarDays', earned: doneEvents >= 10 },
    { id: 'days5', name: '꾸준함', desc: '총 5일 학습', icon: 'Sunrise', earned: days >= 5 },
  ]
}
