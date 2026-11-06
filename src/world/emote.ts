import { create } from 'zustand'
import type { Act } from './render/Character'

/** 패널에서 일어난 일 → 마을 속 내 캐릭터의 동작 (환호·작업·인사 …) */
export const useEmote = create<{ seq: number; act: Act | null; bubble?: string; fire: (act: Act, bubble?: string) => void }>((set, get) => ({
  seq: 0,
  act: null,
  bubble: undefined,
  fire: (act, bubble) => set({ seq: get().seq + 1, act, bubble }),
}))

export function emote(act: Act, bubble?: string) {
  useEmote.getState().fire(act, bubble)
}

export const ACT_MS: Record<Act, number> = { wave: 1600, cheer: 1150, stretch: 2000, work: 1750, nod: 900, yawn: 2200, hop: 520, look: 1600 }
