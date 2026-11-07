import { memo } from 'react'
import { iso } from '../map'

/**
 * 배움 나무 — 끝낸 레슨 수만큼 자라요 (씨앗 → 새싹 → 어린 나무 → 든든한 나무 → 꽃 → 황금 열매)
 * 원점(0,0)이 화분 가운데 바닥이에요.
 */
export const TreeArt = memo(function TreeArt({ stage, night = false, sign = true }: { stage: number; night?: boolean; sign?: boolean }) {
  const canopy = [0, 0, 17, 27, 31, 34][stage]
  const trunkH = [0, 0, 28, 40, 44, 46][stage]
  const cy = -trunkH - canopy * 0.55
  const blobs: [number, number, number][] =
    stage >= 3
      ? [
          [-canopy * 0.55, cy + canopy * 0.25, canopy * 0.62],
          [canopy * 0.55, cy + canopy * 0.2, canopy * 0.6],
          [0, cy + canopy * 0.35, canopy * 0.66],
          [-canopy * 0.25, cy - canopy * 0.35, canopy * 0.6],
          [canopy * 0.3, cy - canopy * 0.3, canopy * 0.58],
        ]
      : stage === 2
        ? [
            [0, cy, canopy],
            [-canopy * 0.5, cy + canopy * 0.35, canopy * 0.6],
            [canopy * 0.55, cy + canopy * 0.3, canopy * 0.55],
          ]
        : []
  const blossoms = stage === 4 ? 16 : stage === 5 ? 6 : 0
  const fruits = stage === 5 ? 7 : 0
  const ring = (n: number, r: number, k: number) => {
    const a = (k / n) * Math.PI * 2 + k * 0.7
    const rr = r * (0.35 + ((k * 37) % 10) / 16)
    return { x: Math.cos(a) * rr * 1.1, y: cy + Math.sin(a) * rr * 0.85 }
  }
  return (
    <g>
      <defs>
        <radialGradient id="lt-leaf" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={stage === 5 ? '#D8F27A' : '#A8E47E'} />
          <stop offset="0.55" stopColor={stage === 5 ? '#7CC24A' : '#58B151'} />
          <stop offset="1" stopColor="#2F7A3B" />
        </radialGradient>
        <linearGradient id="lt-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9A6440" />
          <stop offset="0.6" stopColor="#7A4A2B" />
          <stop offset="1" stopColor="#5A341D" />
        </linearGradient>
        <radialGradient id="lt-gold" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#FFF7C2" />
          <stop offset="0.5" stopColor="#FFCF3E" />
          <stop offset="1" stopColor="#D98A12" />
        </radialGradient>
        <radialGradient id="lt-glow">
          <stop offset="0" stopColor="#FFF3A8" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFF3A8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 그림자 */}
      <ellipse cx={4} cy={2} rx={canopy ? canopy * 1.25 + 10 : 24} ry={canopy ? canopy * 0.5 + 6 : 11} fill="#16240C" opacity={0.2} />
      {/* 돌 화분 */}
      <ellipse cx={0} cy={0} rx={22} ry={11} fill="#A9A49A" />
      <ellipse cx={0} cy={-3} rx={22} ry={11} fill="#D9D3C7" />
      {Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2
        return <ellipse key={k} cx={Math.cos(a) * 19} cy={-3 + Math.sin(a) * 9.4} rx={4.2} ry={2.6} fill={k % 2 ? '#C8C1B3' : '#E8E3D8'} stroke="#9C9588" strokeWidth={0.5} />
      })}
      <ellipse cx={0} cy={-3} rx={16} ry={7.6} fill="#6B4528" />
      <ellipse cx={-3} cy={-4.5} rx={9} ry={3.4} fill="#83573A" opacity={0.8} />
      {/* 씨앗 */}
      {stage === 0 && (
        <g className="sparkle">
          <ellipse cx={0} cy={-6} rx={4.2} ry={3.2} fill="#8A5A34" stroke="#4E2F18" strokeWidth={1} />
          <path d="M-1.5 -7.5 q1.5 -1 3 0" stroke="#C99A6E" strokeWidth={1} fill="none" />
          <path d="M8 -16 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1z" fill="#FFF3A8" className="twinkle" />
        </g>
      )}
      {/* 새싹 */}
      {stage === 1 && (
        <g className="leaf-sway">
          <path d="M0 -4 C0 -10 1 -14 0 -19" stroke="#3E8E3E" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M0 -17 C-6 -22 -12 -20 -13 -15 C-8 -13 -3 -14 0 -17 Z" fill="#7BCB5A" stroke="#3E8E3E" strokeWidth={1} />
          <path d="M0 -18 C5 -24 12 -23 13 -18 C8 -15 3 -16 0 -18 Z" fill="#8FDA66" stroke="#3E8E3E" strokeWidth={1} />
        </g>
      )}
      {/* 줄기 + 잎 */}
      {stage >= 2 && (
        <g>
          <path d={`M-${3 + stage} -2 Q-${2 + stage / 2} -${trunkH * 0.5} -2 -${trunkH} L2 -${trunkH} Q${2 + stage / 2} -${trunkH * 0.5} ${3 + stage} -2 Z`} fill="url(#lt-trunk)" stroke="#3E2414" strokeWidth={1} />
          {stage >= 3 && (
            <>
              <path d={`M-1 -${trunkH * 0.7} Q-${canopy * 0.4} -${trunkH * 0.9} -${canopy * 0.55} -${trunkH + 4}`} stroke="#6A3F22" strokeWidth={3} fill="none" strokeLinecap="round" />
              <path d={`M1 -${trunkH * 0.75} Q${canopy * 0.4} -${trunkH * 0.95} ${canopy * 0.5} -${trunkH + 6}`} stroke="#6A3F22" strokeWidth={2.6} fill="none" strokeLinecap="round" />
              <path d="M-7 -1 q-5 2 -9 1 M6 -1 q5 2 9 0" stroke="#5A341D" strokeWidth={2} fill="none" strokeLinecap="round" />
            </>
          )}
          {stage === 5 && <circle cx={0} cy={cy} r={canopy * 1.7} fill="url(#lt-glow)" className="glow-pulse" />}
          <g className="leaf-sway">
            {blobs.map(([x, y, r], k) => (
              <circle key={`s${k}`} cx={x + 2} cy={y + 3} r={r} fill="#2B6A33" />
            ))}
            {blobs.map(([x, y, r], k) => (
              <circle key={k} cx={x} cy={y} r={r} fill="url(#lt-leaf)" />
            ))}
            {blobs.map(([x, y, r], k) => (
              <ellipse key={`h${k}`} cx={x - r * 0.3} cy={y - r * 0.38} rx={r * 0.42} ry={r * 0.24} fill="#E4FFB8" opacity={0.35} />
            ))}
            {Array.from({ length: blossoms }, (_, k) => {
              const p = ring(blossoms, canopy, k)
              return (
                <g key={`b${k}`} transform={`translate(${p.x},${p.y})`}>
                  {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx={0} cy={-2} rx={1.6} ry={2.4} fill={stage === 5 ? '#FFFFFF' : '#FFC2D6'} transform={`rotate(${a})`} />
                  ))}
                  <circle r={1.2} fill="#FFE27A" />
                </g>
              )
            })}
            {Array.from({ length: fruits }, (_, k) => {
              const p = ring(fruits, canopy * 0.95, k + 3)
              return (
                <g key={`f${k}`}>
                  <circle cx={p.x} cy={p.y} r={3.6} fill="url(#lt-gold)" stroke="#B26E0C" strokeWidth={0.7} />
                  <circle cx={p.x - 1.2} cy={p.y - 1.3} r={1} fill="#FFFFFF" opacity={0.85} />
                  <path d={`M${p.x} ${p.y - 3.4} l0.6 -1.8`} stroke="#5A341D" strokeWidth={0.9} />
                </g>
              )
            })}
          </g>
          {stage === 5 &&
            [0, 1, 2, 3].map((k) => {
              const p = ring(4, canopy * 1.3, k * 2 + 1)
              return <path key={`t${k}`} d={`M${p.x} ${p.y - 3} l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1z`} fill="#FFF7C2" className="twinkle" style={{ animationDelay: `${k * 0.6}s` }} />
            })}
        </g>
      )}
      {/* 밤: 반딧불 */}
      {night &&
        stage >= 2 &&
        [0, 1, 2, 3, 4].map((k) => (
          <circle key={`ff${k}`} cx={-24 + k * 12} cy={cy + ((k * 13) % 26) - 4} r={1.6} fill="#F6FF9C" className="firefly" style={{ animationDelay: `${k * 0.7}s`, filter: 'drop-shadow(0 0 3px #EFFF7A)' }} />
        ))}
      {/* 팻말 */}
      {sign && (
        <g transform="translate(-26,4)">
          <rect x={-1.2} y={-16} width={2.4} height={16} fill="#6A3F22" />
          <rect x={-15} y={-26} width={30} height={12} rx={2.5} fill="#E9C58C" stroke="#7A4A2B" strokeWidth={1.2} />
          <text x={0} y={-17.4} textAnchor="middle" fontSize={6.6} fontWeight={900} fill="#5A341D" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            배움 나무
          </text>
        </g>
      )}
    </g>
  )
})

/** 마을 지도 위 (타일 좌표) */
export function LearnTreeArt({ x, y, stage, night }: { x: number; y: number; stage: number; night: boolean }) {
  const p = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${p.x},${p.y})`}>
      {/* 누르기 쉬운 영역 */}
      <ellipse cx={0} cy={-20} rx={34} ry={34} fill="transparent" />
      <TreeArt stage={stage} night={night} />
    </g>
  )
}
