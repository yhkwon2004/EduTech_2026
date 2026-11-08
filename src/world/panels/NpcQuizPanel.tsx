import { useMemo, useRef, useState } from 'react'
import { useApp } from '@/store/app'
import { todayKey } from '@/lib/date'
import { LESSON_MAP } from '@/data/courses'
import { VILLAGERS } from '../avatar'
import { makeOxQuiz, npcQuizLeft, NPC_QUIZ_DAILY } from '../learn'
import { useWorld } from '../store'
import { sfx } from '../audio'
import { fxAt } from '../fx'
import { emote } from '../emote'
import { cx, GameButton, Panel } from '../ui/kit'
import { PixelBuddy } from './LearnGame'

const ASK = ['사장님, 이거 알아요?', '잠깐! 퀴즈 하나 낼게요', '어제 배운 건데 헷갈려서요…', '맞는 말일까요? 🤔']

export function NpcQuizPanel({ villager, onClose, openLesson }: { villager: number; onClose: () => void; openLesson: (id: string) => void }) {
  const v = VILLAGERS[villager % VILLAGERS.length]
  const progress = useApp((s) => s.progress)
  const left = useApp((s) => npcQuizLeft(s.npcQuiz, todayKey()))
  const quiz = useMemo(() => makeOxQuiz(progress, `${todayKey()}:${villager}:${Date.now()}`), [])
  const ask = useMemo(() => ASK[Math.floor(Math.random() * ASK.length)], [])
  const [picked, setPicked] = useState<boolean | null>(null)
  const btns = useRef<Record<string, HTMLButtonElement | null>>({})
  const right = picked !== null && picked === quiz.truth

  const answer = (o: boolean) => {
    if (picked !== null) return
    setPicked(o)
    const ok = o === quiz.truth
    useApp.getState().npcQuizSolved()
    const w = useWorld.getState()
    if (ok) {
      sfx('correct')
      fxAt(btns.current[String(o)], 'burst', { n: 14 })
      window.setTimeout(() => fxAt(btns.current[String(o)], { float: '정답!', color: '#8CF2A6' }, { big: true }), 200)
      w.addCash(500)
      w.addExp(5)
      emote('cheer', '💡')
    } else {
      sfx('wrong')
      w.addExp(1)
      emote('nod', '📚')
    }
  }

  return (
    <Panel title={`${v.name} · ${v.job}`} icon="❓" color="#E8A33A" onClose={onClose}>
      <div className="grid h-full gap-3 sm:grid-cols-[9.5rem_1fr]">
        <div className="flex flex-col items-center justify-end rounded-2xl bg-gradient-to-b from-[#FFF4D6] to-[#FFE3A3] p-2">
          <div key={String(picked)} className="relative mb-1 w-full animate-pop rounded-2xl border-2 border-[#4A3426]/70 bg-white px-2 py-1.5 text-center text-[0.75rem] font-black leading-snug">
            {picked === null ? ask : right ? '오! 맞아요 고마워요 🙌' : '아하, 그렇구나! 같이 배웠네요'}
            <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#4A3426]/70 bg-white" />
          </div>
          <PixelBuddy look={v.look} act={picked === null ? null : right ? 'cheer' : 'nod'} expr={picked === null ? 'talk' : right ? 'happy' : 'surprised'} yaw={-30} size={78} />
          <p className="mt-1 text-[0.625rem] font-black text-[#B7860B]">
            오늘 동네 퀴즈 {NPC_QUIZ_DAILY - left}/{NPC_QUIZ_DAILY}
          </p>
        </div>
        <div className="flex min-h-0 flex-col gap-2">
          <div className="rounded-2xl border-2 border-black/5 bg-white p-3 shadow-sm">
            <p className="text-[0.6875rem] font-black text-sub">OX 퀴즈 · {LESSON_MAP[quiz.lessonId]?.title}</p>
            <p className="mt-0.5 text-[0.9375rem] font-black leading-snug">{quiz.q}</p>
            <p className="mt-1.5 rounded-xl bg-[#FFF8E1] px-2.5 py-2 text-[0.9375rem] font-black text-[#7A5600]">“{quiz.claim}”</p>
            <p className="mt-1 text-[0.6875rem] font-bold text-sub">이 답이 맞으면 O, 틀리면 X!</p>
          </div>
          {picked === null ? (
            <div className="grid flex-1 grid-cols-2 gap-2">
              {[true, false].map((o) => (
                <button
                  key={String(o)}
                  ref={(el) => void (btns.current[String(o)] = el)}
                  onClick={() => answer(o)}
                  className={cx(
                    'btn-game grid min-h-[4.5rem] place-items-center rounded-2xl border-b-[4px] text-[2.5rem] font-black text-white',
                    o ? 'border-[#1F6FB8] bg-gradient-to-b from-[#62B4FF] to-[#2E86DE]' : 'border-[#B8322B] bg-gradient-to-b from-[#FF8A80] to-coral',
                  )}
                  aria-label={o ? '맞아요 (O)' : '아니에요 (X)'}
                >
                  {o ? 'O' : 'X'}
                </button>
              ))}
            </div>
          ) : (
            <div className={cx('animate-pop rounded-2xl p-3', right ? 'bg-teal-50' : 'bg-coral-50')}>
              <p className={cx('text-[1rem] font-black', right ? 'text-teal' : 'text-coral')}>{right ? '⭕ 정답! +500원 · +5 EXP' : `❌ 정답은 ${quiz.truth ? 'O' : 'X'}예요 · +1 EXP`}</p>
              {!quiz.truth && <p className="mt-0.5 text-[0.8125rem] font-black">맞는 답: {quiz.correctText}</p>}
              <p className="mt-0.5 text-[0.8125rem] font-semibold text-ink/80">{quiz.explain}</p>
              <div className="mt-2 flex gap-2">
                <GameButton size="sm" tone="white" onClick={() => openLesson(quiz.lessonId)}>
                  📘 관련 레슨
                </GameButton>
                <GameButton size="sm" tone="green" className="flex-1" onClick={onClose}>
                  고마워요! 👋
                </GameButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
