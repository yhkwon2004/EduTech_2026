import { hash, rng } from '@/lib/rng'

export interface GrantDef {
  id: string
  title: string
  desc: string
  amount: number
  level: number
  needShop?: boolean
  questions: { q: string; options: string[]; answer: number; explain: string }[]
  lessonId: string
}

/** 지원사업 — 공고 읽기·서류 고르기를 맞히면 선정 */
export const GRANTS: GrantDef[] = [
  {
    id: 'g-sign',
    title: '간판·홍보물 제작 지원',
    desc: '동네 소상공인의 간판 교체와 홍보물 제작비를 지원해요.',
    amount: 200000,
    level: 1,
    lessonId: 'l-sup-1',
    questions: [
      { q: '공고문에서 가장 먼저 확인할 것은?', options: ['지원 대상 조건', '담당자 이름', '공고문 글자 크기'], answer: 0, explain: '대상이 아니면 서류를 준비해도 신청할 수 없어요.' },
      { q: '공고를 찾기 알맞지 않은 곳은?', options: ['기업마당', '시·구청 홈페이지', '출처 없는 문자 링크'], answer: 2, explain: '출처가 불분명한 링크는 피싱일 수 있어요.' },
    ],
  },
  {
    id: 'g-digital',
    title: '디지털 전환 바우처',
    desc: '키오스크·배달앱·온라인 홍보 비용 일부를 바우처로 지원해요.',
    amount: 300000,
    level: 3,
    lessonId: 'l-sup-2',
    questions: [
      { q: '자주 요구되는 서류가 아닌 것은?', options: ['사업자등록증명', '부가세 과세표준증명', '가족 사진'], answer: 2, explain: '사업자등록증명·과세표준증명·납세증명서가 자주 요구돼요.' },
      { q: '서류 발급일 조건이 "공고일 이후"라면?', options: ['예전에 뽑은 것도 된다', '공고일 이후에 새로 발급', '사진으로 찍어 낸다'], answer: 1, explain: '발급일 조건을 꼭 확인하세요.' },
    ],
  },
  {
    id: 'g-hygiene',
    title: '위생 환경 개선 지원',
    desc: '냉장 설비 교체와 위생 점검 대비 비용을 지원해요.',
    amount: 150000,
    level: 2,
    lessonId: 'l-hyg-1',
    questions: [
      { q: '냉동 보관의 일반적인 기준 온도는?', options: ['-5℃ 이하', '-10℃ 이하', '-18℃ 이하'], answer: 2, explain: '냉동은 -18℃ 이하가 일반적인 기준이에요.' },
      { q: '교차오염을 막는 방법은?', options: ['도마 하나로 모두 손질', '재료별 칼·도마 구분', '물로만 헹구기'], answer: 1, explain: '재료별 도구 구분이 기본이에요.' },
    ],
  },
  {
    id: 'g-startup',
    title: '신규 창업 초기 지원',
    desc: '창업 1년 이내 가게의 초기 운영비를 지원해요.',
    amount: 500000,
    level: 2,
    needShop: true,
    lessonId: 'l-sup-3',
    questions: [
      { q: '"지원금 받게 해 줄게요, 착수금 먼저 주세요"라는 연락이 오면?', options: ['바로 입금', '공식 기관에 먼저 확인', '지인에게 소개'], answer: 1, explain: '공식 지원사업 신청은 대부분 무료예요. 1357에 먼저 확인!' },
      { q: '정책자금(융자)과 지원금의 차이는?', options: ['둘 다 안 갚는다', '정책자금은 갚는 돈', '지원금은 갚는 돈'], answer: 1, explain: '정책자금은 낮은 금리로 빌리는 돈이라 갚아야 해요.' },
    ],
  },
]

export const LOAN = { unit: 1000000, max: 5000000, dailyRate: 0.0005 }

export interface Receipt {
  label: string
  qualified: boolean
  why: string
}

const RECEIPTS: Receipt[] = [
  { label: '도매시장 재료 · 카드 매출전표', qualified: true, why: '신용카드 매출전표는 적격증빙이에요.' },
  { label: '정육점 고기 · 지출증빙용 현금영수증', qualified: true, why: '사업자번호로 받은 현금영수증은 적격증빙이에요.' },
  { label: '임대료 · 세금계산서', qualified: true, why: '세금계산서는 대표적인 적격증빙이에요.' },
  { label: '채소 현금 구입 · 금액만 적은 손글씨 메모', qualified: false, why: '손글씨 메모는 적격증빙이 아니에요.' },
  { label: '포장 용기 · 개인 소득공제용 현금영수증', qualified: false, why: '소득공제용이 아니라 지출증빙용으로 받아야 해요.' },
  { label: '가족 외식 · 사업용 카드', qualified: false, why: '사업과 관련 없는 지출은 비용이 아니에요.' },
  { label: '가스·전기 요금 · 사업자 명의 고지서', qualified: true, why: '사업장 공과금은 비용으로 인정받을 수 있어요.' },
  { label: '배달앱 수수료 · 플랫폼 발행 정산 내역', qualified: true, why: '플랫폼이 발행한 정산·수수료 내역을 보관해요.' },
]

/** 오늘의 영수증 정리 (4장) */
export function receiptsFor(date: string): Receipt[] {
  const r = rng(hash(`receipts:${date}`))
  return [...RECEIPTS].sort(() => r() - 0.5).slice(0, 4)
}
