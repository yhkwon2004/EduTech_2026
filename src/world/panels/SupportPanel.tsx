import { useMemo, useState } from 'react'
import { Check, Lock, X } from 'lucide-react'
import { LESSON_MAP } from '@/data/courses'
import { todayKey } from '@/lib/date'
import { useGame } from '@/game/store'
import { useWorld, levelOf } from '../store'
import { GRANTS, LOAN, receiptsFor, type GrantDef } from '../support'
import { Card, Chip, cx, GameButton, Panel, Tabs, toast, won } from '../ui/kit'

type Tab = 'grant' | 'loan' | 'receipt'

function GrantQuiz({ grant, onBack, openLesson }: { grant: GrantDef; onBack: () => void; openLesson: (id: string) => void }) {
  const w = useWorld()
  const [k, setK] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [done, setDone] = useState<null | boolean>(null)
  const q = grant.questions[k]

  if (done !== null)
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-[2.5rem] leading-none">{done ? '🎊' : '📄'}</p>
          <p className="mt-1 text-[1.125rem] font-black">{done ? `선정! 지원금 ${won(grant.amount)}원` : '아쉽게도 서류 보완이 필요해요'}</p>
          <p className="text-[0.8125rem] font-semibold text-sub">{done ? '공고를 꼼꼼히 읽고 서류를 정확히 챙겼어요 · +30 EXP' : '관련 레슨을 듣고 다시 신청해 보세요. 횟수 제한은 없어요.'}</p>
          <div className="mt-3 flex justify-center gap-2">
            <GameButton tone="white" onClick={onBack}>
              목록으로
            </GameButton>
            {!done && LESSON_MAP[grant.lessonId] && (
              <GameButton tone="violet" onClick={() => openLesson(grant.lessonId)}>
                📘 {LESSON_MAP[grant.lessonId].title}
              </GameButton>
            )}
          </div>
        </div>
      </div>
    )

  return (
    <div className="grid h-full gap-3 md:grid-cols-2">
      <div className="rounded-2xl bg-gradient-to-br from-[#E8F6F3] to-[#CDEDE6] p-3.5">
        <p className="text-[0.6875rem] font-black text-teal">
          📑 {grant.title} · 심사 {k + 1}/{grant.questions.length}
        </p>
        <p className="mt-1 text-[1rem] font-black leading-snug">{q.q}</p>
        {picked !== null && (
          <p className={cx('mt-2 rounded-xl p-2 text-[0.8125rem] font-semibold', picked === q.answer ? 'bg-white/80 text-teal' : 'bg-coral-50 text-coral')}>
            {picked === q.answer ? '⭕ ' : '❌ '}
            {q.explain}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {q.options.map((o, i) => (
          <button
            key={i}
            disabled={picked !== null}
            onClick={() => {
              setPicked(i)
              if (i === q.answer) setRight(right + 1)
            }}
            className={cx(
              'rounded-2xl border-2 px-3 py-2.5 text-left text-[0.875rem] font-bold',
              picked === null ? 'border-black/10 bg-white active:scale-[0.98]' : i === q.answer ? 'border-teal bg-teal-50' : picked === i ? 'border-coral bg-coral-50' : 'border-black/5 bg-white opacity-60',
            )}
          >
            {o}
          </button>
        ))}
        {picked !== null && (
          <GameButton
            tone="green"
            className="mt-auto"
            onClick={() => {
              if (k < grant.questions.length - 1) {
                setK(k + 1)
                setPicked(null)
              } else {
                const pass = right === grant.questions.length
                if (pass) {
                  w.grant(grant.id, grant.amount)
                  toast(`지원금 +${won(grant.amount)}원!`, 'level')
                }
                setDone(pass)
              }
            }}
          >
            {k < grant.questions.length - 1 ? '다음' : '심사 결과 보기'}
          </GameButton>
        )}
      </div>
    </div>
  )
}

function GrantTab({ openLesson }: { openLesson: (id: string) => void }) {
  const w = useWorld()
  const started = useGame((s) => s.started)
  const level = levelOf(w.exp).level
  const [active, setActive] = useState<GrantDef | null>(null)
  if (active) return <GrantQuiz grant={active} onBack={() => setActive(null)} openLesson={openLesson} />
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {GRANTS.map((g) => {
        const got = w.grants.includes(g.id)
        const lockLv = level < g.level
        const lockShop = g.needShop && !started
        return (
          <Card key={g.id} className={cx('flex flex-col', (lockLv || lockShop) && 'opacity-70')}>
            <div className="flex items-start gap-2">
              <span className="text-[1.5rem]">📑</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-black">{g.title}</span>
                <span className="block text-[0.75rem] font-semibold text-sub">{g.desc}</span>
              </span>
              <Chip tone="green">{won(g.amount)}원</Chip>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold text-mute">심사: 공고 읽기·서류 퀴즈 {g.questions.length}문제</span>
              {got ? (
                <Chip tone="green">
                  <Check className="size-3" strokeWidth={3} /> 선정 완료
                </Chip>
              ) : lockLv ? (
                <Chip>
                  <Lock className="size-3" /> Lv{g.level}
                </Chip>
              ) : lockShop ? (
                <Chip>
                  <Lock className="size-3" /> 창업 후
                </Chip>
              ) : (
                <GameButton size="sm" tone="green" onClick={() => setActive(g)}>
                  신청하기
                </GameButton>
              )}
            </div>
          </Card>
        )
      })}
      <p className="col-span-full text-[0.6875rem] font-semibold text-mute">실제 지원사업은 기업마당·소상공인시장진흥공단·시·구청 공고에서 찾아요. 문의는 중소기업통합콜센터 1357.</p>
    </div>
  )
}

function LoanTab() {
  const w = useWorld()
  const daily = Math.round(w.loan * LOAN.dailyRate)
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <Card className="bg-gradient-to-br from-[#EEF4FF] to-[#DCE7FF]">
        <p className="text-[0.75rem] font-black text-primary">🏦 소상공인 정책자금 (게임 속 연습)</p>
        <p className="mt-1 text-[1.75rem] font-black leading-none">{won(w.loan)}원</p>
        <p className="text-[0.75rem] font-bold text-sub">
          빌린 돈 · 한도 {won(LOAN.max)}원 · 하루 이자 {(LOAN.dailyRate * 100).toFixed(2)}% {w.loan > 0 && `(오늘 약 ${daily.toLocaleString()}원)`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <GameButton
            tone="primary"
            disabled={w.loan + LOAN.unit > LOAN.max}
            onClick={() => {
              if (w.borrow(LOAN.unit)) toast(`${won(LOAN.unit)}원을 빌렸어요. 이자는 매일 자동으로 나가요`, 'info')
            }}
          >
            {won(LOAN.unit)}원 빌리기
          </GameButton>
          <GameButton
            tone="white"
            disabled={w.loan <= 0 || w.cash < Math.min(LOAN.unit, w.loan)}
            onClick={() => {
              if (w.repay(Math.min(LOAN.unit, w.loan))) toast('일부 갚았어요')
            }}
          >
            {won(Math.min(LOAN.unit, w.loan || LOAN.unit))}원 갚기
          </GameButton>
          {w.loan > 0 && (
            <GameButton
              tone="green"
              disabled={w.cash < w.loan}
              onClick={() => {
                if (w.repay(w.loan)) toast('대출을 모두 갚았어요! 👏')
              }}
            >
              전부 갚기
            </GameButton>
          )}
        </div>
      </Card>
      <Card>
        <p className="text-[0.875rem] font-black">💡 지원금과 정책자금은 달라요</p>
        <ul className="mt-1.5 space-y-1 text-[0.75rem] font-semibold text-ink/80">
          <li>• 지원금: 조건에 맞으면 받고 갚지 않는 돈 (심사 필요)</li>
          <li>• 정책자금: 낮은 금리로 빌리는 돈 — 꼭 갚아야 해요</li>
          <li>• 빌리기 전에 "하루 매출로 이자를 감당할 수 있나?" 계산해 보세요</li>
          <li>• "수수료 주면 대출 받아 줄게요"는 사기일 수 있어요. 공식 기관에 먼저 확인!</li>
        </ul>
      </Card>
    </div>
  )
}

function ReceiptTab({ openLesson }: { openLesson: (id: string) => void }) {
  const w = useWorld()
  const today = todayKey()
  const list = useMemo(() => receiptsFor(today), [today])
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => list.map(() => null))
  const [checked, setChecked] = useState(false)
  const filed = w.receiptsDay === today
  const right = list.filter((r, i) => answers[i] === r.qualified).length

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
      <div className="space-y-1.5">
        <p className="text-[0.8125rem] font-black">오늘 받은 영수증 4장 — 비용으로 인정받을 수 있는 증빙일까요?</p>
        {list.map((r, i) => (
          <div key={r.label} className={cx('rounded-2xl border-2 bg-white p-2.5', checked ? (answers[i] === r.qualified ? 'border-teal' : 'border-coral') : 'border-black/5')}>
            <div className="flex items-center gap-2">
              <span className="text-[1.25rem]">🧾</span>
              <span className="flex-1 text-[0.8125rem] font-black">{r.label}</span>
              {(
                [
                  [true, '증빙 O'],
                  [false, '증빙 X'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={label}
                  disabled={checked || filed}
                  onClick={() => setAnswers(answers.map((a, k) => (k === i ? v : a)))}
                  className={cx('h-8 rounded-xl px-2.5 text-[0.75rem] font-black', answers[i] === v ? (v ? 'bg-teal text-white' : 'bg-coral text-white') : 'bg-black/5')}
                >
                  {label}
                </button>
              ))}
            </div>
            {checked && (
              <p className={cx('mt-1 flex items-start gap-1 text-[0.6875rem] font-bold', answers[i] === r.qualified ? 'text-teal' : 'text-coral')}>
                {answers[i] === r.qualified ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />} {r.why}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Card className="text-center">
          {filed && !checked ? (
            <>
              <p className="text-[2rem] leading-none">🗂️</p>
              <p className="mt-1 text-[0.9375rem] font-black">오늘 정리 끝!</p>
              <p className="text-[0.75rem] font-semibold text-sub">내일 새 영수증이 와요.</p>
            </>
          ) : checked ? (
            <>
              <p className="text-[2rem] leading-none">{right === list.length ? '💯' : '📊'}</p>
              <p className="mt-1 text-[0.9375rem] font-black">
                {right}/{list.length} 정답
              </p>
              <p className="text-[0.75rem] font-semibold text-sub">절세 보너스 +{(right * 2500).toLocaleString()}원 · +15 EXP</p>
            </>
          ) : (
            <>
              <p className="text-[0.8125rem] font-bold text-sub">모두 고르고 장부에 정리해요</p>
              <GameButton
                tone="green"
                className="mt-2 w-full"
                disabled={answers.some((a) => a === null)}
                onClick={() => {
                  setChecked(true)
                  w.fileReceipts(right * 2500)
                  toast(`영수증 정리 ${right}/${list.length} · +${(right * 2500).toLocaleString()}원`)
                }}
              >
                장부에 정리하기
              </GameButton>
            </>
          )}
        </Card>
        <button onClick={() => openLesson('l-tax-2')} className="w-full rounded-2xl bg-teal-50 p-2.5 text-left text-[0.75rem] font-black text-teal">
          📘 증빙 레슨 듣기 — 적격증빙 4가지
        </button>
      </div>
    </div>
  )
}

export function SupportPanel({ onClose, openLesson }: { onClose: () => void; openLesson: (id: string) => void }) {
  const w = useWorld()
  const [tab, setTab] = useState<Tab>('grant')
  return (
    <Panel
      title="창업지원센터"
      icon="🏛️"
      color="#167F71"
      wide
      onClose={onClose}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'grant', label: '📑 지원사업' },
            { id: 'loan', label: '🏦 정책자금' },
            { id: 'receipt', label: '🧾 영수증 정리', badge: w.receiptsDay !== todayKey() ? 1 : 0 },
          ]}
        />
      }
    >
      {tab === 'grant' && <GrantTab openLesson={openLesson} />}
      {tab === 'loan' && <LoanTab />}
      {tab === 'receipt' && <ReceiptTab openLesson={openLesson} />}
    </Panel>
  )
}
