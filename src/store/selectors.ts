import { useMemo } from 'react'
import type { ScheduleEvent } from '@/types'
import { taxEventsAround } from '@/data/taxCalendar'
import { useApp } from './app'
import { dDayLabel, formatKo, todayKey } from '@/lib/date'
import { occurrencesOn, upcomingDeadlines } from '@/lib/schedule'
import { minutesByDate } from '@/lib/stats'
import { ROUTINES } from '@/data/routines'
import { buildToday, enabledRoutines, slotRanges, type SlotRange, type TodayItem } from '@/lib/today'
import type { RoutineTemplate } from '@/types'

/** 사용자 일정 + (설정 시) 세무 달력 */
export function useAllEvents(): ScheduleEvent[] {
  const events = useApp((s) => s.events)
  const presetDone = useApp((s) => s.presetDone)
  const show = useApp((s) => s.settings.showTaxCalendar)
  return useMemo(() => {
    if (!show) return events
    const year = new Date().getFullYear()
    const presets = taxEventsAround(year).map((e) => (presetDone[e.id] ? { ...e, doneOn: { [e.date]: true } } : e))
    return [...events, ...presets]
  }, [events, presetDone, show])
}

/** 특정 날짜의 '오늘 할 일' (루틴 + 일정 + 직접 추가한 할 일) */
export function useToday(date: string = todayKey()): { ranges: SlotRange[]; items: TodayItem[]; routines: RoutineTemplate[] } {
  const profile = useApp((s) => s.profile)
  const on = useApp((s) => s.routineOn)
  const off = useApp((s) => s.routineOff)
  const weekdayOverride = useApp((s) => s.routineWeekday)
  const custom = useApp((s) => s.customRoutines)
  const taskDone = useApp((s) => s.taskDone)
  const todos = useApp((s) => s.quickTodos)
  const logs = useApp((s) => s.logs)
  const events = useAllEvents()
  return useMemo(() => {
    const ranges = slotRanges(profile.openTime, profile.closeTime)
    const routines = enabledRoutines({ templates: ROUTINES, custom, biz: profile.bizType, on, off, weekdayOverride })
    const items = buildToday({
      date,
      ranges,
      routines,
      todos,
      occurrences: occurrencesOn(events, date),
      doneKeys: taskDone[date] ?? [],
      learnedToday: logs.some((l) => l.date === date),
    })
    return { ranges, items, routines }
  }, [date, profile, on, off, weekdayOverride, custom, taskDone, todos, logs, events])
}

export interface Notice {
  id: string
  kind: 'deadline' | 'today' | 'learn' | 'answer' | 'review'
  title: string
  body: string
  to: string
}

/** 알림 목록 — 일정·학습·답변 상태에서 만들어집니다 */
export function useNotices(): Notice[] {
  const all = useAllEvents()
  const { items: todayItems } = useToday()
  const logs = useApp((s) => s.logs)
  const goal = useApp((s) => s.profile.dailyGoal)
  const questions = useApp((s) => s.questions)
  const review = useApp((s) => s.review)
  return useMemo(() => {
    const today = todayKey()
    const out: Notice[] = []
    for (const o of upcomingDeadlines(all, today, 8)) {
      out.push({
        id: `dl-${o.event.id}-${today}`,
        kind: 'deadline',
        title: `${dDayLabel(today, o.date)} ${o.event.title}`,
        body: `${formatKo(o.date)} 마감이에요. 미리 준비해 두세요.`,
        to: `/schedule?date=${o.date}`,
      })
    }
    const left = todayItems.filter((i) => !i.done)
    if (left.length) {
      out.push({
        id: `today-${today}`,
        kind: 'today',
        title: `오늘 남은 할 일 ${left.length}개`,
        body: left
          .slice(0, 3)
          .map((i) => i.title)
          .join(' · '),
        to: '/',
      })
    }
    const mins = minutesByDate(logs)[today] ?? 0
    if (mins < goal) {
      out.push({
        id: `learn-${today}`,
        kind: 'learn',
        title: mins === 0 ? '오늘 3분, 아직이에요' : `오늘 목표까지 ${goal - mins}분 남았어요`,
        body: '손님 없는 틈에 짧은 레슨 하나 어떠세요?',
        to: '/',
      })
    }
    if (review.length) {
      out.push({
        id: `review-${today}-${review.length}`,
        kind: 'review',
        title: `복습할 문제 ${review.length}개`,
        body: '틀렸던 문제를 1분 만에 다시 풀어 보세요.',
        to: '/review',
      })
    }
    for (const q of questions.filter((q) => q.mine)) {
      for (const a of q.answers.filter((a) => a.role !== 'me')) {
        out.push({
          id: `ans-${a.id}`,
          kind: 'answer',
          title: `'${q.title}'에 답변이 달렸어요`,
          body: `${a.author}: ${a.body.slice(0, 40)}${a.body.length > 40 ? '…' : ''}`,
          to: `/ask/${q.id}`,
        })
      }
    }
    return out
  }, [all, todayItems, logs, goal, questions, review])
}

export function useUnreadCount(): number {
  const notices = useNotices()
  const read = useApp((s) => s.readNotifs)
  return notices.filter((n) => !read.includes(n.id)).length
}
