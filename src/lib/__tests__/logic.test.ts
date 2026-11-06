import { describe, expect, it } from 'vitest'
import { addDays, diffDays, monthMatrix, nextBusinessDay, weekOf } from '@/lib/date'
import { recommendLessons, nextLessonOf } from '@/lib/recommend'
import { streak, lastNDays } from '@/lib/stats'
import { searchAll, scoreText } from '@/lib/match'
import { josa } from '@/lib/josa'
import { COURSES, ALL_LESSONS, LESSON_MAP } from '@/data/courses'
import { FAQS } from '@/data/faq'

describe('date', () => {
  it('adds days across month boundary', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(diffDays('2026-11-04', '2026-11-30')).toBe(26)
  })
  it('moves weekend dates to Monday', () => {
    expect(nextBusinessDay('2026-01-25')).toBe('2026-01-26')
    expect(nextBusinessDay('2026-07-25')).toBe('2026-07-27')
  })
  it('builds weeks and months', () => {
    expect(weekOf('2026-11-04')[0]).toBe('2026-11-01')
    expect(monthMatrix(2026, 10)).toHaveLength(42)
  })
})

describe('recommend', () => {
  it('only suggests lessons that fit the available minutes', () => {
    const r = recommendLessons({ minutes: 2, interests: [], progress: {}, limit: 10 })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((l) => l.minutes <= 2)).toBe(true)
  })
  it('prefers the next lesson of a course already started', () => {
    const r = recommendLessons({ minutes: 5, interests: ['hygiene'], progress: { 'l-tax-1': { done: true, card: 0 } }, limit: 1 })
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
})

describe('match', () => {
  it('finds FAQ even with particles attached', () => {
    expect(searchAll('부가세는 언제 신고해야 하나요', []).faqs[0].id).toBe('f-vat-when')
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
      for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length)
    }
  })
  it('links FAQs to existing lessons', () => {
    for (const f of FAQS) if (f.lessonId) expect(LESSON_MAP[f.lessonId]).toBeDefined()
  })
})

describe('josa', () => {
  it('picks particles by final consonant', () => {
    expect(josa('지도 앱 광고', '을/를')).toBe('지도 앱 광고를')
    expect(josa('SNS 게시물', '을/를')).toBe('SNS 게시물을')
    expect(josa('망원 국밥', '이/가')).toBe('망원 국밥이')
    expect(josa('달빛 카페', '이/가')).toBe('달빛 카페가')
    expect(josa('서울', '으로/로')).toBe('서울로')
  })
})
