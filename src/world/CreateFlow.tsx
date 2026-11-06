import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SIDO, LEAGUE_NAME } from '@/game/data'
import { useWorld, type Avatar } from './store'
import { CharacterEditor } from './panels/CharacterPanel'
import { DEFAULT_AVATAR } from './avatar'
import { cx, GameButton, toast } from './ui/kit'
import type { Path } from './quests'

const STEPS = ['캐릭터', '우리 동네', '진로 선택']

/** 처음 시작: 타이틀 → 캐릭터 → 동네 → 진로(창업 / 입사) */
export function CreateFlow() {
  const create = useWorld((s) => s.create)
  const [step, setStep] = useState(-1)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<Avatar>({ ...DEFAULT_AVATAR })
  const [region, setRegion] = useState({ sido: '서울', gu: '마포구', dong: '망원동' })
  const [path, setPath] = useState<Path>('owner')

  if (step < 0)
    return (
      <div className="absolute inset-0 z-50 grid place-items-center bg-gradient-to-b from-[#0E2A5C]/30 via-transparent to-[#0E2A5C]/55">
        <div className="animate-pop text-center">
          <div className="relative mx-auto w-fit">
            <p className="text-[0.875rem] font-black tracking-[0.3em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">우리 동네 사업 성장기</p>
            <h1 className="title-logo mt-1 text-[3.25rem] font-black leading-none sm:text-[4rem]">골목 장사왕</h1>
            <span className="absolute -right-8 -top-4 rotate-12 text-[2.5rem]">👑</span>
          </div>
          <p className="mx-auto mt-3 max-w-[30rem] rounded-2xl bg-white/85 px-4 py-2 text-[0.875rem] font-bold text-ink shadow-lg backdrop-blur">
            🌾 텃밭을 일구고 · 🍳 상품을 만들고 · 🏪 가게를 열어 · 🏆 동네 최고 사장님에 도전!
            <br />
            <span className="text-[0.75rem] text-sub">일하는 틈틈이 3분 레슨으로 진짜 장사 노하우까지 배워요</span>
          </p>
          <GameButton size="lg" tone="sun" className="mt-4 px-10 text-[1.125rem]" onClick={() => setStep(0)}>
            ▶ 시작하기
          </GameButton>
        </div>
      </div>
    )

  const next = () => {
    if (step < 2) return setStep(step + 1)
    create({ name: name.trim() || '사장님', avatar, region: { sido: region.sido, gu: region.gu.trim() || '우리구', dong: region.dong.trim() || '우리동' }, path })
    toast(path === 'owner' ? `${name.trim() || '사장님'}, 환영해요! 게시판부터 둘러볼까요?` : `${name.trim() || '신입'}님, 환영해요! 게시판부터 둘러볼까요?`, 'level')
  }
  const canNext = step !== 0 || name.trim().length > 0

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#101233]/50 p-2 backdrop-blur-[3px] sm:p-3">
      <div className="flex h-full max-h-[33rem] w-full max-w-[52rem] animate-panel flex-col overflow-hidden rounded-[1.5rem] border-[3px] border-[#1B1D45]/80 bg-[#FFFDF7] shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 bg-gradient-to-r from-[#F25C54] to-[#F2A93B] px-3.5 py-2">
          <span className="text-[1.25rem]">👑</span>
          <h2 className="text-[1.0625rem] font-black text-white drop-shadow">새 이야기 시작</h2>
          <div className="ml-auto flex items-center gap-1">
            {STEPS.map((s, i) => (
              <span key={s} className={cx('rounded-full px-2.5 py-1 text-[0.6875rem] font-black', i === step ? 'bg-white text-ink' : i < step ? 'bg-white/40 text-white' : 'bg-black/15 text-white/80')}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {step === 0 && <CharacterEditor value={avatar} onChange={setAvatar} role={path === 'employee' ? 'employee' : 'owner'} name={name} onName={setName} />}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-[1fr_15rem]">
              <div>
                <p className="mb-1 text-[0.75rem] font-black text-sub">시·도</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIDO.map((s) => (
                    <button key={s} onClick={() => setRegion({ ...region, sido: s })} className={cx('h-9 min-w-12 rounded-xl px-2.5 text-[0.8125rem] font-black', region.sido === s ? 'bg-ink text-white' : 'bg-black/5')}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[0.75rem] font-black text-sub">시·군·구</span>
                    <input value={region.gu} onChange={(e) => setRegion({ ...region, gu: e.target.value })} maxLength={8} className="mt-1 h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 font-black outline-none focus:border-primary" />
                  </label>
                  <label className="block">
                    <span className="text-[0.75rem] font-black text-sub">동·읍·면</span>
                    <input value={region.dong} onChange={(e) => setRegion({ ...region, dong: e.target.value })} maxLength={8} className="mt-1 h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 font-black outline-none focus:border-primary" />
                  </label>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-b from-[#FFF6DA] to-[#FFE9A8] p-3">
                <p className="text-[0.8125rem] font-black">🏆 내가 도전할 리그</p>
                {[0, 1, 2].map((t) => (
                  <div key={t} className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/80 px-2.5 py-1.5">
                    <span className="text-[1.125rem]">{['🏘️', '🏙️', '👑'][t]}</span>
                    <span className="text-[0.75rem] font-black">{LEAGUE_NAME(t, { sido: region.sido, gu: region.gu || '우리구', dong: region.dong || '우리동' })}</span>
                  </div>
                ))}
                <p className="mt-2 text-[0.6875rem] font-semibold text-ink/70">7일 시즌마다 TOP 3는 다음 리그로! 끝까지 오르면 {region.sido} 최고 소상공인이에요.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid h-full gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'owner' as Path,
                    emoji: '🏪',
                    title: '바로 창업하기',
                    tag: '사장님 루트',
                    color: 'from-[#FFE8E5] to-[#FFC9C2]',
                    lines: ['창업 자금 300만 원으로 내 가게 오픈', '판매할 상품·가격·레시피를 직접 정해요', '텃밭·공방에서 만들고 동네 리그에서 경쟁', '레슨을 들을수록 가게가 강해져요'],
                  },
                  {
                    id: 'employee' as Path,
                    emoji: '🏢',
                    title: '골목상사 입사하기',
                    tag: '직장인 루트',
                    color: 'from-[#E5EEFF] to-[#C7D8FF]',
                    lines: ['마케팅·생산·영업·재무·인사·CS 중 직무 선택', '매일 업무 상황을 해결하고 일급을 받아요', '실적 + 직무 레슨으로 인턴 → 팀장 승진', '돈과 경험이 모이면 퇴사하고 창업!'],
                  },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setPath(o.id)}
                  className={cx('flex flex-col rounded-3xl border-[3px] bg-gradient-to-br p-3.5 text-left transition', o.color, path === o.id ? 'border-ink shadow-lg' : 'border-transparent opacity-80')}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[2.25rem] leading-none">{o.emoji}</span>
                    <span>
                      <span className="block text-[0.6875rem] font-black text-sub">{o.tag}</span>
                      <span className="block text-[1.125rem] font-black">{o.title}</span>
                    </span>
                    {path === o.id && <span className="ml-auto grid size-7 place-items-center rounded-full bg-ink text-[0.875rem] font-black text-white">✓</span>}
                  </span>
                  <ul className="mt-2 space-y-1">
                    {o.lines.map((l) => (
                      <li key={l} className="text-[0.8125rem] font-bold text-ink/80">
                        • {l}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t-2 border-black/5 bg-white/70 px-3 py-2">
          <GameButton tone="white" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="size-4" /> 이전
          </GameButton>
          <span className="hidden text-[0.75rem] font-semibold text-sub sm:block">{step === 2 ? '진로는 나중에 바꿀 수 있어요 (입사 ↔ 창업)' : '언제든 설정에서 바꿀 수 있어요'}</span>
          <GameButton tone={step === 2 ? 'coral' : 'primary'} disabled={!canNext} onClick={next}>
            {step === 2 ? '마을로 출발!' : '다음'} <ArrowRight className="size-4" />
          </GameButton>
        </div>
      </div>
    </div>
  )
}
