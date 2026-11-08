import { memo } from 'react'
import { iso, type BuildingDef } from '../map'
import { box, pts } from './geo'
import { VILLAGERS } from '../avatar'
import { CharacterArt } from './Character'

/**
 * 건물 짓기 연출
 * - 빈 터: 말뚝 울타리·흙·팻말 (“여기에 ○○을 지어요”)
 * - 공사 중: 나무 비계·널빤지·먼지 + 망치질하는 일꾼, 머리 위 남은 시간
 * - 완공 대기: 반짝이는 리본
 */
const INK = '#4A3426'

function Stake({ x, y }: { x: number; y: number }) {
  const p = iso(x, y)
  return (
    <g>
      <rect x={p.x - 1.5} y={p.y - 14} width={3} height={14} fill="#A67748" stroke={INK} strokeWidth={0.6} />
      <path d={`M${p.x - 1.5} ${p.y - 14} l1.5 -3 l1.5 3 z`} fill="#C9915A" />
    </g>
  )
}

export const LotArt = memo(function LotArt({ b, emoji, label, hint, canBuild }: { b: BuildingDef; emoji: string; label: string; hint: string; canBuild: boolean }) {
  const { x, y, w, d } = b
  const c = iso(x + w / 2, y + d / 2)
  const ground = pts([
    [x + 0.08, y + 0.08, 0.5],
    [x + w - 0.08, y + 0.08, 0.5],
    [x + w - 0.08, y + d - 0.08, 0.5],
    [x + 0.08, y + d - 0.08, 0.5],
  ])
  const stakes: [number, number][] = []
  for (let i = 0; i <= w; i += 0.5) stakes.push([x + i, y], [x + i, y + d])
  for (let j = 0.5; j < d; j += 0.5) stakes.push([x, y + j], [x + w, y + j])
  const sign = iso(x + w / 2, y + d + 0.15)
  return (
    <g>
      <polygon points={ground} fill="#C9A77A" />
      <polygon points={ground} fill="url(#m-soft)" />
      {[0.3, 0.6].map((k) => (
        <polyline
          key={k}
          points={pts([
            [x + 0.25, y + d * k, 0.6],
            [x + w - 0.25, y + d * k, 0.6],
          ])}
          stroke="#B38F62"
          strokeWidth={1.2}
          strokeDasharray="4 5"
          fill="none"
        />
      ))}
      {/* 주춧돌 자리 */}
      {[
        [0.3, 0.3],
        [w - 0.3, 0.3],
        [0.3, d - 0.3],
        [w - 0.3, d - 0.3],
      ].map(([i, j], k) => {
        const q = iso(x + i, y + j, 0.5)
        return <ellipse key={k} cx={q.x} cy={q.y} rx={5} ry={2.6} fill="#D9D3C7" stroke="#9C9588" strokeWidth={0.6} />
      })}
      {stakes.map(([sx, sy], k) => (
        <Stake key={k} x={sx} y={sy} />
      ))}
      {/* 줄 */}
      <polyline
        points={pts([
          [x, y, 11],
          [x + w, y, 11],
          [x + w, y + d, 11],
          [x, y + d, 11],
          [x, y, 11],
        ])}
        fill="none"
        stroke="#FFE27A"
        strokeWidth={1.1}
        strokeDasharray="3 3"
      />
      {/* 설계도 아이콘 */}
      <g transform={`translate(${c.x},${c.y - 6})`} className="float-soft">
        <ellipse cx={0} cy={9} rx={16} ry={6} fill="#1B1D45" opacity={0.15} />
        <rect x={-15} y={-18} width={30} height={24} rx={3} fill="#2F6FD3" stroke="#FFFFFF" strokeWidth={1.4} />
        <rect x={-10} y={-13} width={20} height={14} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1} strokeDasharray="2 2" />
        <text y={-3} textAnchor="middle" fontSize={12}>
          {emoji}
        </text>
      </g>
      {/* 팻말 */}
      <g transform={`translate(${sign.x},${sign.y})`}>
        <rect x={-1.4} y={-24} width={2.8} height={24} fill="#6A3F22" />
        <rect x={-34} y={-44} width={68} height={22} rx={3} fill={canBuild ? '#FFE27A' : '#E9C58C'} stroke="#7A4A2B" strokeWidth={1.3} />
        <text y={-33} textAnchor="middle" fontSize={7.6} fontWeight={900} fill="#5A341D" fontFamily="Pretendard Variable, Pretendard, sans-serif">
          {emoji} {label}
        </text>
        <text y={-25.5} textAnchor="middle" fontSize={5.6} fontWeight={700} fill="#7A5A3C" fontFamily="Pretendard Variable, Pretendard, sans-serif">
          {hint}
        </text>
        {canBuild && <path d="M28 -48 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1z" fill="#FFF3B0" className="twinkle" />}
      </g>
    </g>
  )
})

export const ConstructionArt = memo(function ConstructionArt({ b, progress, done }: { b: BuildingDef; progress: number; done: boolean }) {
  const { x, y, w, d } = b
  const h = 26 + progress * 30
  const worker = VILLAGERS[5]
  const wp = iso(x + w + 0.35, y + d - 0.35)
  const top = iso(x + w / 2, y + d / 2, h + 10)
  const posts: [number, number][] = [
    [x + 0.15, y + 0.15],
    [x + w - 0.15, y + 0.15],
    [x + w - 0.15, y + d - 0.15],
    [x + 0.15, y + d - 0.15],
  ]
  const planks: number[] = []
  for (let z = 8; z < h; z += 9) planks.push(z)
  return (
    <g>
      <polygon
        points={pts([
          [x + 0.05, y + 0.05, 0.5],
          [x + w - 0.05, y + 0.05, 0.5],
          [x + w - 0.05, y + d - 0.05, 0.5],
          [x + 0.05, y + d - 0.05, 0.5],
        ])}
        fill="#C9A77A"
      />
      {/* 바닥 콘크리트 */}
      <polygon
        points={pts([
          [x + 0.15, y + 0.15, 1.5],
          [x + w - 0.15, y + 0.15, 1.5],
          [x + w - 0.15, y + d - 0.15, 1.5],
          [x + 0.15, y + d - 0.15, 1.5],
        ])}
        fill="#D9D3C7"
        stroke="#9C9588"
        strokeWidth={0.8}
      />
      {/* 벽 (지어진 만큼) */}
      {progress > 0.35 && (
        <>
          <polygon points={box(x + 0.25, y + 0.25, w - 0.5, d - 0.5, 1.5, (h - 8) * Math.min(1, (progress - 0.35) / 0.5)).left} fill="#E8DCC6" opacity={0.9} />
          <polygon points={box(x + 0.25, y + 0.25, w - 0.5, d - 0.5, 1.5, (h - 8) * Math.min(1, (progress - 0.35) / 0.5)).right} fill="#CFC1A6" opacity={0.9} />
        </>
      )}
      {/* 비계 */}
      {posts.map(([px, py], k) => {
        const a = iso(px, py)
        const t = iso(px, py, h)
        return <line key={k} x1={a.x} y1={a.y} x2={t.x} y2={t.y} stroke="#9A6440" strokeWidth={2.6} strokeLinecap="round" />
      })}
      {planks.map((z) => (
        <polyline
          key={z}
          points={pts([
            [x + 0.15, y + 0.15, z],
            [x + w - 0.15, y + 0.15, z],
            [x + w - 0.15, y + d - 0.15, z],
            [x + 0.15, y + d - 0.15, z],
            [x + 0.15, y + 0.15, z],
          ])}
          fill="none"
          stroke="#C9915A"
          strokeWidth={1.6}
        />
      ))}
      <polyline
        points={pts([
          [x + 0.15, y + 0.15, h],
          [x + w - 0.15, y + 0.15, h],
          [x + w - 0.15, y + d - 0.15, h],
          [x + 0.15, y + d - 0.15, h],
          [x + 0.15, y + 0.15, h],
        ])}
        fill="none"
        stroke="#A67748"
        strokeWidth={2}
      />
      {/* 안전 천 */}
      <polyline
        points={pts([
          [x + 0.15, y + d - 0.15, 2],
          [x + w - 0.15, y + d - 0.15, 2],
        ])}
        stroke="#F2A93B"
        strokeWidth={3}
        strokeDasharray="6 4"
      />
      {/* 먼지 */}
      {!done &&
        [0, 1, 2].map((k) => {
          const q = iso(x + 0.4 + k * (w / 3), y + d - 0.2)
          return <circle key={k} className="smoke" cx={q.x} cy={q.y - 4} r={5} fill="#E8DCC6" opacity={0.6} style={{ animationDelay: `${k * 0.8}s`, animationDuration: '2.8s' }} />
        })}
      {/* 일꾼 */}
      <g transform={`translate(${wp.x},${wp.y})`}>
        <CharacterArt look={worker.look} yaw={-35} act={done ? 'cheer' : 'work'} loop expr={done ? 'happy' : null} scale={0.86} />
      </g>
      {/* 완공 리본 */}
      {done && (
        <g transform={`translate(${top.x},${top.y})`} className="marker-bob">
          <circle r={16} fill="#FFE27A" opacity={0.4} className="glow-pulse" />
          <text y={7} textAnchor="middle" fontSize={20}>
            🎀
          </text>
        </g>
      )}
    </g>
  )
})
