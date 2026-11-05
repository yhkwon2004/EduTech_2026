import type { ScheduleEvent } from '@/types'
import { nextBusinessDay, toKey } from '@/lib/date'

/**
 * 개인사업자 주요 세무·보험 일정 (일반 안내용)
 * - 기한이 주말이면 다음 월요일로 옮깁니다. 공휴일은 반영하지 않으니 홈택스에서 최종 확인하세요.
 */
const ANNUAL: { m: number; d: number; slug: string; title: string; memo: string }[] = [
  { m: 1, d: 25, slug: 'vat2', title: '부가세 2기 확정신고', memo: '7~12월분 부가가치세 신고·납부. 간이과세자는 1년치를 신고해요.' },
  { m: 2, d: 10, slug: 'exempt', title: '면세사업자 사업장현황신고', memo: '면세사업자는 지난해 수입금액 등을 신고해요.' },
  { m: 3, d: 10, slug: 'yearend', title: '연말정산 원천세 신고', memo: '직원이 있다면 2월분 원천세와 함께 근로소득 연말정산분을 신고해요.' },
  { m: 4, d: 25, slug: 'vat1pre', title: '부가세 1기 예정고지 납부', memo: '개인 일반과세자에게 고지서가 나온 경우 납부해요.' },
  { m: 5, d: 31, slug: 'income', title: '종합소득세 신고·납부', memo: '지난해 소득 신고. 성실신고확인 대상자는 6월 30일까지예요.' },
  { m: 7, d: 25, slug: 'vat1', title: '부가세 1기 확정신고', memo: '1~6월분 부가가치세 신고·납부. 간이과세자는 예정부과 고지서를 확인하세요.' },
  { m: 10, d: 25, slug: 'vat2pre', title: '부가세 2기 예정고지 납부', memo: '개인 일반과세자에게 고지서가 나온 경우 납부해요.' },
  { m: 11, d: 30, slug: 'interim', title: '종합소득세 중간예납 납부', memo: '고지서를 받은 경우 납부해요.' },
]

export function taxEventsForYear(year: number): ScheduleEvent[] {
  const list: ScheduleEvent[] = []
  for (const a of ANNUAL) {
    const date = nextBusinessDay(toKey(new Date(year, a.m - 1, a.d)))
    list.push({
      id: `preset-${year}-${a.slug}`,
      title: a.title,
      date,
      type: 'deadline',
      repeat: 'none',
      memo: `${a.memo}\n※ 정확한 기한과 대상은 국세청 홈택스·국세상담센터(126)에서 확인하세요.`,
      doneOn: {},
      preset: true,
    })
  }
  for (let m = 0; m < 12; m++) {
    const date = nextBusinessDay(toKey(new Date(year, m, 10)))
    list.push({
      id: `preset-${year}-${m + 1}-wh`,
      title: '원천세·4대보험료 납부',
      date,
      type: 'deadline',
      repeat: 'none',
      memo: '직원이 있는 사업장: 지난달 급여의 원천세 신고·납부와 4대보험료 납부 기한이에요.\n※ 반기별 납부 승인 사업장은 1월·7월에 납부해요.',
      doneOn: {},
      preset: true,
    })
  }
  return list.sort((a, b) => a.date.localeCompare(b.date))
}

const cache = new Map<number, ScheduleEvent[]>()

/** 기준 연도 앞뒤 1년치 */
export function taxEventsAround(year: number): ScheduleEvent[] {
  const out: ScheduleEvent[] = []
  for (const y of [year - 1, year, year + 1]) {
    if (!cache.has(y)) cache.set(y, taxEventsForYear(y))
    out.push(...cache.get(y)!)
  }
  return out
}
