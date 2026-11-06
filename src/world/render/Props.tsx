import { memo } from 'react'
import { iso, type DecoDef } from '../map'
import { CROP_MAP } from '../items'
import { box, pts, shade, tileDiamond } from './geo'

/** 둥근 잎 덩어리 (명암 포함) */
function Puff({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill="url(#m-leaf)" />
    </g>
  )
}

const LEAF = [
  ['#58B444', '#7ED160', '#3F9233'],
  ['#62BE4A', '#8FDA6B', '#47A037'],
  ['#45A85F', '#6DCB83', '#2F8A4A'],
]

export const Deco = memo(function Deco({ d, night }: { d: DecoDef; night: boolean }) {
  const c = iso(d.x + 0.5, d.y + 0.5)
  const v = d.v ?? 0
  switch (d.kind) {
    case 'tree': {
      const [base, light, dark] = LEAF[v % 3]
      const s = 0.92 + (v % 4) * 0.06
      return (
        <g transform={`translate(${c.x},${c.y}) scale(${s})`}>
          <path d="M-4 0 q1 -12 1 -24 l6 0 q0 12 1 24 q-4 2 -8 0 z" fill="#8A5A3A" />
          <path d="M1 -2 q0 -11 1 -22 l1 0 q0 11 1 22 z" fill="#A9744C" opacity={0.7} />
          <path d="M-1 -18 q-6 -4 -9 -9 M2 -20 q5 -3 8 -8" stroke="#7A4E32" strokeWidth={2} strokeLinecap="round" fill="none" />
          <g className="sway" style={{ transformOrigin: '0px -16px', animationDelay: `${(v % 5) * 0.4}s` }}>
            <Puff cx={-12} cy={-28} r={12} color={dark} />
            <Puff cx={12} cy={-29} r={12} color={dark} />
            <Puff cx={0} cy={-40} r={18} color={base} />
            <Puff cx={-10} cy={-34} r={11} color={base} />
            <Puff cx={9} cy={-36} r={12} color={base} />
            <circle cx={-6} cy={-47} r={7} fill={light} opacity={0.9} />
            <circle cx={-12} cy={-37} r={4} fill={light} opacity={0.7} />
            {v % 4 === 0 && (
              <>
                <circle cx={7} cy={-33} r={2.8} fill="#F04E45" />
                <circle cx={-9} cy={-27} r={2.6} fill="#F04E45" />
                <circle cx={2} cy={-45} r={2.4} fill="#F04E45" />
                <circle cx={6.4} cy={-33.8} r={0.9} fill="#fff" opacity={0.8} />
              </>
            )}
            {v % 4 === 2 && [-8, 4, 10].map((px, i) => <circle key={i} cx={px} cy={-30 - i * 6} r={1.8} fill="#FFFFFF" opacity={0.9} />)}
          </g>
        </g>
      )
    }
    case 'pine': {
      const s = 0.9 + (v % 3) * 0.08
      return (
        <g transform={`translate(${c.x},${c.y}) scale(${s})`}>
          <rect x={-3} y={-14} width={6} height={14} rx={2} fill="#7A4E35" />
          <g className="sway" style={{ transformOrigin: '0px -10px', animationDelay: `${(v % 4) * 0.5}s` }}>
            {[
              [-10, 22, '#2E8A55'],
              [-24, 18, '#38A064'],
              [-37, 14, '#43B472'],
            ].map(([y0, half, col], i) => (
              <g key={i}>
                <path d={`M0 ${(y0 as number) - 26} L${half} ${y0} Q0 ${(y0 as number) + 5} ${-(half as number)} ${y0} Z`} fill={col as string} />
                <path d={`M0 ${(y0 as number) - 26} L${-(half as number)} ${y0} Q${-(half as number) / 2} ${(y0 as number) + 3} 0 ${(y0 as number) + 2} Z`} fill="#FFFFFF" opacity={0.14} />
                <path d={`M0 ${(y0 as number) - 26} L${half} ${y0} Q${(half as number) / 2} ${(y0 as number) + 4} 0 ${(y0 as number) + 3} Z`} fill="#0A2E18" opacity={0.16} />
              </g>
            ))}
          </g>
        </g>
      )
    }
    case 'bush':
      return (
        <g transform={`translate(${c.x},${c.y})`}>
          <Puff cx={-8} cy={-6} r={9} color="#4CA93D" />
          <Puff cx={8} cy={-6} r={9} color="#45A037" />
          <Puff cx={0} cy={-11} r={11} color="#5BBB4A" />
          {v % 2 === 0 ? (
            <>
              <circle cx={3} cy={-15} r={2.2} fill="#FFFFFF" />
              <circle cx={-6} cy={-9} r={2.2} fill="#FFD35A" />
              <circle cx={7} cy={-8} r={2} fill="#FF8FB1" />
            </>
          ) : (
            <circle cx={-3} cy={-16} r={3} fill="#8FDA6B" opacity={0.8} />
          )}
        </g>
      )
    case 'flowers': {
      const colors = ['#FF8FB1', '#FFD35A', '#FFFFFF', '#F25C54', '#B794F6']
      return (
        <g transform={`translate(${c.x},${c.y})`}>
          {[
            [-11, -1],
            [-4, 4],
            [5, -3],
            [12, 2],
            [0, -6],
            [-7, -6],
          ].map(([dx, dy], i) => {
            const col = colors[(i + v) % colors.length]
            return (
              <g key={i} transform={`translate(${dx},${dy})`}>
                <path d="M0 0 q-1 -3 0 -6" stroke="#3E8F2E" strokeWidth={1.2} fill="none" />
                <ellipse cx={-2} cy={-2.5} rx={2} ry={1} fill="#5DB548" transform="rotate(-30 -2 -2.5)" />
                {[0, 72, 144, 216, 288].map((a) => (
                  <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 1.8} cy={-7 + Math.sin((a * Math.PI) / 180) * 1.3} r={1.5} fill={col} />
                ))}
                <circle cx={0} cy={-7} r={1} fill={col === '#FFD35A' ? '#E8843A' : '#FFE27A'} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'lamp':
      return (
        <g transform={`translate(${c.x},${c.y})`}>
          {night && <ellipse cx={0} cy={0} rx={30} ry={14} fill="url(#m-glow)" />}
          {night && <circle cx={0} cy={-48} r={24} fill="url(#m-glow)" />}
          <rect x={-4} y={-3} width={8} height={4} rx={1.5} fill="#2E3248" />
          <rect x={-1.6} y={-44} width={3.2} height={42} fill="#3B3F55" />
          <rect x={-0.6} y={-44} width={1} height={42} fill="#7A7F99" opacity={0.6} />
          <path d="M-7 -44 h14 l-2 -10 h-10 z" fill={night ? '#FFE69A' : '#F6F1DD'} stroke="#3B3F55" strokeWidth={1.4} strokeLinejoin="round" />
          <path d="M-8 -54 h16 l-8 -5 z" fill="#3B3F55" />
        </g>
      )
    case 'bench': {
      const seat = box(d.x + 0.12, d.y + 0.36, 0.76, 0.28, 7, 2.5)
      const back = box(d.x + 0.12, d.y + 0.34, 0.76, 0.06, 11, 8)
      const leg = (u: number) => box(d.x + u, d.y + 0.56, 0.06, 0.06, 0, 7)
      return (
        <g>
          {[0.18, 0.76].map((u) => {
            const l = leg(u)
            return (
              <g key={u}>
                <polygon points={l.left} fill="#3B3F55" />
                <polygon points={l.right} fill="#2B2E40" />
              </g>
            )
          })}
          <polygon points={back.left} fill="#B8783F" />
          <polygon points={back.top} fill="#D39556" />
          <polygon points={seat.top} fill="#D39556" />
          <polygon points={seat.left} fill="#A8683A" />
          <polygon points={seat.right} fill="#8C552E" />
        </g>
      )
    }
    case 'fenceX':
    case 'fenceY': {
      const alongX = d.kind === 'fenceX'
      const a = alongX ? iso(d.x, d.y + 0.5) : iso(d.x + 0.5, d.y)
      const b = alongX ? iso(d.x + 1, d.y + 0.5) : iso(d.x + 0.5, d.y + 1)
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      return (
        <g>
          <line x1={a.x} y1={a.y - 10} x2={b.x} y2={b.y - 10} stroke="#B9814A" strokeWidth={3.2} strokeLinecap="round" />
          <line x1={a.x} y1={a.y - 10.8} x2={b.x} y2={b.y - 10.8} stroke="#E2AC72" strokeWidth={1} />
          <line x1={a.x} y1={a.y - 4.5} x2={b.x} y2={b.y - 4.5} stroke="#A66F3C" strokeWidth={3} strokeLinecap="round" />
          {[a, m, b].map((p, i) => (
            <g key={i}>
              <path d={`M${p.x - 2.2} ${p.y} v-14 l2.2 -2.5 l2.2 2.5 v14 z`} fill={i === 1 ? '#C48A50' : '#A8743F'} />
              <rect x={p.x - 2.2} y={p.y - 14} width={1.4} height={14} fill="#FFFFFF" opacity={0.2} />
            </g>
          ))}
        </g>
      )
    }
    case 'rock':
      return (
        <g transform={`translate(${c.x},${c.y})`}>
          <path d="M-13 1 q-3 -9 5 -13 q8 -5 15 1 q6 5 2 12 z" fill="#A9B2BE" />
          <path d="M-13 1 q-3 -9 5 -13 q8 -5 15 1 q6 5 2 12 z" fill="url(#m-leaf)" opacity={0.7} />
          <path d="M-6 -9 q5 -4 10 -1" stroke="#E9EEF3" strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d="M6 -2 q2 2 1 4" stroke="#7E8794" strokeWidth={1} fill="none" />
          <ellipse cx={-10} cy={0} rx={3} ry={1.4} fill="#6FB548" />
        </g>
      )
    case 'lily':
      return (
        <g transform={`translate(${c.x},${c.y})`}>
          <path d="M-9 0 a9 4.5 0 1 0 0.1 -0.5 l7 0.5 z" fill="#3FA34D" />
          <ellipse cx={0} cy={0} rx={9} ry={4.5} fill="url(#m-leaf)" opacity={0.6} />
          <circle cx={2} cy={-2.5} r={3} fill="#F7A8CF" />
          <circle cx={2} cy={-2.5} r={1.2} fill="#FFE27A" />
        </g>
      )
    case 'reeds':
      return (
        <g transform={`translate(${c.x},${c.y})`} strokeLinecap="round">
          {[-7, -3, 1, 5, 8].map((dx, i) => (
            <g key={i} className="sway" style={{ transformOrigin: `${dx}px 0px`, animationDelay: `${i * 0.3}s` }}>
              <path d={`M${dx} 0 q1 -10 ${i % 2 ? 2 : -1} ${-18 - (i % 2) * 5}`} stroke={i % 2 ? '#4C9A35' : '#5DB548'} strokeWidth={1.8} fill="none" />
              {i % 2 === 0 && <ellipse cx={dx - 1} cy={-19} rx={1.8} ry={4.2} fill="#8B5A3C" />}
            </g>
          ))}
        </g>
      )
    case 'well': {
      const b = box(d.x + 0.2, d.y + 0.2, 0.6, 0.6, 0, 12)
      const inner = iso(d.x + 0.5, d.y + 0.5, 12)
      const t1 = iso(d.x + 0.24, d.y + 0.5, 12)
      const t2 = iso(d.x + 0.76, d.y + 0.5, 12)
      return (
        <g>
          <polygon points={b.left} fill="#C4CBD4" />
          <polygon points={b.right} fill="#A2ABB7" />
          {[4, 8].map((z) => (
            <polyline key={z} points={pts([[d.x + 0.2, d.y + 0.8, z], [d.x + 0.8, d.y + 0.8, z], [d.x + 0.8, d.y + 0.2, z]])} fill="none" stroke="#8A93A0" strokeWidth={0.7} />
          ))}
          <polygon points={b.top} fill="#DDE2E8" />
          <ellipse cx={inner.x} cy={inner.y} rx={12} ry={6} fill="#2F7FB0" />
          <ellipse cx={inner.x - 3} cy={inner.y - 1} rx={5} ry={2} fill="#8FD6F5" opacity={0.7} />
          <rect x={t1.x - 1.6} y={t1.y - 22} width={3.2} height={22} fill="#7A4A26" />
          <rect x={t2.x - 1.6} y={t2.y - 22} width={3.2} height={22} fill="#6A3F20" />
          <line x1={t1.x} y1={t1.y - 16} x2={t2.x} y2={t2.y - 16} stroke="#5B3A29" strokeWidth={1.8} />
          <path d={`M${t1.x - 6} ${t1.y - 20} L${(t1.x + t2.x) / 2} ${t1.y - 33} L${t2.x + 6} ${t2.y - 20} Z`} fill="#C24B3A" />
          <path d={`M${t1.x - 6} ${t1.y - 20} L${(t1.x + t2.x) / 2} ${t1.y - 33} L${(t1.x + t2.x) / 2} ${t1.y - 30} L${t1.x - 3} ${t1.y - 20} Z`} fill="#FFFFFF" opacity={0.25} />
        </g>
      )
    }
    case 'cart': {
      const b = box(d.x + 0.1, d.y + 0.25, 0.8, 0.5, 7, 9)
      const w1 = iso(d.x + 0.3, d.y + 0.75, 6)
      const w2 = iso(d.x + 0.75, d.y + 0.75, 6)
      const top = iso(d.x + 0.5, d.y + 0.5, 19)
      return (
        <g>
          <polygon points={b.left} fill="#C98B4F" />
          <polygon points={b.right} fill="#A06A37" />
          <polygon points={b.top} fill="#6E4524" />
          <polyline points={pts([[d.x + 0.1, d.y + 0.75, 11.5], [d.x + 0.9, d.y + 0.75, 11.5]])} stroke="#A06A37" strokeWidth={0.9} />
          {[w1, w2].map((w, i) => (
            <g key={i}>
              <circle cx={w.x} cy={w.y} r={5} fill="#5B3A29" />
              <circle cx={w.x} cy={w.y} r={2.4} fill="#A9744C" />
            </g>
          ))}
          <text x={top.x} y={top.y} textAnchor="middle" fontSize={10.5}>
            🍎🥕🥬
          </text>
        </g>
      )
    }
  }
})

/** 밭·논 위 작물 그림 (stage 0~3, 3=수확 가능) */
export const Crop = memo(function Crop({ x, y, cropId, stage, paddy, watered }: { x: number; y: number; cropId?: string; stage: number; paddy: boolean; watered?: boolean }) {
  const crop = cropId ? CROP_MAP[cropId] : undefined
  const spots = paddy
    ? [
        [0.25, 0.3],
        [0.62, 0.25],
        [0.35, 0.66],
        [0.74, 0.62],
        [0.5, 0.46],
      ]
    : [
        [0.3, 0.27],
        [0.7, 0.27],
        [0.3, 0.5],
        [0.7, 0.5],
        [0.3, 0.73],
        [0.7, 0.73],
      ]
  return (
    <g style={{ pointerEvents: 'none' }}>
      {watered && !paddy && <polygon points={tileDiamond(x, y, 1.5, 0.08)} fill="#3E2412" opacity={0.28} />}
      {crop &&
        spots.map(([dx, dy], i) => {
          const p = iso(x + dx, y + dy, paddy ? 0 : 2)
          if (paddy) {
            const h = 6 + stage * 6
            const col = stage >= 3 ? '#E2BA52' : stage >= 2 ? '#8CC850' : '#6DBE45'
            return (
              <g key={i} strokeLinecap="round" className={stage >= 2 ? 'sway' : ''} style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${i * 0.25}s` }}>
                <ellipse cx={p.x} cy={p.y} rx={4} ry={1.6} fill="#5C8A3C" opacity={0.4} />
                {[-3, -1, 1, 3].map((o, k) => (
                  <path key={k} d={`M${p.x + o * 0.5} ${p.y} q${o} ${-h * 0.6} ${o * 1.6} ${-h - (k % 2) * 2}`} stroke={k % 2 ? shade(col, -20) : col} strokeWidth={1.6} fill="none" />
                ))}
                {stage >= 3 && (
                  <>
                    <path d={`M${p.x + 2} ${p.y - h - 1} q4 2 5 7`} stroke="#C89A30" strokeWidth={2.6} fill="none" />
                    <path d={`M${p.x - 2} ${p.y - h} q-4 2 -5 6`} stroke="#D4A938" strokeWidth={2.4} fill="none" />
                  </>
                )}
              </g>
            )
          }
          if (stage === 0)
            return (
              <g key={i}>
                <ellipse cx={p.x} cy={p.y} rx={2.4} ry={1.3} fill="#5B3A29" />
                <path d={`M${p.x} ${p.y} q-1 -3 -4 -4 M${p.x} ${p.y} q1 -3 4 -4`} stroke="#7BC74D" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              </g>
            )
          const r = stage === 1 ? 3.6 : 5.6
          return (
            <g key={i}>
              <ellipse cx={p.x} cy={p.y + 0.5} rx={r + 1} ry={(r + 1) * 0.4} fill="#3E2412" opacity={0.25} />
              <ellipse cx={p.x - r * 0.7} cy={p.y - r * 0.8} rx={r} ry={r * 0.5} fill="#4FAE3E" transform={`rotate(-28 ${p.x} ${p.y})`} />
              <ellipse cx={p.x + r * 0.7} cy={p.y - r * 0.8} rx={r} ry={r * 0.5} fill="#3F9A33" transform={`rotate(28 ${p.x} ${p.y})`} />
              <ellipse cx={p.x} cy={p.y - r * 1.1} rx={r * 0.55} ry={r * 0.9} fill="#62C24F" />
              {stage >= 2 && (
                <g>
                  <circle cx={p.x} cy={p.y - r * 1.55} r={stage >= 3 ? 4.6 : 3} fill={stage >= 3 ? crop.color : '#9BD86F'} />
                  <circle cx={p.x - 1.3} cy={p.y - r * 1.55 - 1.3} r={stage >= 3 ? 1.5 : 1} fill="#FFFFFF" opacity={0.55} />
                </g>
              )}
            </g>
          )
        })}
      {crop && stage >= 3 && (
        <g className="sparkle">
          <circle cx={iso(x + 0.5, y + 0.5, 30).x} cy={iso(x + 0.5, y + 0.5, 30).y - 5} r={11} fill="#FFFFFF" opacity={0.85} />
          <text x={iso(x + 0.5, y + 0.5, 30).x} y={iso(x + 0.5, y + 0.5, 30).y} textAnchor="middle" fontSize={13}>
            {crop.emoji}
          </text>
        </g>
      )}
    </g>
  )
})

export function LockedPlot({ x, y, level }: { x: number; y: number; level: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <polygon points={tileDiamond(x, y, 0, 0.02)} fill="#2A1C14" opacity={0.42} />
      <rect x={c.x - 17} y={c.y - 7} width={34} height={14} rx={7} fill="#1A1236" opacity={0.7} />
      <text x={c.x} y={c.y + 3.5} textAnchor="middle" fontSize={9} fontWeight={900} fill="#fff">
        🔒 Lv{level}
      </text>
    </g>
  )
}

export function PlotHit({ x, y, id }: { x: number; y: number; id: string }) {
  return <polygon data-hit={`plot:${id}`} points={tileDiamond(x, y)} fill="transparent" style={{ cursor: 'pointer' }} />
}
