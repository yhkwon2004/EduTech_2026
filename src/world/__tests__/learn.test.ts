import { describe, expect, it } from 'vitest'
import { COURSES, LESSON_MAP } from '@/data/courses'
import { COURSE_REWARDS, TOTAL_LESSONS, learnStreak, lockedCosmetics, makeOxQuiz, nextStage, stageQuestions, stageState, starsFor, treeStage } from '@/world/learn'

const done = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { card: 0, done: true }]))

describe('배움 게임', () => {
  it('모든 스테이지는 퀴즈 3문제', () => {
    for (const c of COURSES)
      for (const l of c.lessons) {
        const qs = stageQuestions(l, c.id, 'seed')
        expect(qs).toHaveLength(3)
        expect(qs.filter((q) => !q.bonus).length).toBe(Math.min(3, l.quiz.length))
        for (const q of qs) expect(q.quiz.answer).toBeLessThan(q.quiz.options.length)
      }
  })
  it('별은 정답률로', () => {
    expect(starsFor(3, 3)).toBe(3)
    expect(starsFor(2, 3)).toBe(2)
    expect(starsFor(1, 3)).toBe(1)
  })
  it('코스 안에서는 앞 스테이지를 깨야 다음이 열려요', () => {
    const c = COURSES[0]
    expect(stageState(c.id, 0, {})).toBe('current')
    expect(stageState(c.id, 1, {})).toBe('locked')
    const p = done([c.lessons[0].id])
    expect(stageState(c.id, 0, p)).toBe('done')
    expect(stageState(c.id, 1, p)).toBe('current')
    expect(nextStage(null, p)?.lessonId).toBe(c.lessons[1].id)
  })
  it('배움 나무는 레슨 수만큼 자라요', () => {
    expect(treeStage(0).index).toBe(0)
    expect(treeStage(1).index).toBe(1)
    expect(treeStage(TOTAL_LESSONS).index).toBe(5)
    expect(treeStage(TOTAL_LESSONS).progress).toBe(1)
  })
  it('연속 학습일', () => {
    expect(learnStreak([], '2026-11-07')).toBe(0)
    expect(learnStreak([{ date: '2026-11-07' }, { date: '2026-11-06' }, { date: '2026-11-04' }], '2026-11-07')).toBe(2)
    expect(learnStreak([{ date: '2026-11-06' }, { date: '2026-11-05' }], '2026-11-07')).toBe(2)
  })
  it('코스를 다 끝내면 꾸미기가 열려요', () => {
    expect(Object.keys(COURSE_REWARDS).sort()).toEqual(COURSES.map((c) => c.id).sort())
    expect(lockedCosmetics({}).hats.has(1)).toBe(true)
    const c = COURSES.find((x) => x.id === 'c-place')!
    expect(lockedCosmetics(done(c.lessons.map((l) => l.id))).hats.has(1)).toBe(false)
  })
  it('OX 퀴즈는 보기 하나를 맞다/틀리다로', () => {
    for (let k = 0; k < 30; k++) {
      const q = makeOxQuiz({}, `s${k}`)
      const src = LESSON_MAP[q.lessonId].quiz.find((x) => x.q === q.q)!
      expect(q.truth).toBe(q.claim === src.options[src.answer])
    }
  })
})
