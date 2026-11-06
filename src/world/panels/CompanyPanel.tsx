import { useMemo, useState } from 'react'
import { Briefcase, Check, ChevronRight, LogOut, Repeat, TrendingUp } from 'lucide-react'
import { CATEGORY_MAP } from '@/data/categories'
import { LESSON_MAP } from '@/data/courses'
import { todayKey } from '@/lib/date'
import { useGame } from '@/game/store'
import { useWorld } from '../store'
import { JOBS, JOB_MAP, RANKS, canPromote, colleagues, tasksFor, workResult, type JobId } from '../jobs'
import { roleLessons } from '../actions'
import { Bar, Card, Chip, cx, GameButton, Panel, Tabs, toast, won } from '../ui/kit'
import { CAT_EMOJI } from './AcademyPanel'

type Tab = 'work' | 'career' | 'team'
const WORK_ENERGY = 3

/** 직무 고르기 (입사 지원) */
function JobPicker({ onPick, current, practice }: { onPick: (id: JobId) => void; current?: JobId; practice?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {JOBS.map((j) => {
        const cat = CATEGORY_MAP[j.category]
        return (
          <Card key={j.id} className={cx('flex flex-col', current === j.id && 'ring-2 ring-primary')}>
            <div className="flex items-center gap-2">
              <span className="grid size-11 place-items-center rounded-2xl text-[1.5rem]" style={{ background: cat.soft }}>
                {j.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-black">{j.name}</span>
                <span className="block text-[0.6875rem] font-bold" style={{ color: cat.color }}>
                  {CAT_EMOJI[j.category]} 배움 분야: {cat.short}
                </span>
              </span>
            </div>
            <p className="mt-1.5 flex-1 text-[0.75rem] font-semibold text-sub">{j.desc}</p>
            <p className="mt-1 text-[0.6875rem] font-bold text-ink/70">익히는 기술 · {j.skills}</p>
            <GameButton size="sm" className="mt-2" tone={current === j.id ? 'white' : 'primary'} disabled={current === j.id} onClick={() => onPick(j.id)}>
              {current === j.id ? '지금 부서' : practice ? '직무 체험하기' : current ? '이 부서로 이동' : '입사 지원'}
            </GameButton>
          </Card>
        )
      })}
    </div>
  )
}

/** 하루 업무 — 상황 3개를 해결하면 실적과 일급 */
function WorkDay({ job, rank, practice, onDone, openLesson }: { job: JobId; rank: number; practice?: boolean; onDone: (scores: number[]) => void; openLesson: (id: string) => void }) {
  const tasks = useMemo(() => tasksFor(job, todayKey()), [job])
  const [k, setK] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const t = tasks[k]
  const opt = picked !== null ? t.options[picked] : null

  return (
    <div className="grid h-full gap-3 md:grid-cols-[1fr_1fr]">
      <div className="flex flex-col rounded-2xl bg-gradient-to-br from-[#EAF1FF] to-[#D6E4FF] p-3.5">
        <div className="flex items-center gap-1.5">
          <Chip tone="blue">
            {JOB_MAP[job].emoji} {practice ? '직무 체험' : `${RANKS[rank].name} 업무`} {k + 1}/{tasks.length}
          </Chip>
          <span className="ml-auto flex gap-1">
            {tasks.map((_, i) => (
              <span key={i} className={cx('size-2 rounded-full', i < scores.length ? (scores[i] >= 80 ? 'bg-teal' : 'bg-coral') : i === k ? 'bg-primary' : 'bg-black/15')} />
            ))}
          </span>
        </div>
        <p className="mt-2 text-[1rem] font-black leading-snug">{t.q}</p>
        {opt && (
          <div className={cx('mt-auto rounded-xl p-2.5 text-[0.8125rem] font-semibold', opt.score >= 80 ? 'bg-teal-50 text-teal' : opt.score >= 40 ? 'bg-sun-50 text-[#8A6508]' : 'bg-coral-50 text-coral')}>
            <p className="font-black">{opt.score >= 80 ? '👏 훌륭해요!' : opt.score >= 40 ? '🙂 나쁘지 않아요' : '😥 아쉬워요'} · 실적 {opt.score}점</p>
            <p>{opt.feedback}</p>
            {t.lessonId && LESSON_MAP[t.lessonId] && (
              <button onClick={() => openLesson(t.lessonId!)} className="mt-1 text-[0.75rem] font-black text-primary">
                📘 관련 레슨: {LESSON_MAP[t.lessonId].title}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {t.options.map((o, i) => {
          const show = picked !== null
          const best = o.score === Math.max(...t.options.map((x) => x.score))
          return (
            <button
              key={i}
              disabled={show}
              onClick={() => {
                setPicked(i)
                setScores([...scores, o.score])
              }}
              className={cx(
                'rounded-2xl border-2 px-3 py-2.5 text-left text-[0.875rem] font-bold transition',
                !show && 'border-black/10 bg-white active:scale-[0.98]',
                show && best && 'border-teal bg-teal-50',
                show && !best && picked === i && 'border-coral bg-coral-50',
                show && !best && picked !== i && 'border-black/5 bg-white opacity-60',
              )}
            >
              {o.label}
            </button>
          )
        })}
        {picked !== null && (
          <GameButton
            tone="green"
            className="mt-auto"
            onClick={() => {
              if (k < tasks.length - 1) {
                setK(k + 1)
                setPicked(null)
              } else onDone(scores)
            }}
          >
            {k < tasks.length - 1 ? '다음 업무' : practice ? '체험 끝내기' : '퇴근하기'} <ChevronRight className="size-4" />
          </GameButton>
        )}
      </div>
    </div>
  )
}

function WorkTab({ openLesson }: { openLesson: (id: string) => void }) {
  const w = useWorld()
  const job = w.job!
  const today = todayKey()
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<{ perf: number; pay: number } | null>(null)
  const worked = job.lastWork === today && !w.fast
  const rl = roleLessons()

  if (working)
    return (
      <WorkDay
        job={job.id}
        rank={job.rank}
        openLesson={openLesson}
        onDone={(scores) => {
          const r = workResult(scores, job.rank, rl)
          useWorld.getState().recordWork(r.perf, r.pay)
          setResult(r)
          setWorking(false)
          toast(`퇴근! 일급 +${won(r.pay)}원 · 실적 +${r.perf} · +15 EXP`)
        }}
      />
    )

  const next = RANKS[job.rank + 1]
  const todayLog = job.history.filter((h) => h.date === today)
  return (
    <div className="grid h-full gap-3 md:grid-cols-[1fr_15rem]">
      <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#F2F6FF] to-[#E3EBFF] p-4 text-center">
        {result ? (
          <>
            <p className="text-[2.5rem] leading-none">{result.perf >= 80 ? '🏅' : result.perf >= 50 ? '👍' : '📝'}</p>
            <p className="mt-1 text-[1.125rem] font-black">오늘 업무 끝! 실적 {result.perf}점</p>
            <p className="text-[0.875rem] font-bold text-sub">일급 {result.pay.toLocaleString()}원이 들어왔어요</p>
            <p className="mt-1 text-[0.75rem] font-semibold text-sub">직무 레슨을 들으면 실적 보너스가 붙어요 (지금 +{Math.min(20, rl * 5)}%)</p>
          </>
        ) : worked ? (
          <>
            <p className="text-[2.5rem] leading-none">🌙</p>
            <p className="mt-1 text-[1.0625rem] font-black">오늘은 퇴근했어요</p>
            <p className="text-[0.8125rem] font-semibold text-sub">
              오늘 실적 {todayLog.reduce((s, h) => s + h.perf, 0)}점 · 일급 {won(todayLog.reduce((s, h) => s + h.pay, 0))}원
            </p>
            <p className="mt-1 text-[0.75rem] font-semibold text-sub">남는 시간엔 텃밭 부업이나 배움터 레슨으로 승진 준비를 해 보세요.</p>
          </>
        ) : (
          <>
            <p className="text-[2.5rem] leading-none">{JOB_MAP[job.id].emoji}</p>
            <p className="mt-1 text-[1.0625rem] font-black">
              {JOB_MAP[job.id].name} {RANKS[job.rank].name} — 오늘 업무 3건
            </p>
            <p className="text-[0.8125rem] font-semibold text-sub">상황을 읽고 가장 좋은 방법을 골라요. 맞힐수록 실적과 일급이 올라요.</p>
            <GameButton
              size="lg"
              tone="primary"
              className="mt-3"
              onClick={() => {
                if (!useWorld.getState().spend(WORK_ENERGY)) return toast('체력이 부족해요. 레슨을 들으면 체력이 회복돼요', 'bad')
                setWorking(true)
              }}
            >
              <Briefcase className="size-5" /> 출근하기 (체력 {WORK_ENERGY})
            </GameButton>
            <p className="mt-1.5 text-[0.6875rem] font-bold text-mute">
              기본 일급 {RANKS[job.rank].pay.toLocaleString()}원 · 실적에 따라 70~120%
            </p>
          </>
        )}
      </div>
      <div className="space-y-2">
        <Card>
          <p className="text-[0.75rem] font-black">누적 실적</p>
          <p className="text-[1.25rem] font-black">{job.perf.toLocaleString()}점</p>
          {next && (
            <>
              <Bar value={job.perf / next.perf} className="mt-1" color="bg-sun" />
              <p className="mt-0.5 text-[0.6875rem] font-semibold text-sub">
                {next.name} 승진까지 {Math.max(0, next.perf - job.perf)}점 · 직무 레슨 {Math.min(rl, next.lessons)}/{next.lessons}
              </p>
            </>
          )}
        </Card>
        <Card>
          <p className="mb-1 text-[0.75rem] font-black">최근 실적</p>
          <div className="flex h-14 items-end gap-1">
            {job.history.slice(-7).map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <div className={cx('w-full rounded-t-md', h.perf >= 80 ? 'bg-teal' : h.perf >= 50 ? 'bg-sun' : 'bg-coral')} style={{ height: `${Math.max(8, h.perf * 0.48)}px` }} />
                <span className="text-[0.5rem] font-bold text-mute">{h.date.slice(8)}</span>
              </div>
            ))}
            {!job.history.length && <p className="w-full self-center text-center text-[0.6875rem] font-semibold text-mute">아직 기록이 없어요</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

function CareerTab({ onStartup, openLesson }: { onStartup: () => void; openLesson: (id: string) => void }) {
  const w = useWorld()
  const job = w.job!
  const rl = roleLessons()
  const [moving, setMoving] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const def = JOB_MAP[job.id]
  const next = RANKS[job.rank + 1]
  const ready = canPromote(job.rank, job.perf, rl)

  if (moving)
    return (
      <div>
        <button onClick={() => setMoving(false)} className="mb-2 rounded-xl bg-black/5 px-2 py-1 text-[0.75rem] font-black">
          ← 돌아가기
        </button>
        <p className="mb-2 text-[0.75rem] font-semibold text-sub">부서를 옮기면 직급·실적은 그대로, 승진에 필요한 배움 분야만 바뀌어요.</p>
        <JobPicker
          current={job.id}
          onPick={(id) => {
            w.changeJob(id)
            setMoving(false)
            toast(`${JOB_MAP[id].name}로 이동했어요`)
          }}
        />
      </div>
    )

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-black">직급 사다리</p>
        <div className="flex items-end gap-1.5">
          {RANKS.map((r, i) => (
            <div key={r.name} className="flex flex-1 flex-col items-center">
              <div
                className={cx('grid w-full place-items-center rounded-t-xl text-[0.6875rem] font-black', i < job.rank ? 'bg-teal text-white' : i === job.rank ? 'bg-primary text-white' : 'bg-black/8 text-mute')}
                style={{ height: `${28 + i * 12}px` }}
              >
                {i === job.rank ? '나' : i < job.rank ? <Check className="size-3.5" strokeWidth={3} /> : ''}
              </div>
              <span className={cx('mt-1 text-[0.6875rem] font-black', i === job.rank ? 'text-primary' : 'text-sub')}>{r.name}</span>
              <span className="text-[0.5625rem] font-bold text-mute">{won(r.pay)}/일</span>
            </div>
          ))}
        </div>
        {next ? (
          <Card className="mt-3">
            <p className="text-[0.875rem] font-black">
              <TrendingUp className="mr-1 inline size-4 text-primary" />
              {next.name} 승진 심사 조건
            </p>
            <div className="mt-1.5 space-y-1.5">
              <div>
                <p className="flex justify-between text-[0.75rem] font-bold">
                  <span>누적 실적</span>
                  <span>
                    {job.perf}/{next.perf}
                  </span>
                </p>
                <Bar value={job.perf / next.perf} color={job.perf >= next.perf ? 'bg-teal' : 'bg-sun'} />
              </div>
              <div>
                <p className="flex justify-between text-[0.75rem] font-bold">
                  <span>
                    {CAT_EMOJI[def.category]} {CATEGORY_MAP[def.category].short} 레슨 (배움터)
                  </span>
                  <span>
                    {Math.min(rl, next.lessons)}/{next.lessons}
                  </span>
                </p>
                <Bar value={rl / Math.max(1, next.lessons)} color={rl >= next.lessons ? 'bg-teal' : 'bg-violet'} />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <GameButton
                tone="sun"
                disabled={!ready}
                onClick={() => {
                  if (w.promote(rl)) toast(`🎉 ${next.name}으로 승진했어요! 일급 ${won(next.pay)}원 · +40 EXP`, 'level')
                }}
              >
                승진 심사 받기
              </GameButton>
              {rl < next.lessons && (
                <GameButton tone="violet" onClick={() => openLesson('')}>
                  배움터에서 레슨 듣기
                </GameButton>
              )}
            </div>
          </Card>
        ) : (
          <Card className="mt-3 text-center">
            <p className="text-[1rem] font-black">👑 팀장까지 올랐어요!</p>
            <p className="text-[0.75rem] text-sub">이제 내 가게를 열 준비가 됐어요.</p>
          </Card>
        )}
      </div>
      <div className="space-y-2">
        <Card>
          <p className="text-[0.75rem] font-black text-sub">내 부서</p>
          <p className="text-[1rem] font-black">
            {def.emoji} {def.name} · {RANKS[job.rank].name}
          </p>
          <p className="text-[0.6875rem] font-semibold text-sub">입사 {job.joinedAt} · 출근 {job.history.length}일</p>
          <GameButton size="sm" tone="white" className="mt-2 w-full" onClick={() => setMoving(true)}>
            <Repeat className="size-3.5" /> 부서 이동
          </GameButton>
        </Card>
        <Card className="bg-gradient-to-br from-[#FFF1EF] to-[#FFE1DC]">
          <p className="text-[0.875rem] font-black">🏪 퇴사하고 창업하기</p>
          <p className="mt-0.5 text-[0.6875rem] font-semibold text-sub">
            모은 돈 {won(w.cash)}원으로 내 가게를 열어요. 추천 자금 150만 원 이상 · 부족하면 창업지원센터 정책자금도 있어요.
          </p>
          {confirmQuit ? (
            <div className="mt-2 flex gap-1.5">
              <GameButton size="sm" tone="white" onClick={() => setConfirmQuit(false)}>
                취소
              </GameButton>
              <GameButton
                size="sm"
                tone="coral"
                onClick={() => {
                  w.quitJob()
                  toast('골목상사를 퇴사했어요. 이제 내 가게를 열어 볼까요?', 'info')
                  onStartup()
                }}
              >
                정말 퇴사
              </GameButton>
            </div>
          ) : (
            <GameButton size="sm" tone="coral" className="mt-2 w-full" onClick={() => setConfirmQuit(true)}>
              <LogOut className="size-3.5" /> 퇴사하고 창업
            </GameButton>
          )}
        </Card>
      </div>
    </div>
  )
}

function TeamTab() {
  const w = useWorld()
  const job = w.job!
  const today = todayKey()
  const mine = job.history.filter((h) => h.date === today).reduce((s, h) => s + h.perf, 0)
  const list = [...colleagues(job.id, today).map((c) => ({ ...c, me: false })), { name: `${w.name} (나)`, perf: mine, me: true }].sort((a, b) => b.perf - a.perf)
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
      <div className="space-y-1.5">
        <p className="text-[0.8125rem] font-black">오늘 {JOB_MAP[job.id].name} 실적 순위</p>
        {list.map((c, i) => (
          <div key={c.name} className={cx('flex items-center gap-2 rounded-2xl border-2 px-3 py-2', c.me ? 'border-primary bg-primary-50' : 'border-black/5 bg-white')}>
            <span className={cx('grid size-7 place-items-center rounded-full text-[0.75rem] font-black', i === 0 ? 'bg-sun text-ink' : i === 1 ? 'bg-[#D9DDE8]' : i === 2 ? 'bg-[#E9B48A]' : 'bg-black/5')}>{i + 1}</span>
            <span className="flex-1 text-[0.875rem] font-black">{c.name}</span>
            <Bar value={c.perf / 100} className="w-24" color={c.me ? 'bg-primary' : 'bg-black/30'} />
            <span className="w-10 text-right text-[0.8125rem] font-black">{c.perf}</span>
          </div>
        ))}
        {!mine && <p className="text-[0.6875rem] font-semibold text-mute">출근해서 업무를 끝내면 내 실적이 올라가요.</p>}
      </div>
      <Card className="bg-gradient-to-br from-[#F3EFFF] to-[#E5DDFF]">
        <p className="text-[0.875rem] font-black">💡 회사에서 배우는 것</p>
        <p className="mt-1 text-[0.75rem] font-semibold text-ink/80">{JOB_MAP[job.id].desc}</p>
        <p className="mt-1.5 text-[0.75rem] font-semibold text-ink/80">직장에서 익힌 기술은 창업 후 가게 운영에 그대로 쓰여요. 여러 부서를 돌며 다양한 일을 배워 보세요.</p>
      </Card>
    </div>
  )
}

export function CompanyPanel({ onClose, openLesson, onStartup }: { onClose: () => void; openLesson: (id: string) => void; onStartup: () => void }) {
  const w = useWorld()
  const g = useGame()
  const [tab, setTab] = useState<Tab>('work')
  const [practice, setPractice] = useState<JobId | null>(null)
  const [practiced, setPracticed] = useState<string | null>(null)

  // 사장님: 직무 체험(교육)만
  if (g.started && !w.job)
    return (
      <Panel title="골목상사 · 직무 교육" icon="🏢" color="#3D5AFE" wide onClose={onClose}>
        {practice ? (
          <WorkDay
            job={practice}
            rank={0}
            practice
            openLesson={openLesson}
            onDone={(scores) => {
              const avg = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
              const key = `${todayKey()}:${practice}`
              if (practiced !== key) {
                useWorld.getState().addExp(10)
                setPracticed(key)
              }
              toast(`직무 체험 완료 · 점수 ${avg}점 · +10 EXP`)
              setPractice(null)
            }}
          />
        ) : (
          <>
            <p className="mb-2 rounded-2xl bg-primary-50 p-2.5 text-[0.8125rem] font-bold text-primary">
              사장님은 가게를 운영 중이라 입사는 할 수 없지만, 각 부서의 실제 업무 상황을 체험하며 배울 수 있어요. 가게 운영에 필요한 시선을 넓혀 보세요!
            </p>
            <JobPicker practice onPick={setPractice} />
          </>
        )}
      </Panel>
    )

  if (!w.job)
    return (
      <Panel title="골목상사 · 채용 공고" icon="🏢" color="#3D5AFE" wide onClose={onClose}>
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#EAF0FF] to-[#F6F0FF] p-2.5">
          <span className="text-[1.75rem]">📢</span>
          <p className="text-[0.8125rem] font-bold text-ink/80">
            골목상사는 동네 가게들을 돕는 회사예요. 원하는 직무를 골라 입사하면 매일 업무를 해결하고 일급을 받아요. 실적을 쌓고 직무 레슨을 들으면 승진! 돈과 경험이 모이면 언제든 퇴사하고 창업할 수 있어요.
          </p>
        </div>
        <JobPicker
          onPick={(id) => {
            w.joinJob(id)
            toast(`${JOB_MAP[id].name} 인턴으로 입사했어요! 🎉`, 'level')
          }}
        />
      </Panel>
    )

  const job = w.job
  return (
    <Panel
      title={`골목상사 · ${JOB_MAP[job.id].name}`}
      icon={JOB_MAP[job.id].emoji}
      color="#3D5AFE"
      wide
      onClose={onClose}
      tabs={
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'work', label: '💼 오늘 업무', badge: job.lastWork !== todayKey() ? 1 : 0 },
            { id: 'career', label: '📈 승진·커리어', badge: canPromote(job.rank, job.perf, roleLessons()) ? 1 : 0 },
            { id: 'team', label: '👥 우리 팀' },
          ]}
        />
      }
    >
      {tab === 'work' && <WorkTab openLesson={openLesson} />}
      {tab === 'career' && <CareerTab onStartup={onStartup} openLesson={openLesson} />}
      {tab === 'team' && <TeamTab />}
    </Panel>
  )
}
