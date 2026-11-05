import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Coins, Gift, Lock, Newspaper, Package, Sparkles, Swords, Trophy, Wrench } from 'lucide-react'
import { useApp } from '@/store/app'
import { useUnreadCount } from '@/store/selectors'
import { useGame, canPlayToday } from '@/game/store'
import { useGameContext } from '@/game/hooks'
import { CHAPTERS, LEAGUE_NAME, SEASON_DAYS, WEATHER } from '@/game/data'
import { capacityOf, weatherFor } from '@/game/sim'
import { currentChapter, missionDone, shopLevel } from '@/game/progress'
import { SKILL_EFFECT, skillMax } from '@/game/skills'
import { RankChange, Stars, Storefront, won } from '@/game/ui'
import { CATEGORIES } from '@/data/categories'
import { Icon } from '@/components/Icon'
import { cx, PrimaryButton, ProgressBar, Sheet } from '@/components/ui'
import type { CategoryId } from '@/types'
import { useState } from 'react'

function Intro() {
  const nav = useNavigate()
  return (
    <div className="pt-safe px-5 pt-6">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-ink via-[#2E3170] to-primary-700 p-6 text-white shadow-float">
        <span className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
        <p className="text-[0.8125rem] font-bold text-white/70">골목 장사왕</p>
        <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight">
          우리 동네 최고의
          <br />
          사장님은 누구?
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/85">
          동네 가게 7곳과 매일 한 판! 무엇을 얼마나 만들고, 얼마에 팔고, 어떻게 알릴지 정하면 하루 장사가 시작돼요.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[0.75rem] font-bold">
          {[
            ['🏭', '생산'],
            ['🏷️', '가격'],
            ['📣', '홍보'],
          ].map(([e, l]) => (
            <div key={l} className="rounded-2xl bg-white/12 py-3 ring-1 ring-white/20">
              <p className="text-[1.5rem]">{e}</p>
              {l}
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-5 space-y-2.5">
        {[
          ['🏆', '매일 동네 랭킹', '이익·평판·손님·성장으로 8곳이 겨뤄요'],
          ['🪜', '동네 → 구 → 시·도 리그', '7일 시즌마다 TOP 3는 승급, 끝까지 가면 지역 최고 소상공인'],
          ['📚', '배우면 강해지는 가게', '3분 레슨을 끝낼수록 노하우 레벨이 올라 게임 효과가 커져요'],
          ['✅', '실제 할 일 = 현장 버프', '오늘 할 일·도전을 하면 게임 손님이 늘어요'],
        ].map(([e, t, d]) => (
          <li key={t} className="flex items-start gap-3 rounded-[1.25rem] bg-white p-4 shadow-card">
            <span className="text-[1.5rem]">{e}</span>
            <span>
              <span className="block text-[0.9375rem] font-extrabold">{t}</span>
              <span className="block text-[0.8125rem] text-sub">{d}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <PrimaryButton onClick={() => nav('/game/setup')}>내 가게 창업하기</PrimaryButton>
      </div>
    </div>
  )
}

export function GameHub() {
  const nav = useNavigate()
  const g = useGame()
  const profile = useApp((s) => s.profile)
  const unread = useUnreadCount()
  const ctx = useGameContext()
  const [skillSheet, setSkillSheet] = useState<CategoryId | null>(null)
  if (!g.started) return <Intro />

  const last = g.history[g.history.length - 1]
  const playable = canPlayToday(g)
  const lv = shopLevel(g.stats.xp)
  const chapter = currentChapter(g.claimed)
  const view = { products: g.products, stats: g.stats, day: g.day, tier: g.tier, hall: g.hall, usedMarketing: g.usedMarketing, replyWins: g.replyWins, flags: g.flags }
  const chapterDone = chapter ? chapter.missions.every((m) => missionDone(m.id, view)) : false
  const seasonRank = 1 + g.rivals.filter((r) => r.seasonScore > g.seasonScore).length
  const titles = g.hall.filter((h) => h.title)
  const news = g.rivals.filter((r) => r.news)
  const weather = weatherFor(g.seed, g.day + 1)

  return (
    <div className="pt-safe">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[0.8125rem] font-bold text-sub">
            <Swords className="size-4" /> {LEAGUE_NAME(g.tier, g.region)} · 시즌 {g.season}
          </p>
          <h1 className="truncate text-[1.5rem] font-extrabold tracking-tight">{g.shopName}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-10 items-center gap-1 rounded-full bg-white px-3 text-[0.875rem] font-extrabold shadow-card">
            <Coins className="size-4 text-[#B7860B]" />
            {won(g.stats.cash)}
          </span>
          <button aria-label={`알림 ${unread}개`} onClick={() => nav('/notifications')} className="relative grid size-10 place-items-center rounded-full bg-white shadow-card">
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-coral ring-2 ring-bg" />}
          </button>
          <button aria-label="마이페이지" onClick={() => nav('/my')} className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-700 text-[0.9375rem] font-bold text-white shadow-card">
            {profile.name.slice(0, 1)}
          </button>
        </div>
      </header>

      {/* 가게 */}
      <section className="px-5">
        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-card">
          <Storefront name={g.shopName} emoji={g.shopEmoji} color={g.color} equipment={g.stats.equipment} interior={g.stats.interior} staff={g.stats.staff} trophy={titles.length > 0} />
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line py-3 text-center">
            <button onClick={() => nav('/rank')}>
              <p className="text-[0.6875rem] font-bold text-mute">시즌 순위</p>
              <p className="text-[1.25rem] font-extrabold">
                {g.dayInSeason > 0 ? `${seasonRank}위` : '-'}
                {last && g.dayInSeason > 0 && (
                  <span className="ml-1 align-middle">
                    <RankChange now={last.rank} prev={last.prevRank} />
                  </span>
                )}
              </p>
            </button>
            <div>
              <p className="text-[0.6875rem] font-bold text-mute">평판</p>
              <p className="flex items-center justify-center gap-1 text-[1.25rem] font-extrabold">
                {g.stats.reputation.toFixed(1)}
                <Stars value={g.stats.reputation} size={10} />
              </p>
            </div>
            <div className="px-3">
              <p className="text-[0.6875rem] font-bold text-mute">인지도</p>
              <p className="text-[1.25rem] font-extrabold">{Math.round(g.stats.awareness)}</p>
              <ProgressBar value={g.stats.awareness / 100} color="bg-teal" className="h-1" />
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
            <span className="shrink-0 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[0.75rem] font-extrabold text-white">Lv.{lv.level}</span>
            <ProgressBar value={lv.progress} color="bg-sun" />
            <span className="shrink-0 text-[0.71875rem] font-bold text-mute">
              {g.day}일 영업 · 수용 {capacityOf(g.biz, g.stats, ctx.skills)}명
            </span>
          </div>
        </div>
      </section>

      {/* 오늘 장사 */}
      <section className="mt-4 px-5">
        {playable ? (
          <div className="rounded-[1.5rem] bg-gradient-to-br from-coral to-[#C81E3D] p-5 text-white shadow-[0_10px_30px_rgba(248,55,88,0.3)]">
            <p className="text-[0.8125rem] font-bold text-white/80">
              {g.day + 1}일차 · 시즌 {g.dayInSeason + 1}/{SEASON_DAYS}일 · {WEATHER[weather].emoji} {WEATHER[weather].label}
            </p>
            <p className="mt-1 text-[1.375rem] font-extrabold">오늘 장사 준비됐나요?</p>
            <p className="mt-0.5 text-[0.8125rem] font-semibold text-white/80">생산 → 가격 → 홍보를 정하고 문을 열어요 (약 2분)</p>
            <button onClick={() => nav('/game/play')} className="mt-4 h-14 w-full rounded-full bg-white text-[1.0625rem] font-extrabold text-coral active:scale-[0.98]">
              🔔 오늘 장사 시작
            </button>
            {g.day < 3 && <p className="mt-2 text-center text-[0.71875rem] font-semibold text-white/75">개업 첫 주 특별: 첫 3일은 연달아 장사할 수 있어요</p>}
          </div>
        ) : (
          <button onClick={() => nav('/game/result')} className="flex w-full items-center gap-4 rounded-[1.5rem] bg-white p-5 text-left shadow-card">
            <span className="text-[2.25rem]">🌙</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1.0625rem] font-extrabold">오늘 장사 끝! 내일 아침에 다시</span>
              {last && (
                <span className="block text-[0.8125rem] font-semibold text-sub">
                  오늘 {last.rank}위 · 손님 {last.customers}명 · 이익 {won(last.profit, { sign: true })}원
                </span>
              )}
              <span className="mt-1 block text-[0.75rem] font-bold text-primary">결과 다시 보기 →</span>
            </span>
          </button>
        )}
      </section>

      {/* 현장 버프 */}
      <section className="mt-4 px-5">
        <button onClick={() => nav('/today')} className="flex w-full items-center gap-3 rounded-[1.25rem] bg-violet-50 p-4 text-left ring-1 ring-violet/20">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet text-white">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-extrabold">현장 버프: 게임 손님 +{Math.round(ctx.buff * 100)}%</span>
            <span className="block text-[0.75rem] font-semibold text-sub">
              실제 오늘 할 일 {ctx.todoDone}/{ctx.todoTotal} · 도전 {ctx.challengesToday}개 → 최대 +15%
            </span>
            <ProgressBar value={ctx.buff / 0.15} color="bg-violet" className="mt-1.5" />
          </span>
          <ChevronRight className="size-5 shrink-0 text-mute" />
        </button>
      </section>

      {/* 사업 로드맵 */}
      {chapter && (
        <section className="mt-6 px-5">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-[1.1875rem] font-bold tracking-tight">사업 성장 로드맵</h2>
            <span className="text-[0.75rem] font-bold text-sub">
              {g.claimed.length}/{CHAPTERS.length}장
            </span>
          </div>
          <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
            <div className="no-scrollbar -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
              {CHAPTERS.map((c, i) => {
                const done = g.claimed.includes(c.id)
                const cur = c.id === chapter.id
                return (
                  <span
                    key={c.id}
                    className={cx(
                      'grid size-8 shrink-0 place-items-center rounded-full text-[0.75rem] font-extrabold',
                      done ? 'bg-teal text-white' : cur ? 'bg-primary text-white' : 'bg-bg text-mute',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                )
              })}
            </div>
            <p className="text-[1rem] font-extrabold">{chapter.title}</p>
            <p className="mt-0.5 text-[0.8125rem] text-sub">{chapter.story}</p>
            <ul className="mt-3 space-y-1.5">
              {chapter.missions.map((m) => {
                const ok = missionDone(m.id, view)
                return (
                  <li key={m.id} className={cx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.875rem] font-semibold', ok ? 'bg-teal-50 text-teal' : 'bg-bg')}>
                    <span className={cx('grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem]', ok ? 'bg-teal text-white' : 'ring-2 ring-line')}>{ok && '✓'}</span>
                    {m.label}
                  </li>
                )
              })}
            </ul>
            <button
              disabled={!chapterDone}
              onClick={() => g.claim(chapter.id)}
              className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-sun text-[0.9375rem] font-extrabold text-ink disabled:bg-bg disabled:text-mute"
            >
              {chapterDone ? <Gift className="size-5" /> : <Lock className="size-4" />}
              {chapterDone ? `보상 받기 +${won(chapter.reward)}원` : `미션을 모두 끝내면 +${won(chapter.reward)}원`}
            </button>
          </div>
        </section>
      )}

      {/* 노하우 */}
      <section className="mt-6 px-5">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-[1.1875rem] font-bold tracking-tight">사장님 노하우</h2>
          <button onClick={() => nav('/learn')} className="text-[0.8125rem] font-bold text-primary">
            배워서 올리기 →
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => {
            const lvSkill = ctx.skills[c.id]
            return (
              <button key={c.id} onClick={() => setSkillSheet(c.id)} className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 shadow-card">
                <span className="grid size-10 place-items-center rounded-xl" style={{ background: c.soft, color: c.color }}>
                  <Icon name={c.icon} className="size-5" />
                </span>
                <span className="text-[0.75rem] font-bold">{c.short}</span>
                <span className={cx('text-[0.6875rem] font-extrabold', lvSkill ? 'text-primary' : 'text-mute')}>Lv.{lvSkill}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[0.71875rem] font-semibold text-mute">레슨을 하나 끝낼 때마다 그 분야 노하우가 1씩 올라요</p>
      </section>

      {/* 동네 소식 */}
      <section className="mt-6 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[0.9375rem] font-extrabold">
            <Newspaper className="size-4 text-primary" /> 동네 소식
          </p>
          {news.length ? (
            <ul className="mt-2 space-y-1.5">
              {news.slice(0, 4).map((r) => (
                <li key={r.id} className="text-[0.84375rem] font-semibold text-ink/85">
                  {r.emoji} {r.news}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[0.84375rem] text-sub">{g.day ? '어제는 조용한 하루였어요.' : '개업 소식이 동네에 퍼지는 중이에요!'}</p>
          )}
          <button onClick={() => nav('/rank')} className="mt-3 flex items-center gap-1 text-[0.8125rem] font-bold text-primary">
            <Trophy className="size-4" /> 경쟁 가게 분석·랭킹 보기
          </button>
        </div>
      </section>

      {/* 관리 */}
      <section className="mt-4 grid grid-cols-2 gap-2.5 px-5">
        <button onClick={() => nav('/game/products')} className="flex items-center gap-3 rounded-[1.25rem] bg-white p-4 text-left shadow-card">
          <Package className="size-6 shrink-0 text-orange" />
          <span>
            <span className="block text-[0.9375rem] font-extrabold">판매 항목</span>
            <span className="block text-[0.75rem] font-semibold text-sub">{g.products.length}개 · 추가·수정</span>
          </span>
        </button>
        <button onClick={() => nav('/game/invest')} className="flex items-center gap-3 rounded-[1.25rem] bg-white p-4 text-left shadow-card">
          <Wrench className="size-6 shrink-0 text-primary" />
          <span>
            <span className="block text-[0.9375rem] font-extrabold">가게 투자</span>
            <span className="block text-[0.75rem] font-semibold text-sub">설비·알바·품질</span>
          </span>
        </button>
      </section>

      {titles.length > 0 && (
        <section className="mt-4 px-5">
          <div className="rounded-[1.25rem] bg-sun-50 p-4 ring-1 ring-sun/40">
            <p className="text-[0.9375rem] font-extrabold">🏆 내 칭호</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {titles.map((h) => (
                <span key={`${h.season}-${h.tier}`} className="rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-bold">
                  시즌 {h.season} · {h.title}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {g.seasonEnd && (
        <Sheet open onClose={g.dismissSeason} title={`시즌 ${g.seasonEnd.season} 결과`}>
          <div className="pb-4 text-center">
            <p className="text-[3.5rem]">{g.seasonEnd.rank === 1 ? '🏆' : g.seasonEnd.rank <= 3 ? '🥈' : '💪'}</p>
            <p className="text-[0.875rem] font-bold text-sub">{g.seasonEnd.league}</p>
            <p className="mt-1 text-[1.75rem] font-extrabold">최종 {g.seasonEnd.rank}위</p>
            {g.seasonEnd.title && <p className="mt-2 inline-block rounded-full bg-sun px-4 py-1.5 text-[0.9375rem] font-extrabold">'{g.seasonEnd.title}' 칭호 획득!</p>}
            <p className="mx-auto mt-3 max-w-[18rem] text-[0.9375rem] leading-relaxed text-sub">
              {g.seasonEnd.champion
                ? '지역 최고의 소상공인이 되었어요! 명예의 전당에 이름이 올라갔어요.'
                : g.seasonEnd.promoted
                  ? `TOP 3 달성! 다음 시즌은 ${LEAGUE_NAME(g.tier, g.region)}에서 더 강한 가게들과 겨뤄요.`
                  : '이번 시즌은 아쉽지만, 같은 리그에서 다시 도전해요. 노하우를 올리면 더 강해져요!'}
            </p>
            <div className="mt-5">
              <PrimaryButton onClick={g.dismissSeason}>다음 시즌 시작</PrimaryButton>
            </div>
          </div>
        </Sheet>
      )}

      {skillSheet && (
        <Sheet open onClose={() => setSkillSheet(null)} title="노하우">
          {(() => {
            const c = CATEGORIES.find((x) => x.id === skillSheet)!
            const lvSkill = ctx.skills[skillSheet]
            return (
              <div className="pb-4">
                <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: c.soft }}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-white" style={{ color: c.color }}>
                    <Icon name={c.icon} className="size-6" />
                  </span>
                  <span>
                    <span className="block text-[1.125rem] font-extrabold">
                      {c.name} Lv.{lvSkill}
                      <span className="text-[0.8125rem] font-bold text-sub"> / {skillMax(skillSheet)}</span>
                    </span>
                    <span className="block text-[0.8125rem] font-semibold" style={{ color: c.color }}>
                      {SKILL_EFFECT[skillSheet]}
                    </span>
                  </span>
                </div>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-sub">이 분야 레슨을 하나 끝낼 때마다 레벨이 1 올라요. 3분이면 하나!</p>
                <div className="mt-4">
                  <PrimaryButton onClick={() => nav(`/learn?cat=${skillSheet}`)}>{c.short} 레슨 보러 가기</PrimaryButton>
                </div>
              </div>
            )
          })()}
        </Sheet>
      )}
    </div>
  )
}
