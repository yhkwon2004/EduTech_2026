import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BookOpen, Check, ChevronRight, Lock, Minus, Newspaper, Plus, Sparkles, Store, Users } from 'lucide-react'
import { useApp } from '@/store/app'
import { useGame, canPlayToday } from '@/game/store'
import { useGameContext } from '@/game/hooks'
import { MARKETING, MAX_ACTIONS, WEATHER } from '@/game/data'
import { capacityOf, clampRef, costRate, eventFor, priceFactor, suggestPlan, weatherFor } from '@/game/sim'
import type { DayDecision, MarketingId } from '@/game/types'
import { won } from '@/game/ui'
import { formatKo, minToTime, timeToMin, todayKey, WEEKDAY_KO, weekday } from '@/lib/date'
import { cx, PrimaryButton, TopBar } from '@/components/ui'

const STEPS = ['아침 브리핑', '생산', '가격', '홍보', '영업 시작']
const DAY_NOTE = ['일요일 · 가족 손님이 많아요', '월요일 · 한가한 편', '화요일 · 평범한 날', '수요일 · 평범한 날', '목요일 · 평범한 날', '금요일 · 저녁 손님 ↑', '토요일 · 손님이 가장 많은 날']

function Stepper({ value, onChange, step = 1, min = 0, max = 9999 }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button aria-label="줄이기" onClick={() => onChange(Math.max(min, value - step))} className="grid size-9 place-items-center rounded-full bg-bg text-ink active:scale-90">
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || 0))))}
        className="w-[4.5rem] rounded-xl bg-bg py-1.5 text-center text-[1rem] font-extrabold outline-none"
      />
      <button aria-label="늘리기" onClick={() => onChange(Math.min(max, value + step))} className="grid size-9 place-items-center rounded-full bg-bg text-ink active:scale-90">
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export function GamePlay() {
  const nav = useNavigate()
  const g = useGame()
  const profile = useApp((s) => s.profile)
  const ctx = useGameContext()
  const today = todayKey()
  const nextDay = g.day + 1
  const event = useMemo(() => eventFor(g.seed, nextDay), [g.seed, nextDay])
  const weather = weatherFor(g.seed, nextDay)
  const wd = weekday(today)
  const last = g.history[g.history.length - 1]
  const cap = capacityOf(g.biz, g.stats, ctx.skills)

  const [step, setStep] = useState(0)
  const [decision, setDecision] = useState<DayDecision>(() => ({
    plan: suggestPlan({ products: g.products, lastDemand: last ? Object.fromEntries(last.products.map((p) => [p.id, p.demand])) : undefined, capacity: cap }),
    prices: Object.fromEntries(g.products.map((p) => [p.id, p.price])),
    marketing: [],
    eventChoice: undefined,
  }))
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const resultRef = useRef<ReturnType<typeof g.play> | null>(null)

  useEffect(() => {
    if (!running) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 3600)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => nav('/game/result', { replace: true }), 450)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, nav])

  if (!g.started) return <Navigate to="/game/setup" replace />
  if (!running && !canPlayToday(g, today))
    return (
      <div className="min-h-dvh">
        <TopBar title="오늘 장사" />
        <div className="px-5 pt-6 text-center">
          <p className="text-[3rem]">🌙</p>
          <p className="mt-2 text-[1.25rem] font-extrabold">오늘 장사는 끝났어요</p>
          <p className="mt-1 text-[0.9375rem] text-sub">내일 아침에 다시 문을 열 수 있어요. 그동안 배우고 실천하면 내일 가게가 더 강해져요!</p>
          <div className="mx-auto mt-6 max-w-[16rem] space-y-2.5">
            <PrimaryButton onClick={() => nav('/game/result')}>오늘 결과 보기</PrimaryButton>
            <button onClick={() => nav('/learn')} className="h-12 w-full rounded-full bg-white text-[0.9375rem] font-bold text-primary ring-1 ring-primary/30">
              3분 배우고 노하우 올리기
            </button>
          </div>
        </div>
      </div>
    )

  const goods = g.products.filter((p) => p.kind === 'goods')
  const planCost = goods.reduce((s, p) => s + (decision.plan[p.id] ?? 0) * p.cost, 0)
  const planUnits = goods.reduce((s, p) => s + (decision.plan[p.id] ?? 0), 0)
  const mkCost = decision.marketing.reduce((s, m) => s + MARKETING[m].cost, 0)
  const needEventChoice = !!event && decision.eventChoice === undefined
  const toggleMk = (id: MarketingId) =>
    setDecision((d) => ({
      ...d,
      marketing: d.marketing.includes(id) ? d.marketing.filter((m) => m !== id) : d.marketing.length >= MAX_ACTIONS ? d.marketing : [...d.marketing, id],
    }))

  const startDay = () => {
    resultRef.current = g.play(decision, { skills: ctx.skills, buff: ctx.buff, lessonsToday: ctx.lessonsToday })
    setRunning(true)
  }

  if (running) {
    const r = resultRef.current!
    const open = timeToMin(profile.openTime)
    let close = timeToMin(profile.closeTime)
    if (close <= open) close = 24 * 60 - 1
    const clock = minToTime(open + (close - open) * progress)
    const ease = 1 - (1 - progress) ** 2
    const feed = r.products.filter((p) => p.sold > 0)
    const shown = Math.floor(progress * 8)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary to-primary-700 px-6 text-white">
        <p className="text-[0.875rem] font-bold text-white/70">
          {g.day}일차 영업 중 · {WEATHER[r.weather].emoji} {WEATHER[r.weather].label}
        </p>
        <p className="mt-1 text-[3rem] font-extrabold tabular-nums tracking-tight">{clock}</p>
        <div className="mt-6 grid w-full max-w-[20rem] grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white/15 p-4 text-center ring-1 ring-white/25">
            <Users className="mx-auto size-6" />
            <p className="mt-1 text-[1.75rem] font-extrabold tabular-nums">{Math.round(r.customers * ease)}</p>
            <p className="text-[0.75rem] font-bold text-white/70">손님</p>
          </div>
          <div className="rounded-3xl bg-white/15 p-4 text-center ring-1 ring-white/25">
            <Store className="mx-auto size-6" />
            <p className="mt-1 text-[1.75rem] font-extrabold tabular-nums">{won(r.revenue * ease)}</p>
            <p className="text-[0.75rem] font-bold text-white/70">매출(원)</p>
          </div>
        </div>
        <div className="mt-5 h-2 w-full max-w-[20rem] overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-sun" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-6 h-40 w-full max-w-[20rem] space-y-1.5 overflow-hidden">
          {Array.from({ length: shown }, (_, i) => {
            const p = feed[i % Math.max(1, feed.length)]
            if (!p) return null
            return (
              <p key={i} className="animate-slide-in rounded-2xl bg-white/12 px-3.5 py-2 text-[0.8125rem] font-semibold">
                {p.emoji} 손님이 {p.name}을(를) 샀어요
              </p>
            )
          })}
          {progress > 0.6 && r.lostCustomers > 0 && (
            <p className="animate-slide-in rounded-2xl bg-coral/80 px-3.5 py-2 text-[0.8125rem] font-semibold">😢 손님 {r.lostCustomers}명이 그냥 돌아갔어요</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={`${nextDay}일차 · ${STEPS[step]}`} onBack={step > 0 ? () => setStep(step - 1) : undefined} />
      <div className="flex gap-1.5 px-5">
        {STEPS.map((s, i) => (
          <span key={s} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-line')} />
        ))}
      </div>

      <div key={step} className="flex-1 animate-slide-in space-y-4 px-5 pb-6 pt-4">
        {step === 0 && (
          <>
            <div className="rounded-[1.5rem] bg-gradient-to-br from-[#3D8BFF] to-primary-700 p-5 text-white shadow-float">
              <p className="text-[0.8125rem] font-bold text-white/75">
                {formatKo(today)} · {WEEKDAY_KO[wd]}요일
              </p>
              <p className="mt-1 text-[1.375rem] font-extrabold">
                {WEATHER[weather].emoji} 오늘 날씨 {WEATHER[weather].label}
              </p>
              <p className="mt-0.5 text-[0.875rem] font-semibold text-white/80">
                {DAY_NOTE[wd]}
                {weather === 'rain' && ' · 비 오는 날은 배달 광고 효과 2배'}
              </p>
              {last && (
                <p className="mt-3 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/20">
                  어제 {last.rank}위 · 손님 {last.customers}명 · 이익 {won(last.profit, { sign: true })}원
                </p>
              )}
            </div>

            <button onClick={() => nav('/today')} className="flex w-full items-center gap-3 rounded-[1.25rem] bg-violet-50 p-4 text-left ring-1 ring-violet/20">
              <Sparkles className="size-6 shrink-0 text-violet" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-extrabold">현장 버프 손님 +{Math.round(ctx.buff * 100)}%</span>
                <span className="block text-[0.75rem] font-semibold text-sub">
                  실제 오늘 할 일 {ctx.todoDone}/{ctx.todoTotal} · 도전 {ctx.challengesToday}개 — 가게 일을 할수록 게임 손님이 늘어요
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-mute" />
            </button>

            {event && (
              <div className="rounded-[1.5rem] bg-white p-5 shadow-card">
                <p className="text-[0.75rem] font-bold text-coral">오늘의 상황</p>
                <p className="mt-1 text-[1.125rem] font-extrabold">{event.title}</p>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-sub">{event.body}</p>
                <div className="mt-3 space-y-2">
                  {event.choices.map((c, i) => (
                    <button
                      key={c.label}
                      onClick={() => setDecision((d) => ({ ...d, eventChoice: i }))}
                      aria-pressed={decision.eventChoice === i}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[0.9375rem] font-bold ring-2 transition',
                        decision.eventChoice === i ? 'bg-primary-50 text-primary ring-primary' : 'ring-line',
                      )}
                    >
                      <span className={cx('grid size-6 shrink-0 place-items-center rounded-full ring-2', decision.eventChoice === i ? 'bg-primary text-white ring-primary' : 'ring-line')}>
                        {decision.eventChoice === i && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
                {event.lessonId && (
                  <button onClick={() => nav(`/lesson/${event.lessonId}`)} className="mt-3 flex items-center gap-1 text-[0.8125rem] font-bold text-primary">
                    <BookOpen className="size-4" /> 고민되면 관련 레슨 먼저 보기
                  </button>
                )}
              </div>
            )}

            {g.rivals.some((r) => r.news) && (
              <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
                <p className="flex items-center gap-1.5 text-[0.875rem] font-extrabold">
                  <Newspaper className="size-4 text-primary" /> 어제 동네 소식
                </p>
                <ul className="mt-2 space-y-1.5">
                  {g.rivals
                    .filter((r) => r.news)
                    .slice(0, 4)
                    .map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-[0.84375rem] font-semibold text-ink/85">
                        <span>{r.emoji}</span>
                        {r.news}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="rounded-[1.25rem] bg-primary-50 p-4">
              <p className="text-[0.9375rem] font-extrabold text-primary-700">오늘 받을 수 있는 손님 약 {cap}명</p>
              <p className="mt-0.5 text-[0.8125rem] font-semibold text-sub">
                너무 많이 만들면 남아서 버리고(폐기), 적게 만들면 품절로 손님을 놓쳐요. 어제 판매량을 참고하세요.
              </p>
            </div>
            {goods.map((p) => {
              const y = last?.products.find((x) => x.id === p.id)
              const sug = suggestPlan({ products: [p], lastDemand: y ? { [p.id]: y.demand } : undefined, capacity: Math.round(cap / Math.max(1, goods.length)) * goods.length })[p.id]
              return (
                <div key={p.id} className="rounded-[1.25rem] bg-white p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg text-[1.375rem]">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-bold">{p.name}</span>
                      <span className="block text-[0.71875rem] font-semibold text-mute">
                        {y ? `어제 찾은 손님 ${y.demand} · 판매 ${y.sold}${y.wasted ? ` · 폐기 ${y.wasted}` : ''}` : '첫날이에요'}
                        {!p.perishable && p.stock > 0 && ` · 재고 ${p.stock}`}
                      </span>
                    </span>
                    <Stepper value={decision.plan[p.id] ?? 0} onChange={(v) => setDecision((d) => ({ ...d, plan: { ...d.plan, [p.id]: v } }))} step={5} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[0.75rem] font-semibold">
                    <span className="text-sub">원가 {won((decision.plan[p.id] ?? 0) * p.cost)}원</span>
                    <button onClick={() => setDecision((d) => ({ ...d, plan: { ...d.plan, [p.id]: sug } }))} className="font-bold text-primary">
                      추천 {sug}개로
                    </button>
                  </div>
                </div>
              )
            })}
            {g.products.some((p) => p.kind === 'service') && (
              <p className="rounded-2xl bg-bg p-3.5 text-[0.8125rem] font-semibold text-sub">
                ✂️ 서비스 항목은 미리 만들지 않아요. 손님이 올 때마다 원가가 들고, 하루 수용량만큼 받을 수 있어요.
              </p>
            )}
            {goods.length > 0 && (
              <div className={cx('rounded-2xl p-3.5 text-[0.875rem] font-bold', planCost > g.stats.cash ? 'bg-coral-50 text-coral' : 'bg-white shadow-card')}>
                총 {planUnits}개 준비 · 재료비 {won(planCost)}원 / 보유 {won(g.stats.cash)}원
                {planCost > g.stats.cash && <span className="block text-[0.75rem]">돈이 모자라 가진 만큼만 만들어요</span>}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[0.875rem] leading-relaxed text-sub">싸면 손님이 늘고, 비싸면 남는 돈이 늘어요. 동네 평균과 원가율을 보면서 정해 보세요.</p>
            {g.products.map((p) => {
              const price = decision.prices[p.id] ?? p.price
              const ref = clampRef(p)
              const pf = priceFactor(ref, price)
              const rate = costRate({ cost: p.cost, price })
              return (
                <div key={p.id} className="rounded-[1.25rem] bg-white p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg text-[1.375rem]">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-bold">{p.name}</span>
                      <span className="block text-[0.71875rem] font-semibold text-mute">
                        동네 평균 {ref.toLocaleString()}원 · 원가 {p.cost.toLocaleString()}원
                      </span>
                    </span>
                    <Stepper value={price} step={p.price >= 20000 ? 1000 : 100} min={100} onChange={(v) => setDecision((d) => ({ ...d, prices: { ...d.prices, [p.id]: v } }))} />
                  </div>
                  <div className="mt-2.5 flex gap-2 text-[0.75rem] font-bold">
                    <span className={cx('rounded-full px-2.5 py-1', rate > 0.5 ? 'bg-coral-50 text-coral' : 'bg-teal-50 text-teal')}>원가율 {Math.round(rate * 100)}%</span>
                    <span className="rounded-full bg-bg px-2.5 py-1 text-sub">1개당 {(price - p.cost).toLocaleString()}원 남음</span>
                    <span className={cx('rounded-full px-2.5 py-1', pf > 1.15 ? 'bg-primary-50 text-primary' : pf < 0.8 ? 'bg-orange-50 text-orange' : 'bg-bg text-sub')}>
                      손님 반응 {pf > 1.15 ? '좋음' : pf < 0.8 ? '비싸요' : '보통'}
                    </span>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[0.875rem] font-semibold text-sub">하루에 홍보는 {MAX_ACTIONS}가지까지</p>
              <span className="flex gap-1">
                {Array.from({ length: MAX_ACTIONS }, (_, i) => (
                  <span key={i} className={cx('size-3 rounded-full', i < decision.marketing.length ? 'bg-primary' : 'bg-line')} />
                ))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(MARKETING) as MarketingId[]).map((id) => {
                const m = MARKETING[id]
                const locked = !!m.needSkill && (ctx.skills[m.needSkill] ?? 0) < 1
                const on = decision.marketing.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => (locked ? nav(`/lesson/${m.lessonId}`) : toggleMk(id))}
                    aria-pressed={on}
                    className={cx(
                      'relative flex flex-col items-start rounded-[1.25rem] p-3.5 text-left transition',
                      on ? 'bg-primary text-white shadow-float' : 'bg-white shadow-card',
                      locked && 'opacity-60',
                    )}
                  >
                    <span className="text-[1.5rem]">{m.emoji}</span>
                    <span className="mt-1 text-[0.9375rem] font-extrabold">{m.label}</span>
                    <span className={cx('mt-0.5 text-[0.71875rem] font-semibold leading-snug', on ? 'text-white/80' : 'text-sub')}>{m.desc}</span>
                    <span className={cx('mt-2 text-[0.8125rem] font-extrabold', on ? 'text-white' : 'text-ink')}>{m.cost ? `${won(m.cost)}원` : '무료'}</span>
                    {locked && (
                      <span className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full bg-ink px-2 py-0.5 text-[0.625rem] font-bold text-white">
                        <Lock className="size-3" /> 레슨 필요
                      </span>
                    )}
                    {on && <Check className="absolute right-3 top-3 size-5" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-card">
              <p className="text-[1.0625rem] font-extrabold">오늘의 장사 계획</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] font-semibold">
                {g.products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>
                      {p.emoji} {p.name}
                    </span>
                    <span className="text-sub">
                      {p.kind === 'goods' ? `${decision.plan[p.id] ?? 0}개 · ` : ''}
                      {(decision.prices[p.id] ?? p.price).toLocaleString()}원
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-line pt-3 text-[0.875rem] font-semibold">
                <p className="flex justify-between">
                  <span className="text-sub">홍보</span>
                  <span>{decision.marketing.length ? decision.marketing.map((m) => MARKETING[m].label).join(', ') : '없음'}</span>
                </p>
                <p className="mt-1.5 flex justify-between">
                  <span className="text-sub">미리 드는 돈</span>
                  <span>{won(planCost + mkCost)}원</span>
                </p>
                {event && decision.eventChoice !== undefined && (
                  <p className="mt-1.5 flex justify-between gap-3">
                    <span className="shrink-0 text-sub">상황 대응</span>
                    <span className="text-right">{event.choices[decision.eventChoice].label}</span>
                  </p>
                )}
                {ctx.buff > 0 && (
                  <p className="mt-1.5 flex justify-between">
                    <span className="text-sub">현장 버프</span>
                    <span className="text-violet">손님 +{Math.round(ctx.buff * 100)}%</span>
                  </p>
                )}
              </div>
            </div>
            <p className="text-center text-[0.8125rem] font-semibold text-mute">영업을 시작하면 오늘 결정은 바꿀 수 없어요</p>
          </div>
        )}
      </div>

      <div className="pb-safe-5 sticky bottom-0 bg-bg/95 px-5 pt-3 backdrop-blur">
        {step < 4 ? (
          <PrimaryButton onClick={() => setStep(step + 1)} disabled={step === 0 && needEventChoice}>
            {step === 0 && needEventChoice ? '상황 카드를 골라 주세요' : `다음: ${STEPS[step + 1]}`}
          </PrimaryButton>
        ) : (
          <PrimaryButton tone="coral" onClick={startDay}>
            🔔 영업 시작!
          </PrimaryButton>
        )}
      </div>
    </div>
  )
}
