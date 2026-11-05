import type { BizType, Occurrence, ScheduleEvent } from '@/types'
import { TYPICAL_LULLS } from '@/data/categories'
import { addDays, fromKey, minToTime, timeToMin, weekday } from './date'

export function occursOn(e: ScheduleEvent, key: string): boolean {
  if (key < e.date) return false
  switch (e.repeat) {
    case 'none':
      return e.date === key
    case 'daily':
      return true
    case 'weekly':
      return weekday(e.date) === weekday(key)
    case 'monthly':
      return fromKey(e.date).getDate() === fromKey(key).getDate()
  }
}

export function occurrencesOn(events: ScheduleEvent[], key: string): Occurrence[] {
  return events
    .filter((e) => occursOn(e, key))
    .map((e) => ({ event: e, date: key, done: !!e.doneOn[key] }))
    .sort((a, b) => {
      // 종일(신고·마감 등) → 시간순
      const sa = a.event.start ? timeToMin(a.event.start) : -1
      const sb = b.event.start ? timeToMin(b.event.start) : -1
      return sa - sb
    })
}

/** from 부터 days 일 안의 일정 */
export function occurrencesBetween(events: ScheduleEvent[], from: string, days: number): Occurrence[] {
  const out: Occurrence[] = []
  for (let i = 0; i < days; i++) out.push(...occurrencesOn(events, addDays(from, i)))
  return out
}

export function upcomingDeadlines(events: ScheduleEvent[], from: string, days = 30): Occurrence[] {
  return occurrencesBetween(
    events.filter((e) => e.type === 'deadline'),
    from,
    days,
  ).filter((o) => !o.done)
}

export interface GapSlot {
  start: string
  end: string
  minutes: number
  label: string
}

/**
 * 하루 일정 사이의 빈 시간(틈새)을 찾아 학습 시간을 추천합니다.
 * - 영업시간 안에서, 시간이 정해진 일정 사이의 공백만 계산
 * - 오늘이면 지금 이후만
 * - 시간 정해진 일정이 없으면 업종별 보통의 한산한 시간대를 사용
 */
export function findGapSlots(params: {
  occurrences: Occurrence[]
  openTime: string
  closeTime: string
  bizType: BizType
  isToday: boolean
  nowMinutes: number
  minGap?: number
  limit?: number
}): GapSlot[] {
  const { occurrences, openTime, closeTime, bizType, isToday, nowMinutes, minGap = 20, limit = 3 } = params
  const open = timeToMin(openTime)
  let close = timeToMin(closeTime)
  if (close <= open) close = 24 * 60 - 1 // 자정 넘어 영업
  const floor = isToday ? Math.max(open, Math.ceil(nowMinutes / 5) * 5) : open

  const timed = occurrences
    .filter((o) => o.event.start)
    .map((o) => {
      const s = timeToMin(o.event.start!)
      const e = o.event.end ? timeToMin(o.event.end) : s + 30
      return { s, e: Math.max(e, s + 10), title: o.event.title }
    })
    .sort((a, b) => a.s - b.s)

  const slots: GapSlot[] = []

  if (timed.length === 0) {
    for (const l of TYPICAL_LULLS[bizType]) {
      const s = Math.max(timeToMin(l.start), floor)
      const e = Math.min(timeToMin(l.end), close)
      if (e - s >= minGap) slots.push({ start: minToTime(s), end: minToTime(e), minutes: e - s, label: l.label })
    }
    return slots.slice(0, limit)
  }

  let cursor = open
  let prevTitle: string | null = null
  for (const t of timed) {
    const s = Math.max(cursor, floor)
    const e = Math.min(t.s, close)
    if (e - s >= minGap) {
      slots.push({
        start: minToTime(s),
        end: minToTime(e),
        minutes: e - s,
        label: prevTitle ? `'${prevTitle}' 끝나고` : '오픈 후 첫 틈새',
      })
    }
    if (t.e > cursor) {
      cursor = t.e
      prevTitle = t.title
    }
  }
  const s = Math.max(cursor, floor)
  if (close - s >= minGap) {
    slots.push({
      start: minToTime(s),
      end: minToTime(close),
      minutes: close - s,
      label: prevTitle ? `'${prevTitle}' 끝나고` : '오후 틈새',
    })
  }
  return slots.slice(0, limit)
}
