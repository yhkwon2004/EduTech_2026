import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Answer, CategoryId, LearnLog, LessonProgress, Question, ReviewItem, Settings } from '@/types'
import { seedQuestions } from '@/data/community'
import { todayKey } from '@/lib/date'
import { searchAll } from '@/lib/match'
import { LESSON_MAP } from '@/data/courses'

export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** 배움 기록 저장소 — 레슨 진도·메모·오답·상담(질문) */
interface AppState {
  settings: Settings
  progress: Record<string, LessonProgress>
  logs: LearnLog[]
  bookmarks: string[]
  notes: Record<string, string>
  review: ReviewItem[]
  questions: Question[]
  faqRead: string[]
  /** 스테이지 별 (최고 기록) */
  stars: Record<string, number>
  /** 열어 본 챕터 보물상자 */
  chests: string[]
  /** 동네 사람 퀴즈 (날짜별 맞힌 수) */
  npcQuiz: { date: string; count: number }
  /** 배움 나무에 물 준 날 */
  treeWater: string
  /** 오늘 처음 물 주면 true */
  waterTree: () => boolean
  setStars: (lessonId: string, n: number) => void
  openChest: (courseId: string) => void
  npcQuizSolved: () => number

  updateSettings: (s: Partial<Settings>) => void
  setCard: (lessonId: string, card: number) => void
  /** 처음 끝낸 레슨이면 true */
  completeLesson: (lessonId: string, correct: boolean[]) => boolean
  toggleBookmark: (id: string) => void
  setNote: (lessonId: string, text: string) => void
  resolveReview: (lessonId: string, quizIndex: number) => void
  readFaq: (id: string) => void

  addQuestion: (q: { category: CategoryId; title: string; body: string; author: string }) => string
  toggleLike: (questionId: string) => void
  addAnswer: (questionId: string, body: string, author: string) => void
  toggleHelpful: (questionId: string, answerId: string) => void
  deleteQuestion: (questionId: string) => void
  resetAll: () => void
}

const initial = () => ({
  settings: { speechRate: 1 },
  progress: {},
  logs: [] as LearnLog[],
  bookmarks: [] as string[],
  notes: {},
  review: [] as ReviewItem[],
  questions: seedQuestions(),
  faqRead: [] as string[],
  stars: {} as Record<string, number>,
  chests: [] as string[],
  npcQuiz: { date: '', count: 0 },
  treeWater: '',
})

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),

      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      waterTree: () => {
        if (get().treeWater === todayKey()) return false
        set({ treeWater: todayKey() })
        return true
      },
      setStars: (lessonId, n) => set({ stars: { ...get().stars, [lessonId]: Math.max(n, get().stars[lessonId] ?? 0) } }),
      openChest: (courseId) => !get().chests.includes(courseId) && set({ chests: [...get().chests, courseId] }),
      npcQuizSolved: () => {
        const today = todayKey()
        const cur = get().npcQuiz.date === today ? get().npcQuiz.count : 0
        set({ npcQuiz: { date: today, count: cur + 1 } })
        return cur + 1
      },

      setCard: (lessonId, card) =>
        set({ progress: { ...get().progress, [lessonId]: { ...(get().progress[lessonId] ?? { done: false, card: 0 }), card } } }),

      completeLesson: (lessonId, correct) => {
        const lesson = LESSON_MAP[lessonId]
        if (!lesson) return false
        const prev = get().progress[lessonId]
        const first = !prev?.done
        const score = correct.length ? Math.round((correct.filter(Boolean).length / correct.length) * 100) : 100
        const wrong = correct.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
        const review = get().review.filter((r) => r.lessonId !== lessonId || wrong.includes(r.quizIndex))
        for (const i of wrong)
          if (!review.some((r) => r.lessonId === lessonId && r.quizIndex === i)) review.push({ lessonId, quizIndex: i, addedAt: new Date().toISOString() })
        set({
          progress: {
            ...get().progress,
            [lessonId]: { card: 0, done: true, completedAt: prev?.completedAt ?? new Date().toISOString(), score: Math.max(score, prev?.score ?? 0) },
          },
          logs: [...get().logs, { date: todayKey(), minutes: lesson.minutes, lessonId }].slice(-500),
          review,
        })
        return first
      },
      toggleBookmark: (id) => {
        const b = get().bookmarks
        set({ bookmarks: b.includes(id) ? b.filter((x) => x !== id) : [id, ...b] })
      },
      setNote: (lessonId, text) => {
        const notes = { ...get().notes }
        if (text.trim()) notes[lessonId] = text
        else delete notes[lessonId]
        set({ notes })
      },
      resolveReview: (lessonId, quizIndex) =>
        set({ review: get().review.filter((r) => !(r.lessonId === lessonId && r.quizIndex === quizIndex)) }),
      readFaq: (id) => !get().faqRead.includes(id) && set({ faqRead: [...get().faqRead, id] }),

      addQuestion: ({ category, title, body, author }) => {
        const id = uid('q')
        const now = new Date().toISOString()
        const found = searchAll(`${title} ${body}`, [], 3)
        const links: Answer['links'] = [
          ...found.faqs.slice(0, 2).map((f) => ({ kind: 'faq' as const, id: f.id })),
          ...found.lessons.slice(0, 2).map((l) => ({ kind: 'lesson' as const, id: l.id })),
        ]
        const helper: Answer = {
          id: uid('a'),
          author: '골목 도우미',
          role: 'helper',
          body: links.length ? '질문과 관련된 자료를 찾았어요. 아래 내용을 먼저 확인해 보세요.' : '바로 연결할 자료를 찾지 못했어요. 급하다면 상담 창구(1357 · 126 · 1350)를 이용해 보세요.',
          createdAt: now,
          helpful: 0,
          links,
        }
        set({ questions: [{ id, category, title, body, author, bizLabel: '', createdAt: now, likes: 0, mine: true, answers: [helper] }, ...get().questions] })
        return id
      },
      toggleLike: (questionId) =>
        set({ questions: get().questions.map((q) => (q.id === questionId ? { ...q, liked: !q.liked, likes: q.likes + (q.liked ? -1 : 1) } : q)) }),
      addAnswer: (questionId, body, author) => {
        const a: Answer = { id: uid('a'), author, role: 'me', body, createdAt: new Date().toISOString(), helpful: 0 }
        set({ questions: get().questions.map((q) => (q.id === questionId ? { ...q, answers: [...q.answers, a] } : q)) })
      },
      toggleHelpful: (questionId, answerId) =>
        set({
          questions: get().questions.map((q) =>
            q.id === questionId
              ? { ...q, answers: q.answers.map((a) => (a.id === answerId ? { ...a, markedHelpful: !a.markedHelpful, helpful: a.helpful + (a.markedHelpful ? -1 : 1) } : a)) }
              : q,
          ),
        }),
      deleteQuestion: (questionId) => set({ questions: get().questions.filter((q) => q.id !== questionId) }),
      resetAll: () => set(initial()),
    }),
    {
      name: 'golmok-app-v2',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // v3: 오늘 할 일·루틴·도전·일정 기록은 더 이상 쓰지 않아요
      migrate: (persisted) => {
        const p = { ...((persisted ?? {}) as Record<string, unknown>) }
        for (const k of ['onboarded', 'profile', 'events', 'presetDone', 'readNotifs', 'lastLessonId', 'routineOn', 'routineOff', 'routineWeekday', 'customRoutines', 'taskDone', 'quickTodos', 'challengeLog', 'challengeShuffle'])
          delete p[k]
        p.settings = { speechRate: ((p.settings as Settings | undefined)?.speechRate as number) ?? 1 }
        return p as unknown as AppState
      },
    },
  ),
)
