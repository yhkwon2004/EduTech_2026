import { hash, rng } from '@/lib/rng'

/** 캐릭터 꾸미기 — 저장되는 값 (예전 저장본은 hair/hairColor/outfit/skin만 있어요) */
export interface Avatar {
  hair: number
  hairColor: string
  /** 상의 색 */
  outfit: string
  skin: string
  eyes?: number
  brows?: number
  mouth?: number
  blush?: boolean
  glasses?: number
  hat?: number
  top?: number
  bottom?: number
  bottomColor?: string
  shoes?: string
  /** 눈동자 색 */
  eyeColor?: string
}

export type Role = 'owner' | 'employee' | 'npc'
export interface Look extends Required<Avatar> {
  role: Role
}

export const HAIR_STYLES = ['짧은 머리', '단발', '포니테일', '긴 머리', '곱슬', '뾰족 머리', '똥머리', '반삭']
export const HAIR_COLORS = ['#2E211B', '#151317', '#6B3F24', '#A8683A', '#D9A75F', '#B9B4AD', '#8E6BBF', '#C9504A']
export const SKINS = ['#FFE6D2', '#FFD9B8', '#F2C29B', '#DDA67E', '#B9805A', '#8C5A3C']
export const EYES = ['동글', '반짝', '웃는 눈', '또렷', '졸린 눈']
export const BROWS = ['자연', '진한', '얇은']
export const MOUTHS = ['미소', '활짝', '고양이', '무표정']
export const GLASSES = ['없음', '동그란 안경', '네모 안경', '선글라스']
export const HATS = ['없음', '야구모자', '비니', '요리사 모자', '머리띠', '밀짚모자']
export const TOPS = ['티셔츠', '후드티', '셔츠', '니트']
export const BOTTOMS = ['바지', '반바지', '치마']
export const CLOTH_COLORS = ['#F25C54', '#F2A93B', '#FFD35A', '#5DBB63', '#2E9C9C', '#3E86D6', '#3156C4', '#7B61FF', '#E86FA0', '#FFFFFF', '#9AA4B0', '#2E3248']
export const BOTTOM_COLORS = ['#34385A', '#4A6FA5', '#2E2A33', '#7A5A3C', '#9AA4B0', '#C9B48C', '#5A7D4A', '#8E3B46']
export const EYE_COLORS = ['#6B4226', '#2A2238', '#3E86D6', '#2E9C6A', '#8E6BBF', '#D9433D', '#E8A33A']
export const SHOE_COLORS = ['#2E2A33', '#FFFFFF', '#8A5A3B', '#F25C54', '#3E86D6', '#F2A93B']

export const DEFAULT_AVATAR: Required<Avatar> = {
  hair: 1,
  hairColor: '#2E211B',
  outfit: '#F25C54',
  skin: '#FFD9B8',
  eyes: 0,
  brows: 0,
  mouth: 0,
  blush: true,
  glasses: 0,
  hat: 0,
  top: 0,
  bottom: 0,
  bottomColor: '#34385A',
  shoes: '#2E2A33',
  eyeColor: '#6B4226',
}

/** 빠진 값을 채워서 그릴 수 있는 모양으로 */
export function toLook(a: Partial<Avatar> | undefined, role: Role = 'npc'): Look {
  return { ...DEFAULT_AVATAR, ...(a ?? {}), role } as Look
}

/** 🎲 랜덤 꾸미기 */
export function randomAvatar(seed: number = Date.now()): Required<Avatar> {
  const r = rng(hash(`avatar:${seed}`))
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const idx = (n: number) => Math.floor(r() * n)
  return {
    hair: idx(HAIR_STYLES.length),
    hairColor: pick(HAIR_COLORS),
    outfit: pick(CLOTH_COLORS),
    skin: pick(SKINS),
    eyes: idx(EYES.length),
    brows: idx(BROWS.length),
    mouth: idx(MOUTHS.length),
    blush: r() > 0.25,
    glasses: r() < 0.7 ? 0 : 1 + idx(GLASSES.length - 1),
    hat: r() < 0.6 ? 0 : 1 + idx(HATS.length - 1),
    top: idx(TOPS.length),
    bottom: idx(BOTTOMS.length),
    bottomColor: pick(BOTTOM_COLORS),
    shoes: pick(SHOE_COLORS),
    eyeColor: pick(EYE_COLORS),
  }
}

/** 마을 사람들 — 캐릭터 시트와 거리 NPC */
export interface Villager {
  id: string
  name: string
  job: string
  look: Look
  scale: number
  lines: string[]
}

const v = (id: string, name: string, job: string, a: Partial<Avatar>, role: Role, scale: number, lines: string[]): Villager => ({ id, name, job, look: toLook(a, role), scale, lines })

export const VILLAGERS: Villager[] = [
  v('grandma', '박순자', '반찬가게 할머니', { hair: 6, hairColor: '#B9B4AD', skin: '#F2C29B', eyes: 2, brows: 2, mouth: 0, glasses: 1, top: 3, outfit: '#8E6BBF', bottom: 2, bottomColor: '#7A5A3C', shoes: '#8A5A3B' , eyeColor: '#6B4226' }, 'npc', 0.84, ['오늘 김치 맛있게 익었어~', '밥은 먹고 다니니?', '🥬']),
  v('clerk', '김도윤', '골목상사 대리', { hair: 0, hairColor: '#151317', eyes: 3, brows: 1, mouth: 3, top: 2, outfit: '#E9EEF6', bottomColor: '#2E3248' , eyeColor: '#2A2238' }, 'employee', 0.9, ['보고서 마감이다…', '점심 뭐 먹지?', '☕']),
  v('student', '이서준', '동네 학생', { hair: 5, hairColor: '#2E211B', skin: '#FFE6D2', eyes: 1, mouth: 1, hat: 1, top: 1, outfit: '#5DBB63', bottom: 1, bottomColor: '#4A6FA5', shoes: '#FFFFFF' , eyeColor: '#2E9C6A' }, 'npc', 0.76, ['떡볶이 먹고 싶다!', '시험 끝났다~', '🎮']),
  v('chef', '최강', '국밥집 셰프', { hair: 0, hairColor: '#2E211B', skin: '#DDA67E', eyes: 3, brows: 1, mouth: 0, hat: 3, top: 2, outfit: '#FFFFFF', bottomColor: '#2E2A33' , eyeColor: '#6B4226' }, 'owner', 0.92, ['육수 우리는 중!', '오늘 손님 많네', '🍲']),
  v('barista', '정민아', '카페 알바', { hair: 2, hairColor: '#6B3F24', eyes: 1, mouth: 2, top: 0, outfit: '#E86FA0', bottom: 2, bottomColor: '#34385A', shoes: '#F25C54' , eyeColor: '#8E6BBF' }, 'npc', 0.86, ['신메뉴 나왔어요~', '라떼 한 잔 어때요?', '☕']),
  v('farmer', '한만복', '텃밭 농부', { hair: 0, hairColor: '#6B3F24', skin: '#B9805A', eyes: 2, brows: 1, mouth: 1, hat: 5, top: 0, outfit: '#5A7D4A', bottomColor: '#4A6FA5', shoes: '#8A5A3B' , eyeColor: '#6B4226' }, 'npc', 0.9, ['물 주는 거 잊지 마!', '올해 배추 풍년이야', '🌾']),
  v('rider', '오지호', '배달 라이더', { hair: 4, hairColor: '#151317', skin: '#DDA67E', eyes: 0, mouth: 1, hat: 2, top: 1, outfit: '#F2A93B', bottomColor: '#2E3248', shoes: '#3E86D6' , eyeColor: '#3E86D6' }, 'npc', 0.88, ['배달 왔습니다~', '오늘 콜 많다!', '🛵']),
]
