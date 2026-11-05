import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Bookmark,
  CalendarCheck,
  ChevronRight,
  Download,
  Flame,
  Headphones,
  Info,
  MessageCircleQuestionMark,
  NotebookPen,
  Pencil,
  RotateCcw,
  Store,
  Timer,
  Trash2,
  Type,
  Upload,
  ListChecks,
  Trophy,
} from 'lucide-react'
import type { BizType } from '@/types'
import { useApp } from '@/store/app'
import { useGame } from '@/game/store'
import { BIZ_LABEL, BIZ_TYPES } from '@/data/categories'
import { COURSE_MAP, LESSON_MAP } from '@/data/courses'
import { badges, lastNDays, streak, totalMinutes } from '@/lib/stats'
import { rankFor, totalPoints } from '@/lib/today'
import { fromKey, todayKey, WEEKDAY_KO } from '@/lib/date'
import { Icon } from '@/components/Icon'
import { cx, EmptyState, PrimaryButton, Segmented, Sheet, Toggle } from '@/components/ui'

type SheetKind = 'profile' | 'notes' | 'saved' | 'badges' | null

/** 백업 파일에 담는 기록 */
const BACKUP_KEYS = ['profile', 'settings', 'progress', 'logs', 'bookmarks', 'notes', 'review', 'events', 'presetDone', 'questions', 'readNotifs', 'routineOn', 'routineOff', 'routineWeekday', 'customRoutines', 'taskDone', 'quickTodos', 'challengeLog', 'challengeShuffle'] as const

export function My() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const sheet = (params.get('sheet') as SheetKind) ?? null
  const openSheet = (s: SheetKind) => setParams(s ? { sheet: s } : {}, { replace: true })

  const state = useApp()
  const { profile, settings, logs, progress, questions, events, review, notes, bookmarks, challengeLog, taskDone } = state
  const points = totalPoints(challengeLog, taskDone)
  const rank = rankFor(points)
  const routineChecks = Object.values(taskDone).reduce((n, k) => n + k.filter((x) => x.startsWith('r:')).length, 0)
  const today = todayKey()
  const week = lastNDays(logs, today, 7)
  const maxBar = Math.max(profile.dailyGoal, ...week.map((d) => d.minutes))
  const bs = badges({ logs, progress, questions, events, today, challengeCount: challengeLog.length, routineChecks })
  const earned = bs.filter((b) => b.earned).length
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmGame, setConfirmGame] = useState(false)
  const game = useGame()
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const setNotify = async (v: boolean) => {
    if (v && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        /* 무시 */
      }
    }
    state.updateSettings({ notify: v })
  }

  const exportData = () => {
    const st = useApp.getState() as unknown as Record<string, unknown>
    const data = Object.fromEntries(BACKUP_KEYS.map((k) => [k, st[k]]))
    const blob = new Blob(
      [JSON.stringify({ app: 'golmok', version: 2, data: { onboarded: true, ...data } }, null, 2)],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `golmok-backup-${today}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const importData = async (file: File) => {
    try {
      if (file.size > 2_000_000) throw new Error('size')
      const parsed = JSON.parse(await file.text())
      const d = parsed?.data
      if (parsed?.app !== 'golmok' || typeof d !== 'object' || !d || typeof d.profile !== 'object' || !Array.isArray(d.events)) throw new Error('shape')
      const patch: Record<string, unknown> = { onboarded: true }
      for (const k of BACKUP_KEYS) if (k in d) patch[k] = d[k]
      useApp.setState(patch)
      setImportMsg('기록을 불러왔어요.')
    } catch {
      setImportMsg('골목배움 백업 파일이 아니에요.')
    }
  }

  return (
    <div className="pt-safe">
      <header className="px-5 pb-3 pt-5">
        <h1 className="text-[1.625rem] font-extrabold tracking-tight">마이</h1>
      </header>

      {/* 프로필 */}
      <div className="px-5">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3D8BFF] via-primary to-primary-700 p-5 text-white shadow-float">
          <span className="absolute -right-8 -top-10 size-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-[1.5rem] font-extrabold text-primary">
              {profile.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.25rem] font-extrabold">{profile.name} 사장님</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[0.8125rem] font-semibold text-white/85">
                <Store className="size-3.5" />
                {profile.shopName || '가게 이름 미입력'} · {BIZ_LABEL[profile.bizType]}
              </p>
            </div>
            <button aria-label="프로필 수정" onClick={() => openSheet('profile')} className="grid size-10 place-items-center rounded-full bg-white/20 ring-1 ring-white/30">
              <Pencil className="size-4.5" />
            </button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/20 rounded-2xl bg-white/12 py-3 text-center ring-1 ring-white/20">
            {[
              ['연속 학습', `${streak(logs, today)}일`],
              ['누적 학습', `${totalMinutes(logs)}분`],
              ['완료 레슨', `${Object.values(progress).filter((p) => p.done).length}개`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[1.125rem] font-extrabold">{v}</p>
                <p className="text-[0.7188rem] font-semibold text-white/75">{k}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 주간 학습 */}
      <section className="mt-5 px-5">
        <div className="rounded-[20px] bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[1rem] font-bold">이번 주 학습</p>
            <span className="text-[0.75rem] font-semibold text-mute">목표 하루 {profile.dailyGoal}분</span>
          </div>
          <div className="relative mt-4 flex h-32 items-end justify-between gap-2">
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-coral/50" style={{ bottom: `${(profile.dailyGoal / maxBar) * 100}%` }} />
            {week.map((d) => {
              const h = d.minutes ? Math.max(8, (d.minutes / maxBar) * 100) : 4
              const isToday = d.date === today
              return (
                <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  {d.minutes > 0 && <span className="text-[0.6875rem] font-bold text-sub">{d.minutes}</span>}
                  <div
                    className={cx('w-full max-w-7 rounded-lg transition-all', d.minutes >= profile.dailyGoal ? 'bg-primary' : d.minutes ? 'bg-primary/45' : 'bg-line')}
                    style={{ height: `${h}%` }}
                  />
                  <span className={cx('text-[0.6875rem] font-bold', isToday ? 'text-primary' : 'text-mute')}>{WEEKDAY_KO[fromKey(d.date).getDay()]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 도전 단계 */}
      <section className="mt-5 px-5">
        <button onClick={() => nav('/challenges')} className="flex w-full items-center gap-3.5 rounded-[1.25rem] bg-sun-50 p-4 text-left ring-1 ring-sun/40">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sun text-ink">
            <Trophy className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.75rem] font-bold text-[#B7860B]">도전 단계 · {points}P</span>
            <span className="block text-[1.0625rem] font-extrabold">{rank.name}</span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white">
              <span className="block h-full rounded-full bg-sun" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
            </span>
            <span className="mt-1 block text-[0.6875rem] font-semibold text-sub">
              도전 {challengeLog.length}번 · 루틴 체크 {routineChecks}번{rank.next ? ` · '${rank.next.name}'까지 ${rank.next.min - points}P` : ''}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-mute" />
        </button>
      </section>

      {/* 배지 */}
      <section className="mt-5 px-5">
        <button onClick={() => openSheet('badges')} className="block w-full rounded-[20px] bg-white p-5 text-left shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[1rem] font-bold">
              배지 <span className="text-primary">{earned}</span>
              <span className="text-mute">/{bs.length}</span>
            </p>
            <ChevronRight className="size-5 text-mute" />
          </div>
          <div className="mt-3 flex gap-2.5 overflow-hidden">
            {bs.slice(0, 6).map((b) => (
              <span
                key={b.id}
                title={b.name}
                className={cx('grid size-11 shrink-0 place-items-center rounded-2xl', b.earned ? 'bg-sun-50 text-[#B7860B]' : 'bg-bg text-line')}
              >
                <Icon name={b.icon} className="size-5" />
              </span>
            ))}
          </div>
        </button>
      </section>

      {/* 내 기록 */}
      <section className="mt-5 px-5">
        <div className="overflow-hidden rounded-[20px] bg-white shadow-card">
          <MenuRow icon={<Bookmark className="size-5" />} color="text-coral bg-coral-50" label="저장한 학습" value={`${bookmarks.length}`} onClick={() => openSheet('saved')} />
          <MenuRow icon={<NotebookPen className="size-5" />} color="text-violet bg-violet-50" label="내 메모" value={`${Object.keys(notes).length}`} onClick={() => openSheet('notes')} />
          <MenuRow icon={<RotateCcw className="size-5" />} color="text-orange bg-orange-50" label="오답 복습" value={`${review.length}`} onClick={() => nav('/review')} />
          <MenuRow icon={<MessageCircleQuestionMark className="size-5" />} color="text-teal bg-teal-50" label="내 질문" value={`${questions.filter((q) => q.mine).length}`} onClick={() => nav('/ask?tab=mine')} />
          <MenuRow icon={<ListChecks className="size-5" />} color="text-ink bg-bg" label="루틴 관리 (오늘 할 일)" onClick={() => nav('/routines')} />
          <MenuRow icon={<Trophy className="size-5" />} color="text-[#B7860B] bg-sun-50" label="도전 기록" value={`${challengeLog.length}`} onClick={() => nav('/challenges')} />
          <MenuRow icon={<CalendarCheck className="size-5" />} color="text-primary bg-primary-50" label="일정 관리" onClick={() => nav('/schedule')} />
        </div>
      </section>

      {/* 설정 */}
      <section className="mt-5 px-5">
        <p className="mb-2 px-1 text-[0.8125rem] font-bold text-sub">설정</p>
        <div className="space-y-4 rounded-[20px] bg-white p-5 shadow-card">
          <div>
            <p className="flex items-center gap-2 text-[0.9375rem] font-bold">
              <Timer className="size-5 text-primary" /> 하루 학습 목표
            </p>
            <div className="mt-2.5">
              <Segmented<number>
                value={profile.dailyGoal}
                onChange={(v) => state.updateProfile({ dailyGoal: v })}
                options={[3, 5, 10, 15].map((m) => ({ value: m, label: `${m}분` }))}
              />
            </div>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[0.9375rem] font-bold">
              <Store className="size-5 text-primary" /> 영업시간
            </p>
            <p className="mt-0.5 text-[0.7812rem] text-sub">일정 사이 틈새 학습 추천에 쓰여요</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {(['openTime', 'closeTime'] as const).map((k) => (
                <label key={k} className="rounded-2xl bg-bg px-4 py-2.5">
                  <span className="text-[0.75rem] font-bold text-sub">{k === 'openTime' ? '오픈' : '마감'}</span>
                  <input
                    type="time"
                    value={profile[k]}
                    onChange={(e) => e.target.value && state.updateProfile({ [k]: e.target.value })}
                    className="block w-full bg-transparent text-[1.0625rem] font-extrabold outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[0.9375rem] font-bold">
              <Headphones className="size-5 text-primary" /> 듣기 속도
            </p>
            <div className="mt-2.5">
              <Segmented<number>
                value={settings.speechRate}
                onChange={(v) => state.updateSettings({ speechRate: v })}
                options={[0.8, 1, 1.2, 1.5].map((r) => ({ value: r, label: `${r}배` }))}
              />
            </div>
          </div>
          <SettingToggle icon={<Type className="size-5 text-primary" />} label="큰 글씨 모드" desc="글자와 버튼을 크게 보여 줘요" checked={settings.largeText} onChange={(v) => state.updateSettings({ largeText: v })} />
          <SettingToggle
            icon={<CalendarCheck className="size-5 text-primary" />}
            label="세금 달력 표시"
            desc="부가세·종소세·원천세 기한을 일정에 보여 줘요"
            checked={settings.showTaxCalendar}
            onChange={(v) => state.updateSettings({ showTaxCalendar: v })}
          />
          <SettingToggle
            icon={<Bell className="size-5 text-primary" />}
            label="일정 알림"
            desc="앱이 열려 있을 때 일정 10분 전에 알려 줘요"
            checked={settings.notify}
            onChange={setNotify}
          />
          <SettingToggle
            icon={<Store className="size-5 text-coral" />}
            label="장사 게임 체험 모드"
            desc="하루 한 번 제한 없이 연달아 장사해 볼 수 있어요 (테스트용)"
            checked={game.fastPlay}
            onChange={game.setFastPlay}
          />
        </div>
      </section>

      {/* 데이터 */}
      <section className="mt-5 px-5">
        <p className="mb-2 px-1 text-[0.8125rem] font-bold text-sub">내 기록</p>
        <div className="overflow-hidden rounded-[20px] bg-white shadow-card">
          <MenuRow icon={<Download className="size-5" />} color="text-primary bg-primary-50" label="기록 백업 파일로 저장" onClick={exportData} />
          <MenuRow icon={<Upload className="size-5" />} color="text-primary bg-primary-50" label="백업 파일 불러오기" onClick={() => fileRef.current?.click()} />
          <MenuRow
            icon={<Trash2 className="size-5" />}
            color="text-coral bg-coral-50"
            label={confirmReset ? '한 번 더 누르면 모든 기록이 지워져요' : '모든 기록 초기화'}
            danger
            onClick={() => (confirmReset ? (state.resetAll(), game.resetGame()) : setConfirmReset(true))}
          />
          {game.started && (
            <MenuRow
              icon={<Store className="size-5" />}
              color="text-coral bg-coral-50"
              label={confirmGame ? '한 번 더 누르면 가게가 사라져요' : '장사 게임 처음부터 다시'}
              danger
              onClick={() => (confirmGame ? (game.resetGame(), setConfirmGame(false)) : setConfirmGame(true))}
            />
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importData(f)
            e.target.value = ''
          }}
        />
        {importMsg && <p className="mt-2 px-1 text-[0.8125rem] font-semibold text-primary">{importMsg}</p>}
        <p className="mt-4 flex items-start gap-1.5 px-1 text-[0.75rem] leading-relaxed text-mute">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          기록은 이 기기에만 저장돼요. 세무·노무·지원사업 내용은 일반 안내이며 제도는 바뀔 수 있어요. 중요한 결정 전에는 홈택스(126)·고용노동부(1350)·1357 등 공식 창구에서 확인하세요. · 골목배움 v2.0
        </p>
      </section>

      {sheet === 'profile' && <ProfileSheet open onClose={() => openSheet(null)} />}

      <Sheet open={sheet === 'badges'} onClose={() => openSheet(null)} title={`배지 ${earned}/${bs.length}`}>
        <div className="grid grid-cols-2 gap-2.5 pb-4">
          {bs.map((b) => (
            <div key={b.id} className={cx('flex items-center gap-3 rounded-2xl p-3.5', b.earned ? 'bg-sun-50' : 'bg-bg opacity-60')}>
              <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl', b.earned ? 'bg-sun text-ink' : 'bg-line text-white')}>
                <Icon name={b.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-bold">{b.name}</span>
                <span className="block text-[0.75rem] font-semibold text-sub">{b.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'notes'} onClose={() => openSheet(null)} title="내 메모">
        {Object.keys(notes).length === 0 ? (
          <EmptyState icon={<NotebookPen className="size-7" />} title="아직 메모가 없어요" body="레슨을 마치면 우리 가게에 적용할 점을 메모할 수 있어요." />
        ) : (
          <div className="space-y-2.5 pb-4">
            {Object.entries(notes).map(([lid, text]) =>
              LESSON_MAP[lid] ? (
                <button key={lid} onClick={() => nav(`/lesson/${lid}`)} className="block w-full rounded-2xl bg-violet-50 p-4 text-left">
                  <p className="text-[0.75rem] font-bold text-violet">{LESSON_MAP[lid].title}</p>
                  <p className="mt-1 whitespace-pre-line text-[0.9062rem] font-semibold leading-relaxed">{text}</p>
                </button>
              ) : null,
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={sheet === 'saved'} onClose={() => openSheet(null)} title="저장한 학습">
        {bookmarks.length === 0 ? (
          <EmptyState icon={<Bookmark className="size-7" />} title="저장한 학습이 없어요" body="코스나 레슨의 북마크를 눌러 보세요." />
        ) : (
          <div className="space-y-2 pb-4">
            {bookmarks.map((id) => {
              const c = COURSE_MAP[id]
              const l = LESSON_MAP[id]
              if (!c && !l) return null
              return (
                <button
                  key={id}
                  onClick={() => nav(c ? `/course/${id}` : `/lesson/${id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-bg p-3.5 text-left"
                >
                  <BookOpen className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.75rem] font-bold text-sub">{c ? '코스' : `레슨 · ${l.minutes}분`}</span>
                    <span className="block truncate text-[0.9375rem] font-bold">{c ? c.title : l.title}</span>
                  </span>
                  <ChevronRight className="size-5 text-mute" />
                </button>
              )
            })}
          </div>
        )}
      </Sheet>
    </div>
  )
}

function MenuRow({
  icon,
  color,
  label,
  value,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  color: string
  label: string
  value?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-0">
      <span className={cx('grid size-10 place-items-center rounded-xl', color)}>{icon}</span>
      <span className={cx('flex-1 text-[0.9375rem] font-bold', danger && 'text-coral')}>{label}</span>
      {value && <span className="text-[0.875rem] font-bold text-sub">{value}</span>}
      <ChevronRight className="size-5 text-mute" />
    </button>
  )
}

function SettingToggle({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[0.9375rem] font-bold">
          {icon}
          {label}
        </p>
        <p className="mt-0.5 text-[0.7812rem] text-sub">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useApp((s) => s.profile)
  const update = useApp((s) => s.updateProfile)
  const [name, setName] = useState(profile.name)
  const [shop, setShop] = useState(profile.shopName)
  const [biz, setBiz] = useState<BizType>(profile.bizType)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="프로필 수정"
      footer={
        <PrimaryButton
          arrow={false}
          onClick={() => {
            update({ name: name.trim() || profile.name, shopName: shop.trim(), bizType: biz })
            onClose()
          }}
        >
          저장
        </PrimaryButton>
      }
    >
      <label className="block">
        <span className="text-[0.8125rem] font-bold text-sub">이름 (호칭)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[1rem] font-semibold outline-none ring-primary focus:ring-2" />
      </label>
      <label className="mt-4 block">
        <span className="text-[0.8125rem] font-bold text-sub">가게 이름</span>
        <input value={shop} onChange={(e) => setShop(e.target.value)} maxLength={20} className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[1rem] font-semibold outline-none ring-primary focus:ring-2" />
      </label>
      <p className="mt-4 text-[0.8125rem] font-bold text-sub">업종</p>
      <div className="mt-1.5 grid grid-cols-3 gap-2 pb-2">
        {BIZ_TYPES.map((b) => (
          <button
            key={b.id}
            onClick={() => setBiz(b.id)}
            aria-pressed={biz === b.id}
            className={cx('flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[0.7812rem] font-bold', biz === b.id ? 'bg-primary text-white' : 'bg-bg text-ink')}
          >
            <Icon name={b.icon} className="size-5" />
            {b.label}
          </button>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] font-semibold text-mute">
        <Flame className="size-3.5" /> 관심 분야는 홈 추천에 반영돼요 — 배움 탭에서 언제든 다른 분야도 볼 수 있어요.
      </p>
    </Sheet>
  )
}
