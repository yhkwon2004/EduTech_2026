import { useState } from 'react'
import { CalendarDays, Check, Headphones, Sparkles, Timer } from 'lucide-react'
import type { BizType, CategoryId, Profile } from '@/types'
import { BIZ_TYPES, CATEGORIES } from '@/data/categories'
import { useApp } from '@/store/app'
import { Icon } from '@/components/Icon'
import { cx, PrimaryButton } from '@/components/ui'

const SLIDES = [
  {
    title: '우리 동네 장사왕,\n매일 한 판!',
    body: '주변 가게 7곳과 경쟁해요. 생산·가격·홍보를 정하고 하루 장사를 하면 동네 랭킹이 나와요. 동네 → 구 → 시·도 최고의 소상공인까지!',
  },
  {
    title: '오늘 할 일,\n하면 할수록 강해져요',
    body: '오픈 전부터 마감까지 실제 가게 루틴을 시간대별로 챙겨요. 실제로 한 만큼 게임 속 손님도 늘어나요.',
  },
  {
    title: '3분 배우면\n가게가 강해져요',
    body: '레슨을 끝낼 때마다 노하우 레벨이 올라 게임 효과가 커져요. 손이 바쁠 땐 귀로 듣고, 궁금한 건 바로 물어보세요.',
  },
]

function Illustration({ step }: { step: number }) {
  return (
    <div className="relative mx-auto h-[18.75rem] w-[18.75rem]">
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary-100 to-primary-50" />
      <div className="absolute left-8 top-10 size-4 rounded-full bg-sun" />
      <div className="absolute bottom-12 right-6 size-6 rounded-full bg-coral/80" />
      <div className="absolute right-14 top-6 size-3 rounded-full bg-teal" />
      {step === 2 && (
        <>
          <div className="absolute left-1/2 top-1/2 w-[11rem] -translate-x-1/2 -translate-y-1/2 animate-pop rounded-[28px] bg-white p-5 shadow-card">
            <div className="flex items-center gap-2 text-[0.75rem] font-bold text-primary">
              <Timer className="size-4" /> 지금 3분
            </div>
            <p className="mt-3 text-[2.125rem] font-extrabold tracking-tight text-ink">03:00</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <p className="mt-3 text-[0.75rem] font-semibold text-sub">리뷰 답글 3단 공식</p>
          </div>
          <div className="absolute right-0 top-16 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[0.75rem] font-bold text-violet shadow-card">
            <Headphones className="size-4" /> 듣기 모드
          </div>
          <div className="absolute bottom-10 left-0 rounded-full bg-teal px-3 py-2 text-[0.75rem] font-bold text-white shadow-card">세금 달력</div>
        </>
      )}
      {step === 1 && (
        <>
          <div className="absolute left-1/2 top-1/2 w-[12.5rem] -translate-x-1/2 -translate-y-1/2 animate-pop rounded-[28px] bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[0.8125rem] font-bold">
                <CalendarDays className="size-4 text-primary" /> 오늘 할 일
              </span>
              <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[0.6875rem] font-bold text-coral">D-3 부가세</span>
            </div>
            {[
              ['오픈 전', '냉장고 온도 기록', 'bg-primary'],
              ['쉬는 시간', '리뷰 답글 3개', 'bg-orange'],
              ['마감', '문단속 확인', 'bg-violet'],
            ].map(([t, n, c]) => (
              <div key={t} className="mt-3 flex items-center gap-2.5">
                <span className={cx('h-8 w-1 rounded-full', c)} />
                <span className="text-[0.6875rem] font-bold text-mute">{t}</span>
                <span className="text-[0.8125rem] font-semibold">{n}</span>
              </div>
            ))}
          </div>
          <div className="absolute bottom-8 right-2 flex items-center gap-1.5 rounded-full bg-violet px-3 py-2 text-[0.75rem] font-bold text-white shadow-card">
            <Sparkles className="size-4" /> 오늘의 도전 +10P
          </div>
        </>
      )}
      {step === 0 && (
        <>
          <div className="absolute left-1/2 top-1/2 w-[13rem] -translate-x-1/2 -translate-y-1/2 animate-pop">
            <div className="flex items-end justify-center gap-2">
              {[
                ['🥐', 'h-14', 'from-[#C7D2E3] to-[#9AA8BF]', 2],
                ['🏠', 'h-20', 'from-sun to-[#F5A623]', 1],
                ['☕', 'h-10', 'from-[#F2B48A] to-[#D9824B]', 3],
              ].map(([e, h, c, n]) => (
                <div key={n as number} className="flex w-16 flex-col items-center">
                  {n === 1 && <span className="text-[1.25rem]">👑</span>}
                  <span className={cx('grid size-12 place-items-center rounded-full bg-white text-[1.5rem] shadow-card', n === 1 && 'ring-4 ring-primary')}>{e}</span>
                  <div className={cx('mt-1 grid w-full place-items-center rounded-t-2xl bg-gradient-to-b text-[1.125rem] font-extrabold text-white', h as string, c as string)}>{n}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-0 top-12 rounded-full bg-white px-3 py-2 text-[0.75rem] font-bold text-coral shadow-card">오늘 2위 → 1위 ▲</div>
          <div className="absolute bottom-10 left-0 rounded-full bg-ink px-3 py-2 text-[0.75rem] font-bold text-white shadow-card">망원동 골목 리그</div>
        </>
      )}
    </div>
  )
}

export function Onboarding() {
  const complete = useApp((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>({
    name: '',
    shopName: '',
    bizType: 'food',
    interests: ['marketing', 'tax'],
    dailyGoal: 5,
    openTime: '10:00',
    closeTime: '21:00',
  })

  const toggleInterest = (id: CategoryId) =>
    setP((s) => ({ ...s, interests: s.interests.includes(id) ? s.interests.filter((x) => x !== id) : [...s.interests, id] }))

  const finish = () => complete({ ...p, name: p.name.trim() || '사장', shopName: p.shopName.trim() })

  if (step < 3) {
    const s = SLIDES[step]
    return (
      <div className="pt-safe flex min-h-dvh flex-col bg-white">
        <div className="flex h-14 items-center justify-between px-5">
          <span className="text-[0.875rem] font-bold text-ink">
            {step + 1}
            <span className="text-mute">/3</span>
          </span>
          <button onClick={() => setStep(3)} className="text-[0.875rem] font-bold text-sub">
            건너뛰기
          </button>
        </div>
        <div key={step} className="flex flex-1 animate-slide-in flex-col justify-center px-6">
          <Illustration step={step} />
          <h1 className="mt-6 whitespace-pre-line text-center text-[1.75rem] font-extrabold leading-tight tracking-tight">{s.title}</h1>
          <p className="mx-auto mt-3 max-w-[320px] text-center text-[0.9375rem] leading-relaxed text-sub">{s.body}</p>
        </div>
        <div className="pb-safe-8 px-6">
          <div className="mb-6 flex justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <span key={i} className={cx('h-2 rounded-full transition-all', i === step ? 'w-8 bg-primary' : 'w-2 bg-line')} />
            ))}
          </div>
          <PrimaryButton onClick={() => setStep(step + 1)}>{step === 2 ? '시작하기' : '다음'}</PrimaryButton>
        </div>
      </div>
    )
  }

  const formStep = step - 3
  return (
    <div className="pt-safe flex min-h-dvh flex-col bg-bg">
      <div className="px-5 pt-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= formStep ? 'bg-primary' : 'bg-line')} />
          ))}
        </div>
        {formStep > 0 && (
          <button onClick={() => setStep(step - 1)} className="mt-4 text-[0.875rem] font-bold text-sub">
            ← 이전
          </button>
        )}
      </div>

      <div key={formStep} className="flex-1 animate-slide-in px-5 pb-6 pt-6">
        {formStep === 0 && (
          <>
            <h1 className="text-[1.625rem] font-extrabold leading-tight tracking-tight">
              반가워요!
              <br />
              어떻게 불러 드릴까요?
            </h1>
            <label className="mt-7 block">
              <span className="text-[0.8125rem] font-bold text-sub">이름 (호칭)</span>
              <input
                value={p.name}
                onChange={(e) => setP({ ...p, name: e.target.value })}
                placeholder="예: 김민지"
                maxLength={12}
                className="mt-2 h-14 w-full rounded-2xl bg-white px-4 text-[1rem] font-semibold shadow-card outline-none ring-primary placeholder:text-mute focus:ring-2"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[0.8125rem] font-bold text-sub">가게 이름 (선택)</span>
              <input
                value={p.shopName}
                onChange={(e) => setP({ ...p, shopName: e.target.value })}
                placeholder="예: 망원동 국밥집"
                maxLength={20}
                className="mt-2 h-14 w-full rounded-2xl bg-white px-4 text-[1rem] font-semibold shadow-card outline-none ring-primary placeholder:text-mute focus:ring-2"
              />
            </label>
            <p className="mt-7 text-[0.8125rem] font-bold text-sub">업종</p>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              {BIZ_TYPES.map((b) => {
                const on = p.bizType === b.id
                return (
                  <button
                    key={b.id}
                    onClick={() => setP({ ...p, bizType: b.id as BizType })}
                    aria-pressed={on}
                    className={cx(
                      'flex flex-col items-center gap-2 rounded-2xl py-4 text-[0.8125rem] font-bold transition',
                      on ? 'bg-primary text-white shadow-float' : 'bg-white text-ink shadow-card',
                    )}
                  >
                    <Icon name={b.icon} className="size-6" />
                    {b.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {formStep === 1 && (
          <>
            <h1 className="text-[1.625rem] font-extrabold leading-tight tracking-tight">
              요즘 가장
              <br />
              궁금한 분야는요?
            </h1>
            <p className="mt-2 text-[0.875rem] text-sub">여러 개 골라도 돼요. 추천에 먼저 보여 드려요.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((c) => {
                const on = p.interests.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleInterest(c.id)}
                    aria-pressed={on}
                    className={cx(
                      'relative flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left text-[0.875rem] font-bold shadow-card transition',
                      on && 'ring-2 ring-primary',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: c.soft, color: c.color }}>
                      <Icon name={c.icon} className="size-5" />
                    </span>
                    {c.name}
                    {on && (
                      <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-white">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="mt-8 text-[0.8125rem] font-bold text-sub">하루 학습 목표</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[3, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => setP({ ...p, dailyGoal: m })}
                  aria-pressed={p.dailyGoal === m}
                  className={cx(
                    'h-14 rounded-2xl text-[1rem] font-extrabold transition',
                    p.dailyGoal === m ? 'bg-primary text-white shadow-float' : 'bg-white text-ink shadow-card',
                  )}
                >
                  {m}분
                </button>
              ))}
            </div>
          </>
        )}

        {formStep === 2 && (
          <>
            <h1 className="text-[1.625rem] font-extrabold leading-tight tracking-tight">
              영업시간을
              <br />
              알려 주세요
            </h1>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-sub">
              오픈 전 · 점심시간 · 쉬는 시간 · 마감처럼 시간대를 나눠 업종에 맞는 할 일을 챙겨 드리고, 틈새 시간엔 짧은 학습과 도전을 추천해요.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <label className="rounded-2xl bg-white p-4 shadow-card">
                <span className="text-[0.8125rem] font-bold text-sub">오픈</span>
                <input
                  type="time"
                  value={p.openTime}
                  onChange={(e) => setP({ ...p, openTime: e.target.value || p.openTime })}
                  className="mt-1 block w-full bg-transparent text-[1.375rem] font-extrabold outline-none"
                />
              </label>
              <label className="rounded-2xl bg-white p-4 shadow-card">
                <span className="text-[0.8125rem] font-bold text-sub">마감</span>
                <input
                  type="time"
                  value={p.closeTime}
                  onChange={(e) => setP({ ...p, closeTime: e.target.value || p.closeTime })}
                  className="mt-1 block w-full bg-transparent text-[1.375rem] font-extrabold outline-none"
                />
              </label>
            </div>
            <div className="mt-6 rounded-2xl bg-primary-50 p-4 text-[0.8438rem] leading-relaxed text-primary-700">
              모든 기록은 이 기기에만 저장돼요. 마이 탭에서 언제든 바꿀 수 있어요.
            </div>
          </>
        )}
      </div>

      <div className="pb-safe-8 px-5">
        <PrimaryButton onClick={() => (formStep === 2 ? finish() : setStep(step + 1))} disabled={formStep === 1 && p.interests.length === 0}>
          {formStep === 2 ? '골목배움 시작하기' : '다음'}
        </PrimaryButton>
      </div>
    </div>
  )
}
