import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BookOpen, Check, CircleCheck, CircleX, MessageSquareReply, Trophy, X } from 'lucide-react'
import { useGame } from '@/game/store'
import { REPLY_QUIZ, WEATHER } from '@/game/data'
import { RankChange, Stars, won, wonFull } from '@/game/ui'
import { hash } from '@/lib/rng'
import { todayKey } from '@/lib/date'
import { cx, PrimaryButton, ProgressBar, TopBar } from '@/components/ui'

export function GameResult() {
  const nav = useNavigate()
  const g = useGame()
  const r = g.history[g.history.length - 1]
  const [pick, setPick] = useState<number | null>(null)
  if (!g.started) return <Navigate to="/game/setup" replace />
  if (!r) return <Navigate to="/" replace />

  const quiz = REPLY_QUIZ[hash(r.date + g.seed) % REPLY_QUIZ.length]
  const replyDone = g.replyDay === todayKey()
  const totalCost = r.costs.ingredients + r.costs.marketing + r.costs.wages + r.costs.rent
  const made = r.products.reduce((s, p) => s + p.made, 0)
  const wasted = r.products.reduce((s, p) => s + p.wasted, 0)
  const me = r.table.find((l) => l.isPlayer)!

  return (
    <div className="min-h-dvh pb-10">
      <TopBar title={`${r.day}일차 결산`} />

      <div className="px-5">
        <div
          className={cx(
            'relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-float',
            r.profit >= 0 ? 'bg-gradient-to-br from-[#3D8BFF] via-primary to-primary-700' : 'bg-gradient-to-br from-[#FF7A91] to-coral',
          )}
        >
          <span className="absolute -right-10 -top-10 size-36 rounded-full bg-white/10" />
          <p className="relative text-[0.8125rem] font-bold text-white/80">
            {WEATHER[r.weather].emoji} {WEATHER[r.weather].label} · 동네 손님 {r.marketSize}명 중 {r.customers}명이 왔어요
          </p>
          <p className="relative mt-1 text-[0.875rem] font-bold">오늘 이익</p>
          <p className="relative text-[2.25rem] font-extrabold tabular-nums tracking-tight">{won(r.profit, { sign: true })}원</p>
          <div className="relative mt-3 flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/20">
            <Trophy className="size-6 shrink-0 text-sun" />
            <span className="min-w-0 flex-1">
              <span className="block text-[1.125rem] font-extrabold">
                오늘 {r.rank}위 <span className="text-[0.8125rem] font-bold text-white/75">/ {r.table.length}곳</span>
              </span>
              <span className="block text-[0.75rem] font-semibold text-white/75">골목 점수 {r.score}점 · +{r.xpGained} XP</span>
            </span>
            <span className="rounded-full bg-white px-2.5 py-1">
              <RankChange now={r.rank} prev={r.prevRank} />
            </span>
          </div>
        </div>
      </div>

      {/* 점수 */}
      <section className="mt-4 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <p className="text-[0.9375rem] font-extrabold">골목 점수는 이렇게 나왔어요</p>
          <p className="text-[0.71875rem] font-semibold text-mute">동네 가게들과 비교한 상대 점수예요</p>
          <div className="mt-3 space-y-2.5">
            {[
              ['이익', r.scoreParts.profit, 40, 'bg-primary'],
              ['평판', r.scoreParts.reputation, 25, 'bg-sun'],
              ['손님 점유', r.scoreParts.share, 20, 'bg-teal'],
              ['성장 (배움 포함)', r.scoreParts.growth, 15, 'bg-violet'],
            ].map(([k, v, max, c]) => (
              <div key={k as string}>
                <div className="flex justify-between text-[0.8125rem] font-bold">
                  <span>{k}</span>
                  <span className="text-sub">
                    {v}/{max}
                  </span>
                </div>
                <ProgressBar value={(v as number) / (max as number)} color={c as string} className="mt-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 돈 */}
      <section className="mt-4 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <p className="text-[0.9375rem] font-extrabold">돈의 흐름</p>
          <dl className="mt-3 space-y-2 text-[0.875rem] font-semibold">
            <div className="flex justify-between">
              <dt>매출</dt>
              <dd className="text-primary">{wonFull(r.revenue)}</dd>
            </div>
            {[
              ['재료비', r.costs.ingredients],
              ['홍보비', r.costs.marketing],
              ['인건비', r.costs.wages],
              ['임대료·공과금', r.costs.rent],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between text-sub">
                <dt>{k}</dt>
                <dd>-{wonFull(v as number)}</dd>
              </div>
            ))}
            {r.wasteValue > 0 && (
              <div className="flex justify-between text-coral">
                <dt>└ 그중 버린 재료</dt>
                <dd>{wonFull(r.wasteValue)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 font-extrabold">
              <dt>이익</dt>
              <dd className={r.profit >= 0 ? 'text-teal' : 'text-coral'}>{wonFull(r.profit)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[0.71875rem] font-semibold text-mute">
            비용 합계 {won(totalCost)}원 · 매출 대비 {r.revenue ? Math.round((totalCost / r.revenue) * 100) : 0}%
          </p>
        </div>
      </section>

      {/* 상품별 */}
      <section className="mt-4 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <p className="text-[0.9375rem] font-extrabold">판매 항목별</p>
          <div className="mt-2 divide-y divide-line">
            {r.products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="text-[1.375rem]">{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-bold">{p.name}</span>
                  <span className="block text-[0.71875rem] font-semibold text-mute">
                    찾은 손님 {p.demand} · 판매 {p.sold}
                    {p.made > 0 && ` / 준비 ${p.made}`}
                    {p.wasted > 0 && <span className="text-coral"> · 폐기 {p.wasted}</span>}
                    {p.demand > p.sold && <span className="text-orange"> · 품절 {p.demand - p.sold}</span>}
                  </span>
                </span>
                <span className="text-[0.875rem] font-extrabold">{won(p.revenue)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[0.75rem] font-bold">
            <div className="rounded-xl bg-bg py-2">
              <p className="text-[1rem] font-extrabold">{r.customers}</p>손님
            </div>
            <div className={cx('rounded-xl py-2', r.lostCustomers > 0 ? 'bg-orange-50 text-orange' : 'bg-bg')}>
              <p className="text-[1rem] font-extrabold">{r.lostCustomers}</p>놓친 손님
            </div>
            <div className={cx('rounded-xl py-2', made && wasted / made > 0.15 ? 'bg-coral-50 text-coral' : 'bg-bg')}>
              <p className="text-[1rem] font-extrabold">{made ? Math.round((wasted / made) * 100) : 0}%</p>폐기율
            </div>
          </div>
        </div>
      </section>

      {/* 평판·리뷰 */}
      <section className="mt-4 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[0.9375rem] font-extrabold">오늘의 리뷰</p>
            <span className="flex items-center gap-1.5 text-[0.8125rem] font-bold">
              <Stars value={r.reputation} /> {r.reputation.toFixed(2)}
              <span className={r.reputation >= r.reputationBefore ? 'text-teal' : 'text-coral'}>
                ({r.reputation >= r.reputationBefore ? '+' : ''}
                {(r.reputation - r.reputationBefore).toFixed(2)})
              </span>
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {r.reviews.map((rv, i) => (
              <li key={i} className={cx('rounded-2xl px-3.5 py-2.5', rv.tone === 'bad' ? 'bg-coral-50' : rv.tone === 'good' ? 'bg-teal-50' : 'bg-bg')}>
                <Stars value={rv.stars} size={12} />
                <p className="mt-0.5 text-[0.875rem] font-semibold">"{rv.text}"</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.75rem] font-semibold text-sub">인지도 {Math.round(r.awarenessBefore)} → {Math.round(r.awareness)}</p>
        </div>
      </section>

      {/* 리뷰 답글 미니게임 */}
      <section className="mt-4 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card ring-2 ring-sun/40">
          <p className="flex items-center gap-1.5 text-[0.9375rem] font-extrabold">
            <MessageSquareReply className="size-5 text-[#B7860B]" /> 리뷰 답글 달기 <span className="text-[0.75rem] font-bold text-sub">· 맞히면 평판 +0.03</span>
          </p>
          <p className="mt-2 rounded-2xl bg-bg px-3.5 py-2.5 text-[0.875rem] font-semibold">"{quiz.review}"</p>
          <div className="mt-2.5 space-y-2">
            {quiz.options.map((o, i) => {
              const answered = pick !== null || replyDone
              const correct = i === quiz.answer
              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => {
                    setPick(i)
                    g.answerReply(correct)
                  }}
                  className={cx(
                    'flex w-full items-start gap-2.5 rounded-2xl px-3.5 py-3 text-left text-[0.84375rem] font-semibold ring-2',
                    !answered && 'ring-line',
                    answered && correct && 'bg-teal-50 ring-teal',
                    answered && pick === i && !correct && 'bg-coral-50 ring-coral',
                    answered && pick !== i && !correct && 'opacity-50 ring-line',
                  )}
                >
                  {answered && correct ? <Check className="mt-0.5 size-4 shrink-0 text-teal" /> : answered && pick === i ? <X className="mt-0.5 size-4 shrink-0 text-coral" /> : <span className="mt-0.5 size-4 shrink-0" />}
                  {o}
                </button>
              )
            })}
          </div>
          {(pick !== null || replyDone) && (
            <p className={cx('mt-2.5 flex items-start gap-1.5 text-[0.8125rem] font-semibold', pick === null || pick === quiz.answer ? 'text-teal' : 'text-coral')}>
              {pick === null || pick === quiz.answer ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleX className="mt-0.5 size-4 shrink-0" />}
              {pick === null ? '오늘 답글은 이미 달았어요. ' : ''}
              {quiz.explain}
            </p>
          )}
        </div>
      </section>

      {/* 배울 점 */}
      <section className="mt-4 px-5">
        <div className="rounded-[1.25rem] bg-violet-50 p-4 ring-1 ring-violet/15">
          <p className="text-[0.9375rem] font-extrabold">오늘 장사에서 배울 점</p>
          <ul className="mt-2.5 space-y-2">
            {r.tips.map((t, i) => (
              <li key={i} className="rounded-2xl bg-white p-3.5">
                <p className="text-[0.875rem] font-semibold leading-relaxed">{t.text}</p>
                {t.lessonId && (
                  <button onClick={() => nav(`/lesson/${t.lessonId}`)} className="mt-1.5 flex items-center gap-1 text-[0.8125rem] font-bold text-violet">
                    <BookOpen className="size-4" /> 관련 레슨 보고 노하우 올리기
                  </button>
                )}
              </li>
            ))}
            {r.eventNote && <li className="rounded-2xl bg-white p-3.5 text-[0.84375rem] font-semibold text-sub">📌 {r.eventNote}</li>}
            {r.buff > 0 && <li className="rounded-2xl bg-white p-3.5 text-[0.84375rem] font-semibold text-violet">✨ 현장 버프로 손님 +{Math.round(r.buff * 100)}% 효과를 받았어요</li>}
          </ul>
        </div>
      </section>

      {/* 오늘 동네 순위 */}
      <section className="mt-4 px-5">
        <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-card">
          <p className="px-4 pt-4 text-[0.9375rem] font-extrabold">오늘 동네 순위</p>
          <div className="mt-2">
            {r.table.map((l) => (
              <div key={l.id} className={cx('flex items-center gap-3 px-4 py-2.5', l.isPlayer && 'bg-primary-50')}>
                <span className={cx('w-6 text-center text-[0.9375rem] font-extrabold', l.rank <= 3 ? 'text-[#B7860B]' : 'text-sub')}>{l.rank}</span>
                <span className="text-[1.25rem]">{l.emoji}</span>
                <span className={cx('min-w-0 flex-1 truncate text-[0.875rem] font-bold', l.isPlayer && 'text-primary')}>
                  {l.name}
                  {l.isPlayer && ' (나)'}
                </span>
                <span className="text-[0.75rem] font-semibold text-mute">손님 {l.customers}</span>
                <span className="w-10 text-right text-[0.875rem] font-extrabold">{l.score}</span>
              </div>
            ))}
          </div>
          <p className="px-4 pb-3 pt-1 text-[0.71875rem] font-semibold text-mute">내 골목 점수 {me.score}점 · 이번 시즌 누적은 랭킹 탭에서</p>
        </div>
      </section>

      <div className="mt-6 space-y-2.5 px-5">
        <PrimaryButton onClick={() => nav('/rank')}>시즌 랭킹 보기</PrimaryButton>
        <button onClick={() => nav('/')} className="h-12 w-full rounded-full bg-white text-[0.9375rem] font-bold text-ink ring-1 ring-line">
          내 가게로
        </button>
      </div>
    </div>
  )
}
