import { memo, useContext } from 'react'
import { iso } from '../map'
import { box, pts } from './geo'
import { NightCtx, Sign } from './Buildings'

/** 식품 공장 — 톱니 지붕·굴뚝·하역장. 돌아가는 라인 수만큼 굴뚝 연기가 나요 */
export const FactoryArt = memo(function FactoryArt({ working, lines, name }: { working: boolean; lines: number; name: string }) {
  const night = useContext(NightCtx)
  const x = 20
  const y = 16
  const w = 3
  const d = 3
  const h = 46
  const body = box(x, y, w, d, 0, h)
  const base = box(x - 0.04, y - 0.04, w + 0.08, d + 0.08, 0, 6)
  // 톱니 지붕: x 방향으로 3칸, 각 칸에 비스듬한 지붕 + 수직 채광창
  const teeth = Array.from({ length: 3 }, (_, i) => {
    const x0 = x + i
    const x1 = x + i + 1
    return {
      slope: pts([
        [x0, y, h],
        [x1, y, h + 14],
        [x1, y + d, h + 14],
        [x0, y + d, h],
      ]),
      glass: pts([
        [x1, y, h],
        [x1, y, h + 14],
        [x1, y + d, h + 14],
        [x1, y + d, h],
      ]),
    }
  })
  const chimneyN = Math.max(1, Math.min(3, lines - 1))
  const chimneys = Array.from({ length: chimneyN }, (_, i) => box(x + 0.35 + i * 0.9, y + 0.3, 0.3, 0.3, h + 12, 22 + i * 3))
  const dock = box(x + w, y + 0.8, 0.5, 1.4, 0, 10)
  const tank = box(x + 0.2, y + d - 0.5, 0.4, 0.4, h, 16)
  const doorL = iso(x + 1.5, y + d, 0)
  const win = (side: 'y' | 'x', k: number) =>
    pts(
      side === 'y'
        ? [
            [x + k, y + d, 14],
            [x + k + 0.5, y + d, 14],
            [x + k + 0.5, y + d, 32],
            [x + k, y + d, 32],
          ]
        : [
            [x + w, y + k, 14],
            [x + w, y + k + 0.5, 14],
            [x + w, y + k + 0.5, 32],
            [x + w, y + k, 32],
          ],
    )
  return (
    <g>
      <polygon points={base.left} fill="#A9A49A" />
      <polygon points={base.right} fill="#8E8A80" />
      <polygon points={body.left} fill="#E4E8EF" />
      <polygon points={body.right} fill="#B9C1CE" />
      {/* 가로 패널 줄 */}
      {[12, 24, 36].map((z) => (
        <g key={z}>
          <polyline
            points={pts([
              [x, y + d, z],
              [x + w, y + d, z],
            ])}
            stroke="#C9D0DA"
            strokeWidth={1}
          />
          <polyline
            points={pts([
              [x + w, y + d, z],
              [x + w, y, z],
            ])}
            stroke="#A3ACBA"
            strokeWidth={1}
          />
        </g>
      ))}
      {/* 창문 */}
      {[0.25, 2.25].map((k) => (
        <polygon key={`wy${k}`} points={win('y', k)} fill={night ? 'url(#m-glass-night)' : 'url(#m-glass)'} stroke="#5B6477" strokeWidth={0.8} />
      ))}
      {[0.4, 1.2, 2.1].map((k) => (
        <polygon key={`wx${k}`} points={win('x', k)} fill={night ? 'url(#m-glass-night)' : 'url(#m-glass)'} stroke="#5B6477" strokeWidth={0.8} opacity={0.9} />
      ))}
      {/* 큰 셔터 문 */}
      <polygon
        points={pts([
          [x + 1.05, y + d, 0],
          [x + 1.95, y + d, 0],
          [x + 1.95, y + d, 30],
          [x + 1.05, y + d, 30],
        ])}
        fill="#5B6BBF"
        stroke="#2E3B8A"
        strokeWidth={1}
      />
      {[6, 12, 18, 24].map((z) => (
        <polyline
          key={z}
          points={pts([
            [x + 1.05, y + d, z],
            [x + 1.95, y + d, z],
          ])}
          stroke="#3F4D9C"
          strokeWidth={1}
        />
      ))}
      {/* 하역장 */}
      <polygon points={dock.left} fill="#B8B3A8" />
      <polygon points={dock.right} fill="#8E8A80" />
      <polygon points={dock.top} fill="#D9D3C7" />
      <polyline
        points={pts([
          [x + w, y + 0.8, 10],
          [x + w + 0.5, y + 0.8, 10],
          [x + w + 0.5, y + 2.2, 10],
        ])}
        fill="none"
        stroke="#F2A93B"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      {/* 지붕 */}
      {teeth.map((t, i) => (
        <g key={i}>
          <polygon points={t.slope} fill={i % 2 ? '#6C7A99' : '#75849F'} stroke="#4A5570" strokeWidth={0.8} />
          <polygon points={t.glass} fill={night ? 'url(#m-glass-night)' : 'url(#m-tower-glass)'} stroke="#4A5570" strokeWidth={0.8} />
        </g>
      ))}
      {/* 물탱크 */}
      <polygon points={tank.left} fill="#DDE2E8" />
      <polygon points={tank.right} fill="#AEB7C4" />
      <polygon points={tank.top} fill="#F2F5F8" />
      {/* 굴뚝 + 연기 */}
      {chimneys.map((c, i) => {
        const top = iso(x + 0.5 + i * 0.9, y + 0.45, h + 34 + i * 3)
        return (
          <g key={i}>
            <polygon points={c.left} fill="#C8463E" />
            <polygon points={c.right} fill="#9A3530" />
            <polygon points={c.top} fill="#E25B52" />
            {working &&
              [0, 1, 2].map((k) => <circle key={k} className="smoke" cx={top.x} cy={top.y - 2} r={5 + k} fill="#F4F4F0" opacity={0.75} style={{ animationDelay: `${k * 0.8 + i * 0.3}s` }} />)}
          </g>
        )
      })}
      {/* 가동 표시등 */}
      <circle cx={doorL.x + 20} cy={doorL.y - 36} r={2.6} fill={working ? '#5DFF8A' : '#F25C54'} className={working ? 'blink' : undefined} />
      <Sign x={x + 1.5} y={y + 3} z={44} text={name || '식품 공장'} bg="#2E3B8A" emoji="🏭" />
    </g>
  )
})
