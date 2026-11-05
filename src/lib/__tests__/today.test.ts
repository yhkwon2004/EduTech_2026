import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/types'
import { ROUTINES } from '@/data/routines'
import { CHALLENGES } from '@/data/challenges'
import { LESSON_MAP } from '@/data/courses'
import { occurrencesOn } from '@/lib/schedule'
import { isV1Starter } from '@/store/app'
import {
  buildToday,
  carryOverTodos,
  currentSlot,
  dailyChallenges,
  enabledRoutines,
  rankFor,
  resolveSlot,
  routineOccurs,
  slotRanges,
  totalPoints,
} from '@/lib/today'

const T = (h: number, m = 0) => h * 60 + m

describe('slotRanges', () => {
  it('splits a 10:00–21:00 day into six slots', () => {
    const r = slotRanges('10:00', '21:00')
    expect(r.map((s) => s.id)).toEqual(['open', 'morning', 'lunch', 'break', 'evening', 'close'])
    expect(r[0].start).toBe(T(9))
    expect(r.find((s) => s.id === 'break')!.start).toBe(T(14))
    expect(r.find((s) => s.id === 'close')!.start).toBe(T(20, 30))
  })
  it('hides evening for a cafe closing at 16:00', () => {
    const r = slotRanges('08:00', '16:00')
    expect(r.map((s) => s.id)).toEqual(['open', 'morning', 'lunch', 'break', 'close'])
    expect(r.find((s) => s.id === 'break')!.end).toBe(T(15, 30))
    expect(resolveSlot('evening', r)).toBe('break')
  })
  it('handles an evening-only bar', () => {
    const r = slotRanges('18:00', '02:00')
    expect(r.map((s) => s.id)).toEqual(['open', 'evening', 'close'])
    expect(resolveSlot('break', r)).toBe('evening')
  })
  it('finds the current slot', () => {
    const r = slotRanges('10:00', '21:00')
    expect(currentSlot(r, T(7))).toBe('open')
    expect(currentSlot(r, T(12))).toBe('lunch')
    expect(currentSlot(r, T(15))).toBe('break')
    expect(currentSlot(r, T(23))).toBe('close')
  })
})

describe('routines', () => {
  it('enables biz-specific defaults and respects on/off', () => {
    const base = { templates: ROUTINES, custom: [], weekdayOverride: {} }
    const retail = enabledRoutines({ ...base, biz: 'retail', on: [], off: [] }).map((r) => r.id)
    expect(retail).toContain('r-open-display')
    expect(retail).not.toContain('r-open-prep')
    const tuned = enabledRoutines({ ...base, biz: 'retail', on: ['r-open-prep'], off: ['r-open-display'] }).map((r) => r.id)
    expect(tuned).toContain('r-open-prep')
    expect(tuned).not.toContain('r-open-display')
  })
  it('places weekly/monthly routines on the right day', () => {
    const weekly = ROUTINES.find((r) => r.id === 'w-stock')! // 월요일
    expect(routineOccurs(weekly, '2026-11-09')).toBe(true)
    expect(routineOccurs(weekly, '2026-11-10')).toBe(false)
    const monthly = ROUTINES.find((r) => r.id === 'm-pay')!
    expect(routineOccurs(monthly, '2026-11-25')).toBe(true)
  })
  it('links only to lessons that exist', () => {
    for (const r of ROUTINES) if (r.lessonId) expect(LESSON_MAP[r.lessonId]).toBeDefined()
  })
})

describe('buildToday', () => {
  const ranges = slotRanges('10:00', '21:00')
  const ev: ScheduleEvent = { id: 'e1', title: '거래처 미팅', date: '2026-11-05', start: '15:00', end: '15:30', type: 'order', repeat: 'none', doneOn: {} }
  const deadline: ScheduleEvent = { id: 'd1', title: '부가세', date: '2026-11-05', type: 'deadline', repeat: 'none', doneOn: {} }
  const routines = enabledRoutines({ templates: ROUTINES, custom: [], biz: 'food', on: [], off: [], weekdayOverride: {} })
  const items = buildToday({
    date: '2026-11-05',
    ranges,
    routines,
    todos: [{ id: 't1', title: '간판 전구 교체', slot: 'break', date: '2026-11-05' }],
    occurrences: occurrencesOn([ev, deadline], '2026-11-05'),
    doneKeys: ['r:r-open-cash', 'todo:t1'],
    learnedToday: true,
  })
  it('merges routines, events and todos in slot order', () => {
    const slots = items.map((i) => i.slot)
    const order = ranges.map((r) => r.id)
    expect([...slots].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(slots)
    expect(items.find((i) => i.key === 'ev:e1')!.slot).toBe('break')
    expect(items.some((i) => i.key === 'ev:d1')).toBe(false)
  })
  it('tracks completion incl. auto-learn', () => {
    expect(items.find((i) => i.key === 'r:r-open-cash')!.done).toBe(true)
    expect(items.find((i) => i.key === 'todo:t1')!.done).toBe(true)
    expect(items.find((i) => i.key === 'r:r-brk-learn')!.done).toBe(true)
    expect(items.find((i) => i.key === 'r:r-close-sales')!.done).toBe(false)
  })
  it('carries over unfinished todos from the past week', () => {
    const todos = [
      { id: 'a', title: '어제 못 한 일', slot: 'break' as const, date: '2026-11-04' },
      { id: 'b', title: '어제 한 일', slot: 'break' as const, date: '2026-11-04' },
      { id: 'c', title: '오래된 일', slot: 'break' as const, date: '2026-10-20' },
    ]
    const left = carryOverTodos(todos, { '2026-11-04': ['todo:b'] }, '2026-11-05')
    expect(left.map((t) => t.id)).toEqual(['a'])
  })
})

describe('challenges', () => {
  it('picks 3 distinct challenges, stable per day, different on shuffle', () => {
    const a = dailyChallenges({ date: '2026-11-05', interests: ['marketing'], log: [] })
    const b = dailyChallenges({ date: '2026-11-05', interests: ['marketing'], log: [] })
    const c = dailyChallenges({ date: '2026-11-05', interests: ['marketing'], log: [], shuffle: 1 })
    expect(a).toHaveLength(3)
    expect(new Set(a.map((x) => x.id)).size).toBe(3)
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
    expect(a.map((x) => x.id)).not.toEqual(c.map((x) => x.id))
    expect(a[0].tag).toBe('marketing')
    expect(a[2].minutes <= 2 || a[2].tag === 'care').toBe(true)
  })
  it('skips challenges done in the last week but keeps today’s picks', () => {
    const first = dailyChallenges({ date: '2026-11-05', interests: [], log: [] })[0]
    const later = dailyChallenges({ date: '2026-11-06', interests: [], log: [{ id: first.id, date: '2026-11-05' }] })
    expect(later.map((x) => x.id)).not.toContain(first.id)
    const same = dailyChallenges({ date: '2026-11-05', interests: [], log: [{ id: first.id, date: '2026-11-05' }] })
    expect(same[0].id).toBe(first.id)
  })
  it('has unique ids, steps and valid lessons', () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length)
    for (const c of CHALLENGES) {
      expect(c.steps.length).toBeGreaterThan(0)
      if (c.lessonId) expect(LESSON_MAP[c.lessonId]).toBeDefined()
    }
  })
  it('computes points and rank', () => {
    const pts = totalPoints([{ id: 'ch-photo', date: '2026-11-05' }], { '2026-11-05': ['r:a', 'r:b', 'todo:x'] })
    expect(pts).toBe(12)
    expect(rankFor(0).name).toBe('새싹 사장님')
    expect(rankFor(60).name).toBe('부지런한 사장님')
    expect(rankFor(60).progress).toBeCloseTo(0.1)
    expect(rankFor(5000).next).toBeUndefined()
  })
})

describe('migration', () => {
  it('detects only untouched v1 starter events', () => {
    expect(isV1Starter({ title: '마감 정산', memo: '매출 확인 · 영수증 정리' })).toBe(true)
    expect(isV1Starter({ title: '마감 정산', memo: '내가 바꾼 메모' })).toBe(false)
    expect(isV1Starter({ title: '채소 발주', memo: undefined })).toBe(false)
  })
})
