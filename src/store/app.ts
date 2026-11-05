import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Answer,
  CategoryId,
  LearnLog,
  LessonProgress,
  Profile,
  Question,
  ReviewItem,
  ScheduleEvent,
  Settings,
} from '@/types'
import { seedQuestions } from '@/data/community'
import { addDays, minToTime, timeToMin, todayKey } from '@/lib/date'
import { searchAll } from '@/lib/match'
import { LESSON_MAP } from '@/data/courses'

export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const DEFAULT_PROFILE: Profile = {
  name: '',
  shopName: '',
  bizType: 'food',
  interests: [],
  dailyGoal: 5,
  openTime: '10:00',
  closeTime: '21:00',
}

const DEFAULT_SETTINGS: Settings = {
  largeText: false,
  showTaxCalendar: true,
  notify: true,
  speechRate: 1,
}

/** 영업시간에 맞춘 기본 루틴 일정 */
export function starterEvents(profile: Profile, today: string): ScheduleEvent[] {
  const open = timeToMin(profile.openTime)
  let close = timeToMin(profile.closeTime)
  if (close <= open) close = 24 * 60 - 1
  return [
    {
      id: uid('ev'),
      title: '오픈 준비',
      date: today,
      start: minToTime(Math.max(0, open - 30)),
      end: minToTime(open),
      type: 'store',
      repeat: 'daily',
      memo: '청소 · 재료 손질 · 냉장고 온도 기록',
      doneOn: {},
    },
    {
      id: uid('ev'),
      title: '식자재 발주 확인',
      date: today,
      start: minToTime(open + 30),
      end: minToTime(open + 50),
      type: 'order',
      repeat: 'weekly',
      memo: '재고 확인 후 부족한 것만 주문',
      doneOn: {},
    },
    {
      id: uid('ev'),
      title: '주간 재고 점검',
      date: addDays(today, 2),
      start: minToTime(Math.min(close - 120, open + 300)),
      end: minToTime(Math.min(close - 90, open + 330)),
      type: 'store',
      repeat: 'weekly',
      memo: '선입선출 정리 · 개봉일 라벨 확인',
      doneOn: {},
    },
    {
      id: uid('ev'),
      title: '마감 정산',
      date: today,
      start: minToTime(close - 30),
      end: minToTime(close),
      type: 'store',
      repeat: 'daily',
      memo: '매출 확인 · 영수증 정리',
      doneOn: {},
    },
  ]
}

interface AppState {
  onboarded: boolean
  profile: Profile
  settings: Settings
  progress: Record<string, LessonProgress>
  logs: LearnLog[]
  bookmarks: string[]
  notes: Record<string, string>
  review: ReviewItem[]
  events: ScheduleEvent[]
  presetDone: Record<string, boolean>
  questions: Question[]
  readNotifs: string[]
  lastLessonId?: string

  completeOnboarding: (p: Profile) => void
  updateProfile: (p: Partial<Profile>) => void
  updateSettings: (s: Partial<Settings>) => void

  setCard: (lessonId: string, card: number) => void
  completeLesson: (lessonId: string, correct: boolean[]) => void
  toggleBookmark: (id: string) => void
  setNote: (lessonId: string, text: string) => void
  resolveReview: (lessonId: string, quizIndex: number) => void

  addEvent: (e: Omit<ScheduleEvent, 'id' | 'doneOn'>) => string
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void
  deleteEvent: (id: string) => void
  toggleDone: (event: ScheduleEvent, date: string) => void

  addQuestion: (q: { category: CategoryId; title: string; body: string }) => string
  toggleLike: (questionId: string) => void
  addAnswer: (questionId: string, body: string) => void
  toggleHelpful: (questionId: string, answerId: string) => void
  deleteQuestion: (questionId: string) => void

  markRead: (ids: string[]) => void
  resetAll: () => void
}

const initial = () => ({
  onboarded: false,
  profile: DEFAULT_PROFILE,
  settings: DEFAULT_SETTINGS,
  progress: {},
  logs: [],
  bookmarks: [],
  notes: {},
  review: [],
  events: [],
  presetDone: {},
  questions: seedQuestions(),
  readNotifs: [],
  lastLessonId: undefined,
})

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),

      completeOnboarding: (p) =>
        set({
          onboarded: true,
          profile: p,
          events: [...get().events, ...starterEvents(p, todayKey())],
        }),
      updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      setCard: (lessonId, card) =>
        set({
          lastLessonId: lessonId,
          progress: {
            ...get().progress,
            [lessonId]: { ...(get().progress[lessonId] ?? { done: false, card: 0 }), card },
          },
        }),

      completeLesson: (lessonId, correct) => {
        const lesson = LESSON_MAP[lessonId]
        if (!lesson) return
        const today = todayKey()
        const prev = get().progress[lessonId]
        const score = correct.length ? Math.round((correct.filter(Boolean).length / correct.length) * 100) : 100
        const wrong = correct.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
        const review = get().review.filter((r) => r.lessonId !== lessonId || wrong.includes(r.quizIndex))
        for (const i of wrong) {
          if (!review.some((r) => r.lessonId === lessonId && r.quizIndex === i))
            review.push({ lessonId, quizIndex: i, addedAt: new Date().toISOString() })
        }
        set({
          lastLessonId: lessonId,
          progress: {
            ...get().progress,
            [lessonId]: {
              card: 0,
              done: true,
              completedAt: prev?.completedAt ?? new Date().toISOString(),
              score: Math.max(score, prev?.score ?? 0),
            },
          },
          logs: [...get().logs, { date: today, minutes: lesson.minutes, lessonId }],
          review,
        })
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

      addEvent: (e) => {
        const id = uid('ev')
        set({ events: [...get().events, { ...e, id, doneOn: {} }] })
        return id
      },
      updateEvent: (id, patch) => set({ events: get().events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      deleteEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
      toggleDone: (event, date) => {
        if (event.preset) {
          set({ presetDone: { ...get().presetDone, [event.id]: !get().presetDone[event.id] } })
          return
        }
        set({
          events: get().events.map((e) =>
            e.id === event.id ? { ...e, doneOn: { ...e.doneOn, [date]: !e.doneOn[date] } } : e,
          ),
        })
      },

      addQuestion: ({ category, title, body }) => {
        const id = uid('q')
        const now = new Date().toISOString()
        const p = get().profile
        const found = searchAll(`${title} ${body}`, [], 3)
        const links: Answer['links'] = [
          ...found.faqs.slice(0, 2).map((f) => ({ kind: 'faq' as const, id: f.id })),
          ...found.lessons.slice(0, 2).map((l) => ({ kind: 'lesson' as const, id: l.id })),
        ]
        const helper: Answer = {
          id: uid('a'),
          author: '골목 도우미',
          role: 'helper',
          body: links.length
            ? '질문과 관련된 자료를 찾았어요. 아래 내용을 먼저 확인해 보세요.'
            : '바로 연결할 자료를 찾지 못했어요. 급하다면 아래 상담 창구(1357 · 126 · 1350)를 이용해 보세요.',
          createdAt: now,
          helpful: 0,
          links,
        }
        const q: Question = {
          id,
          category,
          title,
          body,
          author: p.shopName || `${p.name} 사장님`,
          bizLabel: '',
          createdAt: now,
          likes: 0,
          mine: true,
          answers: [helper],
        }
        set({ questions: [q, ...get().questions] })
        return id
      },
      toggleLike: (questionId) =>
        set({
          questions: get().questions.map((q) =>
            q.id === questionId ? { ...q, liked: !q.liked, likes: q.likes + (q.liked ? -1 : 1) } : q,
          ),
        }),
      addAnswer: (questionId, body) => {
        const p = get().profile
        const a: Answer = {
          id: uid('a'),
          author: p.shopName || `${p.name} 사장님`,
          role: 'me',
          body,
          createdAt: new Date().toISOString(),
          helpful: 0,
        }
        set({ questions: get().questions.map((q) => (q.id === questionId ? { ...q, answers: [...q.answers, a] } : q)) })
      },
      toggleHelpful: (questionId, answerId) =>
        set({
          questions: get().questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answers: q.answers.map((a) =>
                    a.id === answerId
                      ? { ...a, markedHelpful: !a.markedHelpful, helpful: a.helpful + (a.markedHelpful ? -1 : 1) }
                      : a,
                  ),
                }
              : q,
          ),
        }),
      deleteQuestion: (questionId) => set({ questions: get().questions.filter((q) => q.id !== questionId) }),

      markRead: (ids) => set({ readNotifs: Array.from(new Set([...get().readNotifs, ...ids])).slice(-300) }),
      resetAll: () => set(initial()),
    }),
    {
      name: 'golmok-app-v2',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
