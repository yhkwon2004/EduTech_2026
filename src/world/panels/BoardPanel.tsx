import { useState } from 'react'
import { Check, Footprints, Gift, Lock } from 'lucide-react'
import { useGame } from '@/game/store'
import { LEAGUE_NAME, PERSONALITY, SEASON_DAYS } from '@/game/data'
import { Stars } from '@/game/ui'
import { useWorld } from '../store'
import { useDaily, useStory } from '../hooks'
import { storyFor } from '../quests'
import { JOB_MAP, colleagues } from '../jobs'
import { todayKey } from '@/lib/date'
import { Bar, Card, Chip, cx, GameButton, Panel, Tabs, toast, won } from '../ui/kit'
import type { BuildingId } from '../map'

export type BoardTab = 'quest' | 'rank' | 'news' | 'hall'

function QuestTab({ onGo }: { onGo: (t: BuildingId | 'farm') => void }) {
  const w = useWorld()
  const story = useStory()
  const daily = useDaily()
  const list = storyFor(w.path, w.fromEmployee)
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-black">📅 오늘의 퀘스트</p>
        <div className="space-y-1.5">
          {daily.map((d) => {
            const ready = d.have >= d.need
            return (
              <Card key={d.id} className={cx('flex items-center gap-2 py-2.5', d.claimed && 'opacity-60')}>
                <span className={cx('grid size-9 place-items-center rounded-xl text-[1rem]', d.claimed ? 'bg-black/5' : ready ? 'bg-teal text-white' : 'bg-sun-50')}>{d.claimed ? '✓' : ready ? '🎁' : '⭐'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8125rem] font-black">{d.title}</span>
                  <Bar value={Math.min(1, d.have / d.need)} className="mt-1" color={ready ? 'bg-teal' : 'bg-sun'} />
                  <span className="text-[0.625rem] font-bold text-sub">
                    {Math.min(d.have, d.need)}/{d.need} · 보상 {won(d.reward.cash)}원 · {d.reward.exp} EXP
                  </span>
                </span>
                {!d.claimed && (
                  <GameButton
                    size="sm"
                    tone="green"
                    disabled={!ready}
                    onClick={() => {
                      w.claimDaily(d.id, d.reward)
                      toast(`오늘의 퀘스트 완료! +${won(d.reward.cash)}원 · +${d.reward.exp} EXP`)
                    }}
                  >
                    <Gift className="size-3.5" /> 받기
                  </GameButton>
                )}
              </Card>
            )
          })}
        </div>
        <p className="mt-2 text-[0.6875rem] font-semibold text-mute">오늘의 퀘스트는 매일 새로 바뀌어요. 쉬는 시간마다 조금씩!</p>
      </div>
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-black">
          📖 성장 이야기 {Math.min(story.index + 1, story.total)}/{story.total}
        </p>
        <div className="thin-scroll max-h-[19rem] space-y-1 overflow-y-auto pr-1">
          {list.map((q, i) => {
            const claimed = w.storyClaimed.includes(q.id)
            const current = story.current?.id === q.id
            return (
              <div key={q.id} className={cx('flex items-center gap-2 rounded-2xl border-2 px-2.5 py-2', current ? 'border-primary bg-primary-50' : claimed ? 'border-transparent bg-black/[0.03]' : 'border-transparent bg-black/[0.03] opacity-55')}>
                <span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-[0.6875rem] font-black', claimed ? 'bg-teal text-white' : current ? 'bg-primary text-white' : 'bg-black/10')}>
                  {claimed ? <Check className="size-3.5" strokeWidth={3} /> : current ? i + 1 : <Lock className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-black">{q.title}</span>
                  {current && <span className="block text-[0.6875rem] font-semibold text-sub">{q.hint}</span>}
                </span>
                {current &&
                  (story.done ? (
                    <GameButton
                      size="sm"
                      tone="green"
                      onClick={() => {
                        w.claimStory(q.id, q.reward)
                        toast(`퀘스트 완료! +${won(q.reward.cash)}원 · +${q.reward.exp} EXP`)
                      }}
                    >
                      받기
                    </GameButton>
                  ) : (
                    <GameButton size="sm" onClick={() => onGo(q.target)}>
                      <Footprints className="size-3.5" /> 가기
                    </GameButton>
                  ))}
                {!current && <span className="text-[0.625rem] font-bold text-mute">{won(q.reward.cash)}원</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RankTab() {
  const g = useGame()
  const w = useWorld()
  if (!g.started) {
    if (w.job) {
      const today = todayKey()
      const mine = w.job.history.filter((h) => h.date === today).reduce((s, h) => s + h.perf, 0)
      const list = [...colleagues(w.job.id, today), { name: `${w.name} (나)`, perf: mine }].sort((a, b) => b.perf - a.perf)
      return (
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-black">🏢 골목상사 {JOB_MAP[w.job.id].name} 오늘 실적</p>
          <div className="space-y-1">
            {list.map((c, i) => (
              <div key={c.name} className={cx('flex items-center gap-2 rounded-xl px-3 py-1.5', c.name.includes('(나)') ? 'bg-primary-50' : 'bg-black/[0.03]')}>
                <span className="w-5 text-[0.8125rem] font-black">{i + 1}</span>
                <span className="flex-1 text-[0.8125rem] font-bold">{c.name}</span>
                <span className="text-[0.8125rem] font-black">{c.perf}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.75rem] font-semibold text-sub">가게를 열면 동네 → 구 → 시·도 리그에서 이웃 가게들과 매일 순위를 겨뤄요.</p>
        </div>
      )
    }
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-[2.5rem]">🏆</p>
          <p className="text-[1rem] font-black">가게를 열면 동네 리그에 참가해요</p>
          <p className="text-[0.8125rem] text-sub">7일 시즌 누적 점수 TOP 3는 다음 리그로! 동네 → 구 → 시·도 최고 소상공인에 도전해요.</p>
        </div>
      </div>
    )
  }
  const rows = [
    { id: 'me', name: g.shopName, emoji: g.shopEmoji, score: g.seasonScore, me: true, rep: g.stats.reputation, sub: '내 가게' },
    ...g.rivals.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, score: r.seasonScore, me: false, rep: r.reputation, sub: PERSONALITY[r.personality].label })),
  ].sort((a, b) => b.score - a.score)
  const top = rows.slice(0, 3)
  const last = g.history[g.history.length - 1]
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="text-[0.8125rem] font-black">{LEAGUE_NAME(g.tier, g.region)}</p>
        <p className="text-[0.6875rem] font-semibold text-sub">
          시즌 {g.season} · {g.dayInSeason}/{SEASON_DAYS}일 · TOP 3 승급
        </p>
        <div className="mt-2 flex items-end justify-center gap-2">
          {[top[1], top[0], top[2]].map((r, i) =>
            r ? (
              <div key={r.id} className="flex w-24 flex-col items-center">
                <span className="text-[1.75rem] leading-none">{r.emoji}</span>
                <span className={cx('mt-0.5 max-w-full truncate text-[0.6875rem] font-black', r.me && 'text-primary')}>{r.name}</span>
                <div
                  className={cx('mt-1 grid w-full place-items-center rounded-t-xl text-[1.125rem] font-black text-white', i === 1 ? 'h-20 bg-gradient-to-b from-[#FFD54F] to-[#F2A93B]' : i === 0 ? 'h-14 bg-gradient-to-b from-[#CFD6E4] to-[#9AA6BD]' : 'h-10 bg-gradient-to-b from-[#E9B48A] to-[#C7834E]')}
                >
                  {i === 1 ? '1' : i === 0 ? '2' : '3'}
                </div>
              </div>
            ) : null,
          )}
        </div>
        {last && (
          <Card className="mt-2">
            <p className="text-[0.75rem] font-black">어제 하루 순위 {last.rank}위</p>
            <p className="text-[0.6875rem] font-semibold text-sub">
              점수 {last.score} = 이익 {last.scoreParts.profit} + 평판 {last.scoreParts.reputation} + 점유율 {last.scoreParts.share} + 성장 {last.scoreParts.growth}
            </p>
          </Card>
        )}
      </div>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={r.id} className={cx('flex items-center gap-2 rounded-xl px-2.5 py-1.5', r.me ? 'bg-primary-50 ring-2 ring-primary' : 'bg-black/[0.03]')}>
            <span className={cx('grid size-6 place-items-center rounded-full text-[0.6875rem] font-black', i < 3 ? 'bg-sun text-ink' : 'bg-black/5')}>{i + 1}</span>
            <span className="text-[1.125rem]">{r.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-black">{r.name}</span>
              <span className="flex items-center gap-1 text-[0.625rem] font-bold text-sub">
                {r.sub} <Stars value={r.rep} size={9} />
              </span>
            </span>
            <span className="text-[0.875rem] font-black tabular-nums">{r.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewsTab() {
  const g = useGame()
  const w = useWorld()
  const last = g.history[g.history.length - 1]
  const news = g.rivals.filter((r) => r.news).map((r) => ({ emoji: r.emoji, text: r.news! }))
  const tips = [
    '📢 오늘의 상권 팁: 비 오는 날엔 손님이 줄어요. 준비량을 조금 줄이고 배달을 노려 보세요.',
    '🧾 세무 달력: 부가세는 1월·7월 25일까지. 영수증은 매일 정리해 두면 편해요.',
    '🌾 시장 소식: 시세는 매일 바뀌어요. 싼 날 미리 사 두면 원가가 내려가요.',
    '🤝 상인회 소식: 단골은 "다음에 올 이유"에서 시작돼요. 신메뉴 예고를 해 보세요.',
  ]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-black">📰 이웃 가게 소식</p>
        {!g.started ? (
          <p className="text-[0.8125rem] font-semibold text-sub">가게를 열면 경쟁 가게들의 움직임이 매일 소식으로 올라와요.</p>
        ) : news.length ? (
          <div className="space-y-1.5">
            {news.map((n, i) => (
              <Card key={i} className="flex items-center gap-2 py-2">
                <span className="text-[1.25rem]">{n.emoji}</span>
                <span className="text-[0.8125rem] font-bold">{n.text}</span>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-[0.8125rem] font-semibold text-sub">아직 조용해요. 영업을 하면 소식이 생겨요.</p>
        )}
        {last?.eventNote && <p className="mt-2 rounded-2xl bg-sun-50 p-2.5 text-[0.75rem] font-bold text-[#8A6508]">어제의 상황: {last.eventNote}</p>}
      </div>
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-black">📌 {w.region.dong} 게시판</p>
        <div className="space-y-1.5">
          {tips.map((t) => (
            <div key={t} className="rounded-2xl border-2 border-dashed border-wood/30 bg-[#FFF7E8] p-2.5 text-[0.75rem] font-semibold text-ink/80">
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HallTab() {
  const g = useGame()
  if (!g.hall.length)
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-[2.5rem]">🏅</p>
          <p className="text-[1rem] font-black">아직 기록이 없어요</p>
          <p className="text-[0.8125rem] text-sub">7일 시즌이 끝나면 순위와 칭호가 여기에 남아요.</p>
        </div>
      </div>
    )
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[...g.hall].reverse().map((h) => (
        <Card key={`${h.season}-${h.tier}`} className={cx('flex items-center gap-2.5', h.rank === 1 && 'bg-gradient-to-br from-[#FFF6D6] to-[#FFE9A3]')}>
          <span className="text-[1.75rem]">{h.rank === 1 ? '👑' : h.rank <= 3 ? '🥈' : '🎖️'}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.875rem] font-black">
              시즌 {h.season} · {h.rank}위
            </span>
            <span className="block truncate text-[0.6875rem] font-semibold text-sub">{h.league}</span>
            {h.title && <Chip tone="sun">🏆 {h.title}</Chip>}
          </span>
          <span className="text-[0.8125rem] font-black">{h.score.toLocaleString()}점</span>
        </Card>
      ))}
    </div>
  )
}

export function BoardPanel({ onClose, initial = 'quest', onGo }: { onClose: () => void; initial?: BoardTab; onGo: (t: BuildingId | 'farm') => void }) {
  const [tab, setTab] = useState<BoardTab>(initial)
  const daily = useDaily()
  const story = useStory()
  const ready = daily.filter((d) => !d.claimed && d.have >= d.need).length + (story.done ? 1 : 0)
  return (
    <Panel
      title="마을 게시판"
      icon="📋"
      color="#B7792F"
      wide
      onClose={onClose}
      tabs={
        <Tabs<BoardTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'quest', label: '📜 퀘스트', badge: ready },
            { id: 'rank', label: '🏆 랭킹' },
            { id: 'news', label: '📰 동네 소식' },
            { id: 'hall', label: '🏅 명예의 전당' },
          ]}
        />
      }
    >
      {tab === 'quest' && <QuestTab onGo={onGo} />}
      {tab === 'rank' && <RankTab />}
      {tab === 'news' && <NewsTab />}
      {tab === 'hall' && <HallTab />}
    </Panel>
  )
}
