import type { BizType, CategoryId } from '@/types'

export interface CategoryMeta {
  id: CategoryId
  name: string
  short: string
  icon: string
  /** 진한 색 / 연한 배경 / 썸네일 그라디언트 */
  color: string
  soft: string
  gradient: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'marketing',
    name: '마케팅·홍보',
    short: '마케팅',
    icon: 'Megaphone',
    color: '#176FF2',
    soft: '#EEF4FF',
    gradient: 'linear-gradient(135deg,#4C94FF 0%,#176FF2 55%,#0B47AD 100%)',
  },
  {
    id: 'digital',
    name: '배달앱·온라인',
    short: '온라인',
    icon: 'Smartphone',
    color: '#7B61FF',
    soft: '#F1EEFF',
    gradient: 'linear-gradient(135deg,#A592FF 0%,#7B61FF 55%,#5236D9 100%)',
  },
  {
    id: 'tax',
    name: '세금·회계',
    short: '세금',
    icon: 'Receipt',
    color: '#167F71',
    soft: '#E8F6F3',
    gradient: 'linear-gradient(135deg,#3FB8A6 0%,#167F71 60%,#0D5A50 100%)',
  },
  {
    id: 'service',
    name: '고객응대',
    short: '응대',
    icon: 'Smile',
    color: '#F83758',
    soft: '#FFF0F3',
    gradient: 'linear-gradient(135deg,#FF7A91 0%,#F83758 60%,#C81E3D 100%)',
  },
  {
    id: 'ops',
    name: '매장운영·원가',
    short: '운영',
    icon: 'Package',
    color: '#FF8A3D',
    soft: '#FFF2E8',
    gradient: 'linear-gradient(135deg,#FFB27A 0%,#FF8A3D 60%,#E0661A 100%)',
  },
  {
    id: 'support',
    name: '정부지원',
    short: '지원사업',
    icon: 'Landmark',
    color: '#0B47AD',
    soft: '#E7EEFA',
    gradient: 'linear-gradient(135deg,#3A6FCF 0%,#1B4FA8 55%,#0A2F72 100%)',
  },
  {
    id: 'labor',
    name: '직원·노무',
    short: '노무',
    icon: 'Users',
    color: '#C2410C',
    soft: '#FFF1E7',
    gradient: 'linear-gradient(135deg,#F59E5B 0%,#D9601F 60%,#A63F0A 100%)',
  },
  {
    id: 'hygiene',
    name: '위생·안전',
    short: '위생',
    icon: 'ShieldCheck',
    color: '#0E8A4A',
    soft: '#E6F6EC',
    gradient: 'linear-gradient(135deg,#4CC98A 0%,#14A05A 60%,#0B6E3D 100%)',
  },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>

export const BIZ_TYPES: { id: BizType; label: string; icon: string }[] = [
  { id: 'food', label: '음식점', icon: 'UtensilsCrossed' },
  { id: 'cafe', label: '카페·베이커리', icon: 'Coffee' },
  { id: 'retail', label: '소매·편의점', icon: 'ShoppingBag' },
  { id: 'beauty', label: '미용·뷰티', icon: 'Scissors' },
  { id: 'service', label: '수리·서비스', icon: 'Wrench' },
  { id: 'etc', label: '기타', icon: 'Store' },
]

export const BIZ_LABEL = Object.fromEntries(BIZ_TYPES.map((b) => [b.id, b.label])) as Record<BizType, string>
