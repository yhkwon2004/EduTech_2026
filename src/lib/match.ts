import type { Faq, Question } from '@/types'
import { FAQS } from '@/data/faq'
import { ALL_LESSONS, COURSE_MAP } from '@/data/courses'

/**
 * 한국어 질문 매칭 — 조사가 붙어도("부가세는", "부가세를") 찾을 수 있도록
 * 공백을 없앤 글자 2-gram 겹침 + 태그 포함 여부로 점수를 매깁니다.
 */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function bigrams(s: string): Set<string> {
  const out = new Set<string>()
  for (const token of normalize(s).split(' ')) {
    if (!token) continue
    if (token.length === 1) {
      out.add(token)
      continue
    }
    for (let i = 0; i < token.length - 1; i++) out.add(token.slice(i, i + 2))
  }
  return out
}

/** 질문 문장 기준으로 문서가 얼마나 겹치는지 0~ */
export function scoreText(query: string, docText: string, tags: string[] = []): number {
  const q = bigrams(query)
  if (q.size === 0) return 0
  const d = bigrams(docText + ' ' + tags.join(' '))
  let hit = 0
  q.forEach((g) => {
    if (d.has(g)) hit++
  })
  let score = hit / q.size
  const nq = normalize(query).replace(/\s/g, '')
  for (const t of tags) if (t.length >= 2 && nq.includes(t.toLowerCase())) score += 0.35
  return score
}

const THRESHOLD = 0.34

export interface SearchResults {
  faqs: Faq[]
  lessons: (typeof ALL_LESSONS)[number][]
  questions: Question[]
}

export function searchAll(query: string, questions: Question[], limit = 5): SearchResults {
  if (normalize(query).length < 2) return { faqs: [], lessons: [], questions: [] }
  const faqs = FAQS.map((f) => ({ f, s: scoreText(query, `${f.q} ${f.a}`, f.tags) }))
    .filter((x) => x.s >= THRESHOLD)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.f)

  const lessons = ALL_LESSONS.map((l) => {
    const c = COURSE_MAP[l.courseId]
    const text = `${l.title} ${l.takeaway} ${l.cards.map((k) => k.title).join(' ')} ${c.title}`
    return { l, s: scoreText(query, text, c.tags) }
  })
    .filter((x) => x.s >= THRESHOLD)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.l)

  const qs = questions
    .map((q) => ({ q, s: scoreText(query, `${q.title} ${q.body}`) }))
    .filter((x) => x.s >= THRESHOLD)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.q)

  return { faqs, lessons, questions: qs }
}
