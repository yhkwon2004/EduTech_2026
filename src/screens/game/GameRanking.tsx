import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Swords } from 'lucide-react'
import { useGame } from '@/game/store'
import { CHAMPION_TITLE, LEAGUE_NAME, PERSONALITY, SEASON_DAYS } from '@/game/data'
import { RankChange, Stars } from '@/game/ui'
import type { Rival } from '@/game/types'
import { cx, EmptyState, PrimaryButton, ProgressBar, Segmented, Sheet } from '@/components/ui'

interface Row {
  id: string
  name: string
  emoji: string
  score: number
  rank: number
  prev: number
  isPlayer: boolean
  sub: string
  rival?: Rival
}

const LEARN_FROM: Record<Rival['personality'], string> = {
  price: '싸게 파는 가게와 가격으로만 싸우면 둘 다 손해예요. 품질·단골 관리로 차별화하세요.',
  quality: '품질형 가게는 평판이 높아요. 품질 교육(가게 투자)과 리뷰 관리로 따라잡아 보세요.',
  marketing: '홍보왕은 인지도가 높아요. 무료 SNS와 지도 앱 정보를 꾸준히 챙기면 비용 없이도 따라갈 수 있어요.',
  steady: '성실형은 꾸준함이 무기예요. 매일 빠짐없이 장사하고 폐기를 줄이는 게 이기는 길이에요.',
  trendy: '핫플형은 기복이 커요. 화제가 식은 날, 내 단골을 늘릴 기회예요.',
}

export function GameRanking() {
  const nav = useNavigate()
  const g = useGame()
  const [tab, setTab] = useState<'season' | 'today' | 'hall'>('season')
  const [open, setOpen] = useState<Rival | null>(null)

  if (!g.started)
    return (
      <div className="pt-safe">
        <header className="px-5 pb-2 pt-5">
          <h1 className="text-[1.625rem] font-extrabold tracking-tight">랭킹</h1>
        </header>
        <EmptyState
          icon={<Crown className="size-7" />}
          title="아직 가게가 없어요"
          body="창업하면 우리 동네 가게들과 매일 순위를 겨뤄요."
          action={<PrimaryButton onClick={() => nav('/game/setup')}>창업하기</PrimaryButton>}
        />
      </div>
    )

  const last = g.history[g.history.length - 1]
  const season: Row[] = [
    { id: 'me', name: g.shopName, emoji: g.shopEmoji, score: g.seasonScore, rank: 0, prev: 0, isPlayer: true, sub: '나' },
    ...g.rivals.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, score: r.seasonScore, rank: 0, prev: 0, isPlayer: false, sub: PERSONALITY[r.personality].label, rival: r })),
  ]
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }))
  const today: Row[] = last
    ? last.table.map((l) => {
        const rv = g.rivals.find((r) => r.id === l.id)
        return {
          id: l.id,
          name: l.isPlayer ? g.shopName : l.name,
          emoji: l.isPlayer ? g.shopEmoji : l.emoji,
          score: l.score,
          rank: l.rank,
          prev: l.isPlayer ? last.prevRank : 0,
          isPlayer: l.isPlayer,
          sub: `손님 ${l.customers} · ★${l.reputation.toFixed(1)}`,
          rival: rv,
        }
      })
    : []
  const rows = tab === 'season' ? season : today
  const podium = rows.slice(0, 3)
  const leagueDays = g.dayInSeason

  return (
    <div className="pt-safe">
      <header className="px-5 pb-3 pt-5">
        <h1 className="text-[1.625rem] font-extrabold tracking-tight">랭킹</h1>
        <p className="flex items-center gap-1 text-[0.8125rem] font-bold text-sub">
          <Swords className="size-4" /> {LEAGUE_NAME(g.tier, g.region)} · 시즌 {g.season}
        </p>
      </header>

      <div className="px-5">
        <div className="rounded-[1.25rem] bg-ink p-4 text-white">
          <div className="flex items-center justify-between text-[0.8125rem] font-bold">
            <span>시즌 진행 {leagueDays}/{SEASON_DAYS}일</span>
            <span className="text-sun">TOP 3 승급 · 1위 '{CHAMPION_TITLE(g.tier, g.region)}'</span>
          </div>
          <ProgressBar value={leagueDays / SEASON_DAYS} color="bg-sun" className="mt-2 bg-white/15" />
          <div className="mt-3 flex gap-1.5 text-[0.6875rem] font-bold">
            {[0, 1, 2].map((t) => (
              <span key={t} className={cx('flex-1 rounded-full px-2 py-1 text-center', t === g.tier ? 'bg-sun text-ink' : t < g.tier ? 'bg-teal text-white' : 'bg-white/10 text-white/60')}>
                {LEAGUE_NAME(t, g.region)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 px-5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'season', label: '이번 시즌' },
            { value: 'today', label: '오늘' },
            { value: 'hall', label: '명예의 전당' },
          ]}
        />
      </div>

      {tab === 'hall' ? (
        <div className="mt-4 space-y-2.5 px-5">
          {g.hall.length === 0 ? (
            <EmptyState icon={<Crown className="size-7" />} title="아직 끝난 시즌이 없어요" body={`시즌은 ${SEASON_DAYS}일이에요. 끝나면 결과가 여기에 기록돼요.`} />
          ) : (
            [...g.hall].reverse().map((h) => (
              <div key={`${h.season}-${h.tier}`} className={cx('flex items-center gap-3 rounded-[1.25rem] p-4 shadow-card', h.rank === 1 ? 'bg-sun-50 ring-1 ring-sun/40' : 'bg-white')}>
                <span className="text-[1.75rem]">{h.rank === 1 ? '🏆' : h.rank <= 3 ? '🥈' : '🎗️'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-extrabold">
                    시즌 {h.season} · {h.rank}위
                  </span>
                  <span className="block text-[0.75rem] font-semibold text-sub">
                    {h.league} · {h.score}점{h.title ? ` · '${h.title}'` : ''}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Crown className="size-7" />} title="오늘은 아직 장사 전이에요" action={<PrimaryButton onClick={() => nav('/game/play')}>오늘 장사 시작</PrimaryButton>} />
      ) : (
        <>
          {/* 시상대 */}
          <div className="mt-5 flex items-end justify-center gap-3 px-5">
            {[1, 0, 2].map((i) => {
              const r = podium[i]
              if (!r) return <div key={i} className="w-24" />
              const h = i === 0 ? 'h-28' : i === 1 ? 'h-20' : 'h-16'
              return (
                <button key={r.id} onClick={() => r.rival && setOpen(r.rival)} className="flex w-24 flex-col items-center">
                  {i === 0 && <Crown className="mb-1 size-6 text-sun" fill="currentColor" />}
                  <span className={cx('grid size-14 place-items-center rounded-full bg-white text-[1.75rem] shadow-card', r.isPlayer && 'ring-4 ring-primary')}>{r.emoji}</span>
                  <span className={cx('mt-1 line-clamp-1 text-[0.75rem] font-bold', r.isPlayer && 'text-primary')}>{r.isPlayer ? '나' : r.name}</span>
                  <div
                    className={cx(
                      'mt-1 flex w-full flex-col items-center justify-start rounded-t-2xl pt-2 text-white',
                      h,
                      i === 0 ? 'bg-gradient-to-b from-sun to-[#F5A623]' : i === 1 ? 'bg-gradient-to-b from-[#C7D2E3] to-[#9AA8BF]' : 'bg-gradient-to-b from-[#F2B48A] to-[#D9824B]',
                    )}
                  >
                    <span className="text-[1.25rem] font-extrabold">{r.rank}</span>
                    <span className="text-[0.6875rem] font-bold">{r.score}점</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mx-5 overflow-hidden rounded-[1.25rem] bg-white shadow-card">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => r.rival && setOpen(r.rival)}
                className={cx('flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0', r.isPlayer && 'bg-primary-50')}
              >
                <span className={cx('w-6 text-center text-[1rem] font-extrabold', r.rank <= 3 ? 'text-[#B7860B]' : 'text-sub')}>{r.rank}</span>
                <span className="text-[1.375rem]">{r.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block truncate text-[0.9375rem] font-bold', r.isPlayer && 'text-primary')}>
                    {r.name}
                    {r.isPlayer && ' (나)'}
                  </span>
                  <span className="block truncate text-[0.71875rem] font-semibold text-mute">{r.sub}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[0.9375rem] font-extrabold">{r.score}</span>
                  {tab === 'today' && r.isPlayer && <RankChange now={r.rank} prev={r.prev} />}
                  {tab === 'today' && !r.isPlayer && r.rival && <RankChange now={r.rank} prev={0} />}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 px-6 text-[0.71875rem] font-semibold text-mute">
            점수 = 이익 40 · 평판 25 · 손님 점유 20 · 성장 15 (동네 안 상대 평가). 가게를 누르면 경쟁 분석을 볼 수 있어요.
          </p>
        </>
      )}

      {open && (
        <Sheet open onClose={() => setOpen(null)} title="경쟁 가게 분석">
          <div className="pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-bg text-[1.75rem]">{open.emoji}</span>
              <span>
                <span className="block text-[1.125rem] font-extrabold">{open.name}</span>
                <span className="block text-[0.8125rem] font-bold text-primary">{PERSONALITY[open.personality].label}</span>
              </span>
            </div>
            <p className="mt-3 text-[0.875rem] text-sub">{PERSONALITY[open.personality].desc}</p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="flex justify-between text-[0.8125rem] font-bold">
                  <span>평판</span>
                  <span className="flex items-center gap-1">
                    <Stars value={open.reputation} size={12} /> {open.reputation.toFixed(2)}
                  </span>
                </p>
              </div>
              {[
                ['인지도', open.awareness / 100, `${Math.round(open.awareness)}`],
                ['가격 수준', Math.min(1, open.priceLevel / 1.4), open.priceLevel < 0.95 ? '저렴' : open.priceLevel > 1.1 ? '비쌈' : '보통'],
                ['품질', open.quality / 5, open.quality.toFixed(1)],
              ].map(([k, v, label]) => (
                <div key={k as string}>
                  <p className="flex justify-between text-[0.8125rem] font-bold">
                    <span>{k}</span>
                    <span className="text-sub">{label}</span>
                  </p>
                  <ProgressBar value={v as number} className="mt-1" />
                </div>
              ))}
              <p className="flex justify-between text-[0.8125rem] font-bold">
                <span>이번 시즌 점수</span>
                <span>{open.seasonScore}점</span>
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-sun-50 p-4 text-[0.875rem] font-semibold leading-relaxed">
              <span className="font-extrabold text-[#B7860B]">이 가게를 이기려면 </span>
              {LEARN_FROM[open.personality]}
            </div>
            {open.news && <p className="mt-3 text-[0.8125rem] font-semibold text-sub">최근 소식: {open.news}</p>}
          </div>
        </Sheet>
      )}
    </div>
  )
}
