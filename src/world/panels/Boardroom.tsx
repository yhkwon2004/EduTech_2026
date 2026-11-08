import { useEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import { Send, UserMinus, UserPlus } from 'lucide-react'
import { useApp } from '@/store/app'
import { useWorld } from '../store'
import { useCompany } from '../companyStore'
import { DEPTS, DEPT_MAP, companyLevel, costMul, dailySalary, qualityStars, researchSpeed, salesMul, marketingMul, staffSpeed, type DeptId } from '../company'
import { offlineAdvice, type ChatTurn } from '../ai'
import { toLook, type Look } from '../avatar'
import { sfx } from '../audio'
import { fxAt } from '../fx'
import { emote } from '../emote'
import { Bar, Card, Chip, cx, GameButton, toast, won } from '../ui/kit'
import { PixelBuddy } from './LearnGame'

/** 부서장 얼굴 (도트) */
const HEAD_LOOK: Record<DeptId, Look> = {
  production: toLook({ hair: 5, hairColor: '#2E211B', skin: '#DDA67E', eyes: 3, brows: 1, mouth: 0, hat: 3, top: 2, outfit: '#E9EEF6', bottomColor: '#2E3248', eyeColor: '#6B4226' }, 'employee'),
  rnd: toLook({ hair: 1, hairColor: '#151317', skin: '#FFE6D2', eyes: 1, mouth: 0, glasses: 1, top: 2, outfit: '#FFFFFF', bottomColor: '#34385A', eyeColor: '#8E6BBF' }, 'employee'),
  sales: toLook({ hair: 0, hairColor: '#6B3F24', skin: '#F2C29B', eyes: 2, mouth: 1, top: 2, outfit: '#D9E8FF', bottomColor: '#2E3248', eyeColor: '#3E86D6' }, 'employee'),
  marketing: toLook({ hair: 3, hairColor: '#A8683A', skin: '#FFD9B8', eyes: 1, mouth: 1, blush: true, top: 3, outfit: '#E86FA0', bottomColor: '#34385A', eyeColor: '#D9433D' }, 'employee'),
  finance: toLook({ hair: 7, hairColor: '#151317', skin: '#DDA67E', eyes: 3, brows: 1, mouth: 3, glasses: 2, top: 2, outfit: '#FFFFFF', bottomColor: '#2E2A33', eyeColor: '#2A2238' }, 'employee'),
}

/** 회의 기록 (세션 동안) */
const useChats = create<{ chats: Record<DeptId, ChatTurn[]>; push: (d: DeptId, t: ChatTurn) => void }>((set, get) => ({
  chats: { production: [], rnd: [], sales: [], marketing: [], finance: [] },
  push: (d, t) => set({ chats: { ...get().chats, [d]: [...get().chats[d].slice(-30), t] } }),
}))

const QUICK: Record<DeptId, string[]> = {
  production: ['지금 뭘 만들면 좋아요?', '끝난 라인 다 꺼내고 원료 되는 걸로 채워 주세요', '원료 부족한 거 사다 채워 주세요'],
  rnd: ['다음 연구 뭐가 좋아요?', '지금 할 수 있는 연구 중 제일 좋은 걸 시작해 주세요', '레벨업하면 뭐가 열려요?'],
  sales: ['채울 수 있는 주문 다 납품해 주세요', '오늘 매출 어떻게 올릴까요?', '재고 전부 직판해 주세요'],
  marketing: ['어떤 제품을 밀어야 해요?', '이벤트 시즌 준비 뭐 해요?', '회사 이름 멋진 걸로 바꿔 주세요'],
  finance: ['현금 흐름 괜찮아요?', '직원 더 뽑아도 돼요?', '남는 돈으로 뭘 할까요?'],
}

export function BoardroomTab({ openSettings }: { openSettings: () => void }) {
  const apiKey = useApp((s) => s.settings.aiKey)
  const model = useApp((s) => s.settings.aiModel)
  const [dept, setDept] = useState<DeptId>('production')
  const chats = useChats((s) => s.chats)
  const push = useChats((s) => s.push)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroll = useRef<HTMLDivElement>(null)
  const log = useCompany((s) => s.log)
  const d = DEPT_MAP[dept]
  const thread = chats[dept]
  const abort = useRef<AbortController | null>(null)
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' })
  }, [thread.length, busy, dept])
  useEffect(() => () => abort.current?.abort(), [])

  const send = async (text: string) => {
    const msg = text.trim()
    if (!msg || busy) return
    setInput('')
    push(dept, { role: 'user', text: msg, at: Date.now() })
    sfx('pop')
    if (!apiKey) {
      push(dept, { role: 'assistant', text: offlineAdvice(dept) + '\n\n(설정에서 Anthropic API 키를 연결하면 요청대로 직접 실행도 해 줘요)', at: Date.now() })
      return
    }
    setBusy(true)
    abort.current = new AbortController()
    try {
      const { askAdvisor } = await import('../aiClient')
      const r = await askAdvisor(dept, thread, msg, { apiKey, model, signal: abort.current.signal })
      push(dept, { role: 'assistant', text: r.text, actions: r.actions, at: Date.now() })
      if (r.actions.length) {
        sfx('correct')
        emote('nod', d.emoji)
      } else sfx('page')
    } catch (e) {
      const err = e as { status?: number; message?: string; name?: string }
      const why =
        err.name === 'AbortError'
          ? '중단했어요'
          : err.status === 401
            ? 'API 키가 올바르지 않아요. 설정에서 다시 확인해 주세요.'
            : err.status === 429
              ? '요청이 너무 많아요. 잠시 뒤에 다시 해 주세요.'
              : err.status === 400 && /model/i.test(err.message ?? '')
                ? '이 모델을 쓸 수 없어요. 설정에서 다른 모델을 골라 주세요.'
                : `연결에 문제가 있어요 (${err.status ?? err.name ?? '오류'}).`
      push(dept, { role: 'assistant', text: `⚠️ ${why}\n\n${offlineAdvice(dept)}`, at: Date.now() })
      sfx('wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-3 md:grid-cols-[9.5rem_1fr_12rem]">
      {/* 부서장 */}
      <div className="flex min-h-0 flex-row gap-1 overflow-x-auto md:flex-col md:overflow-y-auto">
        {DEPTS.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              sfx('tap')
              setDept(x.id)
            }}
            className={cx('flex shrink-0 items-center gap-1.5 rounded-2xl border-2 px-1.5 py-1 text-left transition', dept === x.id ? 'border-[#5B6BBF] bg-[#EEF1FF]' : 'border-black/5 bg-white')}
          >
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#E9ECF5]">
              <PixelBuddy look={HEAD_LOOK[x.id]} size={30} yaw={26} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.75rem] font-black">
                {x.emoji} {x.name}
              </span>
              <span className="block truncate text-[0.625rem] font-bold text-sub">
                {x.head} {x.title}
              </span>
            </span>
          </button>
        ))}
        <p className="hidden text-[0.625rem] font-semibold text-mute md:block">{apiKey ? '🤖 Claude 연결됨' : '🔌 키 없음: 기본 조언만'}</p>
        {!apiKey && (
          <GameButton size="sm" tone="violet" onClick={openSettings} className="hidden md:inline-flex">
            AI 연결하기
          </GameButton>
        )}
      </div>

      {/* 대화 */}
      <div className="flex min-h-0 flex-col rounded-2xl border-2 border-black/5 bg-[#F6F7FB]">
        <div className="flex items-center gap-2 border-b-2 border-black/5 bg-white px-3 py-1.5">
          <PixelBuddy look={HEAD_LOOK[dept]} size={30} yaw={26} act={busy ? 'nod' : null} expr={busy ? 'talk' : null} />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.8125rem] font-black">
              {d.head} {d.title}
            </span>
            <span className="block truncate text-[0.625rem] font-bold text-sub">{d.perk}</span>
          </span>
          {busy && (
            <GameButton size="sm" tone="white" onClick={() => abort.current?.abort()}>
              중단
            </GameButton>
          )}
        </div>
        <div ref={scroll} className="thin-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
          {thread.length === 0 && (
            <div className="rounded-2xl bg-white p-2.5 text-[0.75rem] font-semibold text-sub">
              <p className="font-black text-ink">
                {d.emoji} {d.head}: CEO님, 무엇을 도와드릴까요?
              </p>
              <p className="mt-0.5">{offlineAdvice(dept).split(': ').slice(1).join(': ')}</p>
            </div>
          )}
          {thread.map((t, i) => (
            <div key={i} className={cx('flex', t.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[85%] rounded-2xl px-2.5 py-1.5 text-[0.8125rem] font-semibold', t.role === 'user' ? 'bg-primary text-white' : 'bg-white text-ink shadow-sm')}>
                <p className="whitespace-pre-wrap">{t.text}</p>
                {t.actions && t.actions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.actions.map((a, k) => (
                      <span key={k} className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[0.625rem] font-black text-teal">
                        ✅ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-3 py-1.5 text-[0.8125rem] font-black text-sub shadow-sm">
                <span className="blink">● ● ●</span> 생각 중…
              </div>
            </div>
          )}
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-1">
          {QUICK[dept].map((q) => (
            <button
              key={q}
              disabled={busy}
              onClick={() => send(q)}
              className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.625rem] font-black text-primary ring-1 ring-primary/20 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-1.5 border-t-2 border-black/5 bg-white p-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`${d.head} ${d.title}에게 요청하기`}
            maxLength={300}
            disabled={busy}
            className="h-9 min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-white px-2 text-[0.8125rem] font-bold outline-none focus:border-primary"
          />
          <GameButton size="sm" type="submit" disabled={!input.trim() || busy}>
            <Send className="size-4" />
          </GameButton>
        </form>
      </div>

      {/* 실행 기록 */}
      <div className="hidden min-h-0 flex-col md:flex">
        <p className="mb-1 text-[0.75rem] font-black">📋 회사 일지</p>
        <div className="thin-scroll min-h-0 flex-1 space-y-1 overflow-y-auto">
          {log.length === 0 && <p className="text-[0.6875rem] font-semibold text-mute">직원·경영진이 한 일이 여기에 쌓여요.</p>}
          {[...log].reverse().map((l, i) => (
            <p
              key={i}
              className={cx('rounded-xl px-2 py-1 text-[0.6875rem] font-bold', l.who === 'ai' ? 'bg-[#EEF1FF] text-[#2E3B8A]' : l.who === 'auto' ? 'bg-teal-50 text-teal' : 'bg-white text-ink/80')}
            >
              {l.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────── 직원 · 재무 ───────── */
export function StaffTab() {
  const c = useCompany()
  const cash = useWorld((s) => s.cash)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const salary = dailySalary(c.staff)
  const ledger = useMemo(() => [...c.ledger].slice(-7), [c.ledger])
  const total = ledger.reduce((a, l) => ({ revenue: a.revenue + l.revenue, salary: a.salary + l.salary, spend: a.spend + l.spend }), { revenue: 0, salary: 0, spend: 0 })
  const lv = companyLevel(c.xp)
  const hire = (id: DeptId) => {
    if (!c.hire(id)) return toast('고용할 수 없어요 (정원이나 돈)', 'bad')
    sfx('coin')
    fxAt(refs.current[id], 'burst', { emoji: DEPT_MAP[id].emoji, n: 8 })
    emote('wave', '🤝')
  }
  return (
    <div className="grid h-full min-h-0 gap-3 md:grid-cols-[1fr_15rem]">
      <div className="thin-scroll min-h-0 space-y-1.5 overflow-y-auto">
        {DEPTS.map((d) => {
          const n = c.staff[d.id] ?? 0
          return (
            <div key={d.id} ref={(el) => void (refs.current[d.id] = el)} className="flex items-center gap-2 rounded-2xl border-2 border-black/5 bg-white p-2">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#E9ECF5]">
                <PixelBuddy look={HEAD_LOOK[d.id]} size={34} yaw={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[0.8125rem] font-black">
                  {d.emoji} {d.name}
                  <span className="rounded-full bg-black/5 px-1.5 text-[0.625rem] text-sub">일급 {d.salary.toLocaleString()}원</span>
                </span>
                <span className="block text-[0.625rem] font-semibold text-sub">{d.perk}</span>
                <span className="mt-0.5 flex gap-0.5">
                  {Array.from({ length: d.max }, (_, k) => (
                    <span key={k} className={cx('text-[0.875rem]', k < n ? '' : 'opacity-20 grayscale')}>
                      🧑‍💼
                    </span>
                  ))}
                </span>
              </span>
              <div className="flex flex-col gap-1">
                <GameButton size="sm" tone={n < d.max && cash >= d.salary * 3 ? 'green' : 'white'} disabled={n >= d.max || cash < d.salary * 3} onClick={() => hire(d.id)}>
                  <UserPlus className="size-3.5" /> 고용 {won(d.salary * 3)}
                </GameButton>
                <GameButton size="sm" tone="white" disabled={n <= 0} onClick={() => c.fire(d.id) && (sfx('close'), toast(`${d.name} 1명이 퇴사했어요`, 'info'))}>
                  <UserMinus className="size-3.5" /> 퇴사
                </GameButton>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex min-h-0 flex-col gap-2">
        <Card className="p-2.5">
          <p className="text-[0.75rem] font-black">💼 재무 (최근 {ledger.length}일)</p>
          <div className="mt-1 space-y-0.5 text-[0.6875rem] font-bold">
            <p className="flex justify-between">
              <span className="text-sub">매출</span>
              <span className="text-teal">+{total.revenue.toLocaleString()}원</span>
            </p>
            <p className="flex justify-between">
              <span className="text-sub">월급</span>
              <span className="text-coral">-{total.salary.toLocaleString()}원</span>
            </p>
            <p className="flex justify-between">
              <span className="text-sub">연구·증설·원료·고용</span>
              <span className="text-coral">-{total.spend.toLocaleString()}원</span>
            </p>
            <p className="flex justify-between border-t border-black/10 pt-0.5 text-[0.75rem] font-black">
              <span>순이익</span>
              <span className={total.revenue - total.salary - total.spend >= 0 ? 'text-teal' : 'text-coral'}>{(total.revenue - total.salary - total.spend).toLocaleString()}원</span>
            </p>
          </div>
          <div className="mt-1.5 flex h-10 items-end gap-0.5">
            {ledger.map((l) => {
              const max = Math.max(1, ...ledger.map((x) => Math.max(x.revenue, x.salary + x.spend)))
              return (
                <span key={l.date} className="flex flex-1 items-end gap-px" title={l.date}>
                  <span className="flex-1 rounded-t bg-teal" style={{ height: `${(l.revenue / max) * 100}%` }} />
                  <span className="flex-1 rounded-t bg-coral" style={{ height: `${((l.salary + l.spend) / max) * 100}%` }} />
                </span>
              )
            })}
          </div>
        </Card>
        <Card className="p-2.5 text-[0.6875rem] font-bold">
          <p className="text-[0.75rem] font-black">📊 직원 효과</p>
          <p className="flex justify-between">
            <span className="text-sub">하루 월급</span>
            <span>{salary.toLocaleString()}원</span>
          </p>
          <p className="flex justify-between">
            <span className="text-sub">생산 속도</span>
            <span>×{staffSpeed(c.staff).toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-sub">연구 속도</span>
            <span>×{researchSpeed(c.staff).toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-sub">납품 단가 / 직판</span>
            <span>
              ×{salesMul(c.staff).toFixed(2)} / ×{marketingMul(c.staff).toFixed(2)}
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-sub">연구·증설 비용</span>
            <span>×{costMul(c.staff).toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-sub">품질</span>
            <span>{'★'.repeat(qualityStars(c.done, c.staff))}</span>
          </p>
          <Bar value={lv.progress} color="bg-[#5B6BBF]" className="mt-1.5" />
          <p className="mt-0.5 text-[0.625rem] text-mute">
            회사 Lv.{lv.level} · 고용 1명당 +20 XP <Chip>매일 자정 월급</Chip>
          </p>
        </Card>
      </div>
    </div>
  )
}
