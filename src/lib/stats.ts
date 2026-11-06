import type { LearnLog } from '@/types'
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
