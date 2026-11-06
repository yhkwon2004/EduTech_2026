import { forwardRef, memo, useMemo, type CSSProperties } from 'react'
import type { Look } from '../avatar'
import { FY, PX, SH, SW, X0, poseFrame, stripDef, stripImage, type Face, type StripKind } from './pixel'

export type { Look } from '../avatar'
export type Act = 'wave' | 'cheer' | 'stretch' | 'work' | 'nod' | 'yawn' | 'hop' | 'look'
export type Expr = 'normal' | 'happy' | 'surprised' | 'tired' | 'talk' | 'yawn'
export type Pose = 'idle' | 'walk' | 'wave' | 'cheer' | 'work'

/*
 * 도트 캐릭터
 * - 바라보는 각도(yaw)를 8방향(45°)으로 나눠 그리고, 왼쪽은 오른쪽 그림을 뒤집어 써요.
 * - 걷기·대기·인사 같은 동작은 프레임 스트립을 CSS steps()로 넘겨 재생해요 (리렌더 없음).
 */

export interface CharProps {
  look: Look
  yaw?: number
  walking?: boolean
  act?: Act | null
  expr?: Expr | null
  scale?: number
  pose?: Pose
  seed?: number
  /** 걷기 한 주기(초) */
  speed?: number
  /** 'head'면 머리만 (아이콘·표정 시트) */
  part?: 'all' | 'head'
}

function viewOf(yaw: number) {
  let y = ((((yaw + 180) % 360) + 360) % 360) - 180
  if (y === -180) y = 180
  const q = Math.round(Math.abs(y) / 22.5) * 22.5
  return { ang: q, flip: y < 0 && q !== 0 && q !== 180 }
}

export const CharacterArt = memo(function CharacterArt({ look, yaw = 20, walking = false, act = null, expr = null, scale = 1, pose, seed = 0, speed = 0.46, part = 'all' }: CharProps) {
  const { ang, flip } = viewOf(yaw)
  const face: Face = (expr === 'talk' ? 'normal' : expr) ?? (act === 'cheer' || act === 'wave' || pose === 'cheer' || pose === 'wave' ? 'happy' : 'normal')
  const kind: StripKind | null = pose ? null : walking ? 'walk' : act && act !== 'look' ? act : expr === 'talk' ? 'talk' : 'idle'
  const lookKey = JSON.stringify(look)
  const strip = useMemo(() => {
    if (!kind) {
      const f = poseFrame(pose!, ang, face)
      return { ...stripImage(look, ang, [f], [0], `pose:${pose}:${face}`), frameMs: 0, iter: 1 as number | 'infinite' }
    }
    const def = stripDef(kind, ang, face, speed)
    return { ...stripImage(look, ang, def.frames, def.seq, `${kind}:${face}:${speed}`), frameMs: def.frameMs, iter: def.iter }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey, ang, kind, face, pose, speed])

  const animated = strip.n > 1
  const dur = (strip.frameMs * strip.n) / 1000
  const delay = kind === 'idle' ? `${-((seed % 11) * 0.37).toFixed(2)}s` : '0s'
  const imgStyle = {
    animation: animated ? `px-strip ${dur.toFixed(3)}s steps(${strip.n}) ${delay} ${strip.iter}` : undefined,
    '--px-end': `${-SW * strip.n}px`,
  } as CSSProperties
  // 머리만: 위쪽만 잘라서
  const top = part === 'head' ? 3 : 0
  const rows = part === 'head' ? 32 : SH
  return (
    <g transform={`scale(${flip ? -scale : scale},${scale})`}>
      {part === 'all' && (
        <>
          <ellipse cx={0} cy={0.4} rx={11.5} ry={3.6} fill="#16240C" opacity={0.26} />
          <ellipse cx={0} cy={0.4} rx={6.5} ry={1.8} fill="#16240C" opacity={0.22} />
        </>
      )}
      <svg x={-X0 * PX} y={(-FY + top) * PX} width={SW * PX} height={rows * PX} viewBox={`0 ${top} ${SW} ${rows}`} overflow="hidden" style={{ pointerEvents: 'none' }}>
        <image key={`${kind}-${ang}-${face}-${strip.url.length}`} className="px-img" href={strip.url} width={SW * strip.n} height={SH} preserveAspectRatio="none" style={imgStyle} />
      </svg>
    </g>
  )
})

export interface NodeProps extends CharProps {
  name?: string
  bubble?: string | null
  me?: boolean
}

/** 위치는 ref로 직접 움직여요 (리렌더 없이 60fps) */
export const CharacterNode = forwardRef<SVGGElement, NodeProps>(function CharacterNode({ name, bubble, me, scale = 1, ...rest }, ref) {
  const bw = bubble ? Math.max(30, [...bubble].length * 10.5 + 18) : 0
  return (
    <g ref={ref} style={{ pointerEvents: 'none' }}>
      {me && <ellipse cx={0} cy={0} rx={15} ry={6.5} fill="none" stroke="#FFE27A" strokeWidth={2} opacity={0.9} className="me-ring" />}
      <CharacterArt {...rest} scale={scale} />
      {name && (
        <g transform={`translate(0,${-74 * scale})`}>
          <rect x={-name.length * 5.6 - 9} y={-9} width={name.length * 11.2 + 18} height={18} rx={9} fill="#1A1236" opacity={0.78} />
          <rect x={-name.length * 5.6 - 9} y={-9} width={name.length * 11.2 + 18} height={18} rx={9} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1} />
          {me && <circle cx={-name.length * 5.6 - 2} cy={0} r={2.6} fill="#FFE27A" />}
          <text x={me ? 3 : 0} y={4} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#fff" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            {name}
          </text>
        </g>
      )}
      {bubble && (
        <g transform={`translate(0,${-(name ? 96 : 80) * scale})`} className="bubble-pop">
          <rect x={-bw / 2} y={-14} width={bw} height={24} rx={12} fill="#fff" stroke="#4A3426" strokeWidth={1} />
          <path d="M-4 9.5 l4 5 l4 -5 z" fill="#fff" stroke="#4A3426" strokeWidth={1} strokeLinejoin="round" />
          <rect x={-5} y={7.5} width={10} height={3} fill="#fff" />
          <text y={3.8} textAnchor="middle" fontSize={11} fontWeight={800} fill="#2A2130" fontFamily="Pretendard Variable, Pretendard, sans-serif">
            {bubble}
          </text>
        </g>
      )}
    </g>
  )
})
