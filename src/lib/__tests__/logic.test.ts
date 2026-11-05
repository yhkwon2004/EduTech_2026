import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/types'
import { addDays, diffDays, fromKey, monthMatrix, nextBusinessDay, weekOf } from '@/lib/date'
import { findGapSlots, occurrencesOn, occursOn, upcomingDeadlines } from '@/lib/schedule'
import { recommendLessons, nextLessonOf } from '@/lib/recommend'
import { streak, lastNDays, badges } from '@/lib/stats'
import { searchAll, scoreText } from '@/lib/match'
import { taxEventsForYear } from '@/data/taxCalendar'
import { COURSES, ALL_LESSONS, LESSON_MAP } from '@/data/courses'
import { FAQS } from '@/data/faq'

const ev = (p: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: p.id ?? Math.random().toString(36),
  title: p.title ?? '일정',
  date: p.date ?? '2026-11-04',
  type: p.type ?? 'store',
  repeat: p.repeat ?? 'none',
  doneOn: p.doneOn ?? {},
  ...p,
})

describe('date', () => {
  it('adds days across month boundary', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(diffDays('2026-11-04', '2026-11-30')).toBe(26)
  })
  it('moves weekend deadlines to Monday', () => {
    expect(nextBusinessDay('2026-01-25')).toBe('2026-01-26') // 일요일
    expect(nextBusinessDay('2026-07-25')).toBe('2026-07-27') // 토요일
    expect(nextBusinessDay('2026-11-04')).toBe('2026-11-04')
  })
  it('builds a Sunday-first week and 6-week month', () => {
    const w = weekOf('2026-11-04')
    expect(w[0]).toBe('2026-11-01')
    expect(w).toHaveLength(7)
    expect(monthMatrix(2026, 10)).toHaveLength(42)
  })
})

describe('schedule', () => {
  it('expands repeats', () => {
    const weekly = ev({ date: '2026-11-04', repeat: 'weekly' })
    expect(occursOn(weekly, '2026-11-11')).toBe(true)
    expect(occursOn(weekly, '2026-11-12')).toBe(false)
    expect(occursOn(weekly, '2026-10-28')).toBe(false) // 시작 전
    const monthly = ev({ date: '2026-11-15', repeat: 'monthly' })
    expect(occursOn(monthly, '2026-12-15')).toBe(true)
    expect(occursOn(ev({ repeat: 'daily' }), '2027-03-01')).toBe(true)
  })
  it('sorts all-day first then by time and tracks per-day completion', () => {
    const occ = occurrencesOn(
      [
        ev({ id: 'b', start: '15:00', repeat: 'daily', doneOn: { '2026-11-05': true } }),
        ev({ id: 'a', start: '09:00', repeat: 'daily' }),
        ev({ id: 'dl', type: 'deadline' }),
      ],
      '2026-11-04',
    )
    expect(occ.map((o) => o.event.id)).toEqual(['dl', 'a', 'b'])
    expect(occ.find((o) => o.event.id === 'b')!.done).toBe(false)
  })
  it('finds gaps between timed events inside business hours', () => {
    const occ = occurrencesOn(
      [
        ev({ title: '오픈 준비', start: '09:30', end: '10:00' }),
        ev({ title: '발주', start: '10:30', end: '10:50' }),
        ev({ title: '점심 피크', start: '11:30', end: '14:00' }),
      ],
      '2026-11-04',
    )
    const slots = findGapSlots({
      occurrences: occ,
      openTime: '10:00',
      closeTime: '16:00',
      bizType: 'food',
      isToday: false,
      nowMinutes: 0,
      limit: 5,
    })
    expect(slots.map((s) => [s.start, s.end])).toEqual([
      ['10:00', '10:30'],
      ['10:50', '11:30'],
      ['14:00', '16:00'],
    ])
    expect(slots[1].label).toContain('발주')
  })
  it('skips past gaps for today and falls back to typical lulls', () => {
    const slots = findGapSlots({
      occurrences: [],
      openTime: '10:00',
      closeTime: '21:00',
      bizType: 'food',
      isToday: true,
      nowMinutes: 15 * 60,
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].start).toBe('15:00')
    expect(slots[0].end).toBe('16:30')
  })
  it('lists upcoming undone deadlines', () => {
    const list = upcomingDeadlines(taxEventsForYear(2026), '2026-11-04', 30)
    expect(list.map((o) => o.event.title)).toEqual(['원천세·4대보험료 납부', '종합소득세 중간예납 납부'])
  })
})

describe('tax calendar', () => {
  it('has 8 annual + 12 monthly items with weekday dates', () => {
    const t = taxEventsForYear(2027)
    expect(t).toHaveLength(20)
    for (const e of t) {
      const d = fromKey(e.date).getDay()
      expect(d === 0 || d === 6).toBe(false)
    }
  })
})

describe('recommend', () => {
  it('only suggests lessons that fit the available minutes', () => {
    const r = recommendLessons({ minutes: 2, interests: [], progress: {}, limit: 10 })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((l) => l.minutes <= 2)).toBe(true)
  })
  it('prefers the next lesson of a course already started', () => {
    const r = recommendLessons({
      minutes: 5,
      interests: ['hygiene'],
      progress: { 'l-tax-1': { done: true, card: 0 } },
      limit: 1,
    })
    expect(r[0].id).toBe('l-tax-2')
  })
  it('follows course order', () => {
    const c = COURSES[0]
    expect(nextLessonOf(c, { [c.lessons[0].id]: { done: true, card: 0 } })?.id).toBe(c.lessons[1].id)
  })
})

describe('stats', () => {
  it('counts a streak ending today or yesterday', () => {
    const logs = ['2026-11-02', '2026-11-03'].map((date) => ({ date, minutes: 3, lessonId: 'x' }))
    expect(streak(logs, '2026-11-04')).toBe(2)
    expect(streak(logs, '2026-11-05')).toBe(0)
    expect(lastNDays(logs, '2026-11-04', 7).at(-2)!.minutes).toBe(3)
  })
  it('awards first-lesson badge', () => {
    const b = badges({ logs: [], progress: { 'l-tax-1': { done: true, card: 0, score: 100 } }, questions: [], events: [], today: '2026-11-04' })
    expect(b.find((x) => x.id === 'first')!.earned).toBe(true)
    expect(b.find((x) => x.id === 'perfect')!.earned).toBe(true)
    expect(b.find((x) => x.id === 's7')!.earned).toBe(false)
  })
})

describe('match', () => {
  it('finds FAQ even with particles attached', () => {
    const r = searchAll('부가세는 언제 신고해야 하나요', [])
    expect(r.faqs[0].id).toBe('f-vat-when')
  })
  it('finds labor answers for colloquial questions', () => {
    expect(searchAll('알바 주휴수당 줘야돼요?', []).faqs[0].id).toBe('f-weekly-pay')
    expect(searchAll('리뷰 테러 당했어요', []).faqs.map((f) => f.id)).toContain('f-bad-review')
  })
  it('returns nothing for empty or 1-char queries', () => {
    expect(searchAll('ㅁ', []).faqs).toHaveLength(0)
    expect(scoreText('', 'abc')).toBe(0)
  })
})

describe('content integrity', () => {
  it('has unique lesson ids and valid quiz answers', () => {
    const ids = ALL_LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of ALL_LESSONS) {
      expect(l.cards.length).toBeGreaterThanOrEqual(3)
      expect(l.minutes).toBeLessThanOrEqual(5)
      for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length)
    }
  })
  it('links FAQs to existing lessons', () => {
    for (const f of FAQS) if (f.lessonId) expect(LESSON_MAP[f.lessonId]).toBeDefined()
  })
})

import { josa } from '@/lib/josa'
describe('josa', () => {
  it('picks particles by final consonant', () => {
    expect(josa('지도 앱 광고', '을/를')).toBe('지도 앱 광고를')
    expect(josa('SNS 게시물', '을/를')).toBe('SNS 게시물을')
    expect(josa('망원 국밥', '이/가')).toBe('망원 국밥이')
    expect(josa('달빛 카페', '이/가')).toBe('달빛 카페가')
    expect(josa('서울', '으로/로')).toBe('서울로')
  })
})
