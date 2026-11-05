import { useMemo, useState } from 'react'
import { Clock, Shuffle, Trophy } from 'lucide-react'
import type { Challenge, TaskTag } from '@/types'
import { useApp } from '@/store/app'
import { CHALLENGES, RANKS } from '@/data/challenges'
import { TAG_META } from '@/data/routines'
import { addDays, todayKey } from '@/lib/date'
import { dailyChallenges, rankFor, totalPoints } from '@/lib/today'
import { ChallengeCard, ChallengeSheet } from '@/components/ChallengeSheet'
import { Chip, cx, ProgressBar, TopBar } from '@/components/ui'

const TAGS: TaskTag[] = ['marketing', 'digital', 'service', 'ops', 'tax', 'support', 'labor', 'hygiene', 'safety', 'care']

export function Challenges() {
  const today = todayKey()
  const interests = useApp((s) => s.profile.interests)
  const log = useApp((s) => s.challengeLog)
  const taskDone = useApp((s) => s.taskDone)
  const shuffleN = useApp((s) => s.challengeShuffle[today] ?? 0)
  const shuffle = useApp((s) => s.shuffleChallenges)
  const [tag, setTag] = useState<TaskTag | 'all'>('all')
  const [quick, setQuick] = useState(false)
  const [open, setOpen] = useState<Challenge | null>(null)

  const points = totalPoints(log, taskDone)
  const rank = rankFor(points)
  const picks = useMemo(() => dailyChallenges({ date: today, interests, log, shuffle: shuffleN }), [today, interests, log, shuffleN])
  const weekCount = log.filter((l) => l.date >= addDays(today, -6)).length
  const kinds = new Set(log.map((l) => l.id)).size

  const list = CHALLENGES.filter((c) => (tag === 'all' || c.tag === tag) && (!quick || c.minutes <= 3))

  return (
    <div className="min-h-dvh pb-10">
      <TopBar title="도전" />

      <div className="px-5">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#FFD666] via-sun to-[#F5A623] p-5 text-ink shadow-[0_10px_30px_rgba(245,166,35,0.3)]">
          <span className="absolute -right-8 -top-10 size-36 rounded-full bg-white/25" />
          <div className="relative flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/70">
              <Trophy className="size-7 text-[#B7860B]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-bold text-ink/70">내 단계</p>
              <p className="text-[1.375rem] font-extrabold tracking-tight">{rank.name}</p>
            </div>
            <p className="text-right">
              <span className="block text-[1.5rem] font-extrabold">{points}</span>
              <span className="text-[0.75rem] font-bold text-ink/70">포인트</span>
            </p>
          </div>
          <div className="relative mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/50">
              <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[0.75rem] font-bold text-ink/75">
              {rank.next ? `'${rank.next.name}'까지 ${rank.next.min - points}P` : '최고 단계에 올랐어요!'}
            </p>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['이번 주', `${weekCount}개`],
              ['누적 도전', `${log.length}번`],
              ['해 본 종류', `${kinds}/${CHALLENGES.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/55 py-2.5">
                <p className="text-[1rem] font-extrabold">{v}</p>
                <p className="text-[0.6875rem] font-bold text-ink/65">{k}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 px-1 text-[0.71875rem] font-semibold text-mute">
          포인트 = 도전 포인트 + 체크한 루틴 1개당 1P · 단계: {RANKS.map((r) => r.name).join(' → ')}
        </p>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between px-5">
          <h2 className="text-[1.1875rem] font-bold tracking-tight">오늘의 도전</h2>
          <button onClick={() => shuffle(today)} className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[0.8125rem] font-bold text-primary shadow-card">
            <Shuffle className="size-4" /> 다른 도전
          </button>
        </div>
        <div className="space-y-2.5 px-5">
          {picks.map((c) => (
            <ChallengeCard key={c.id} c={c} onOpen={() => setOpen(c)} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 px-5 text-[1.1875rem] font-bold tracking-tight">모든 도전 {CHALLENGES.length}개</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip size="sm" active={quick} onClick={() => setQuick(!quick)}>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              3분 이하
            </span>
          </Chip>
          <Chip size="sm" active={tag === 'all'} onClick={() => setTag('all')}>
            전체
          </Chip>
          {TAGS.map((t) => (
            <Chip size="sm" key={t} active={tag === t} onClick={() => setTag(t)}>
              {TAG_META[t].name}
            </Chip>
          ))}
        </div>
        <div className="mt-3 space-y-2.5 px-5">
          {list.map((c) => {
            const n = log.filter((l) => l.id === c.id).length
            return (
              <div key={c.id} className="relative">
                <ChallengeCard c={c} onOpen={() => setOpen(c)} />
                {n > 0 && (
                  <span className={cx('absolute -top-1.5 left-3 rounded-full bg-teal px-2 py-0.5 text-[0.625rem] font-extrabold text-white')}>{n}번 완료</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {log.length > 0 && (
        <section className="mt-7 px-5">
          <h2 className="mb-2 text-[1rem] font-bold">최근 기록</h2>
          <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-card">
            {[...log]
              .reverse()
              .slice(0, 8)
              .map((l, i) => {
                const c = CHALLENGES.find((x) => x.id === l.id)
                if (!c) return null
                return (
                  <div key={`${l.id}-${l.date}`} className={cx('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-line')}>
                    <span className="text-[0.75rem] font-bold text-mute">{l.date.slice(5).replace('-', '/')}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{c.title}</span>
                    <span className="text-[0.75rem] font-extrabold text-[#B7860B]">+{c.points}P</span>
                  </div>
                )
              })}
          </div>
          <div className="mt-3">
            <ProgressBar value={kinds / CHALLENGES.length} color="bg-teal" />
            <p className="mt-1 text-[0.71875rem] font-semibold text-mute">
              {CHALLENGES.length}가지 도전 중 {kinds}가지를 해 봤어요
            </p>
          </div>
        </section>
      )}

      <ChallengeSheet challenge={open} onClose={() => setOpen(null)} />
    </div>
  )
}
