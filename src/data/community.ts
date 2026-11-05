import type { Question } from '@/types'

/**
 * 커뮤니티 미리보기용 예시 글 — 서버 연결 전에는 이 예시와 사용자가 쓴 글이 기기에 저장됩니다.
 * 시간은 앱을 처음 연 시점 기준 상대값으로 만듭니다.
 */
export function seedQuestions(now: Date = new Date()): Question[] {
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
  return [
    {
      id: 'q-seed-1',
      category: 'tax',
      title: '카드 수수료도 비용 처리 되나요?',
      body: '카드 단말기 수수료가 매달 꽤 나가는데, 이것도 종합소득세 낼 때 비용으로 넣을 수 있는 건지 궁금합니다.',
      author: '망원동 국밥집',
      bizLabel: '음식점',
      createdAt: ago(3),
      likes: 12,
      answers: [
        {
          id: 'a-seed-1a',
          author: '연남동 분식',
          role: 'owner',
          body: '저는 카드사에서 보내주는 수수료 내역(가맹점 매출 정산 내역)을 모아서 세무사님께 드렸어요. 비용으로 들어갔습니다.',
          createdAt: ago(2),
          helpful: 5,
        },
        {
          id: 'a-seed-1b',
          author: '세무 멘토',
          role: 'mentor',
          body: '사업과 관련해 지출한 카드 가맹점 수수료는 일반적으로 필요경비에 해당해요. 카드사 정산 내역을 증빙으로 보관하세요. 배달앱 중개 수수료도 플랫폼에서 발급하는 내역을 함께 챙기면 좋아요.',
          createdAt: ago(1.5),
          helpful: 9,
        },
      ],
    },
    {
      id: 'q-seed-2',
      category: 'labor',
      title: '주말 알바 주 12시간이면 주휴수당 줘야 하나요?',
      body: '토·일 6시간씩 일하는 학생이 있어요. 주휴수당 대상인지 헷갈립니다.',
      author: '성수동 카페',
      bizLabel: '카페·베이커리',
      createdAt: ago(20),
      likes: 8,
      answers: [
        {
          id: 'a-seed-2a',
          author: '노무 멘토',
          role: 'mentor',
          body: '1주 소정근로시간이 15시간 미만이면 주휴수당 발생 요건에 해당하지 않아요. 다만 근무시간이 늘어 15시간 이상이 되면 달라지니 계약서의 소정근로시간을 정확히 적어 두세요. 근로계약서는 근로시간과 관계없이 작성·교부해야 해요.',
          createdAt: ago(18),
          helpful: 11,
        },
      ],
    },
    {
      id: 'q-seed-3',
      category: 'digital',
      title: '배달앱 별점 1점 테러, 답글 다는 게 나을까요?',
      body: '음식 사진도 없이 "맛없음" 한 줄 남기고 1점 줬어요. 답글을 달아야 할지 그냥 둘지 고민이에요.',
      author: '합정동 치킨',
      bizLabel: '음식점',
      createdAt: ago(30),
      likes: 15,
      answers: [
        {
          id: 'a-seed-3a',
          author: '상수동 족발',
          role: 'owner',
          body: '저는 짧게라도 꼭 달아요. "입맛에 맞지 않으셨다니 아쉽습니다. 어떤 점이 아쉬웠는지 알려주시면 더 신경 쓰겠습니다." 이렇게요. 다른 손님들이 답글 보고 오히려 믿음 간다고 하더라고요.',
          createdAt: ago(28),
          helpful: 7,
        },
      ],
    },
    {
      id: 'q-seed-4',
      category: 'support',
      title: '소상공인 지원사업 문자가 왔는데 진짜인가요?',
      body: '"정책자금 한도 조회" 링크가 있는 문자가 왔는데 눌러도 되는지 모르겠어요.',
      author: '을지로 인쇄소',
      bizLabel: '수리·서비스',
      createdAt: ago(52),
      likes: 21,
      answers: [
        {
          id: 'a-seed-4a',
          author: '지원사업 멘토',
          role: 'mentor',
          body: '출처가 불분명한 링크는 누르지 마세요. 공고는 소상공인24, 기업마당, 지자체 홈페이지에서 직접 확인하고, 헷갈리면 중소기업통합콜센터(1357)에 전화로 물어보는 게 안전해요.',
          createdAt: ago(50),
          helpful: 14,
        },
      ],
    },
    {
      id: 'q-seed-5',
      category: 'ops',
      title: '채소 값이 너무 올랐어요. 메뉴 가격 올려야 할까요?',
      body: '대파·양파 값이 올라서 원가가 확 뛰었어요. 단골들 눈치가 보여서 고민입니다.',
      author: '공덕동 백반',
      bizLabel: '음식점',
      createdAt: ago(75),
      likes: 9,
      answers: [
        {
          id: 'a-seed-5a',
          author: '운영 멘토',
          role: 'mentor',
          body: '먼저 메뉴별 원가율을 계산해서 가장 크게 오른 메뉴부터 보세요. 전체 인상보다 일부 메뉴 구성 조정(반찬 가짓수, 양)이나 세트 구성으로 버티는 방법도 있어요. 인상한다면 매장에 짧게 이유를 안내하면 단골 반응이 훨씬 부드러워요.',
          createdAt: ago(70),
          helpful: 6,
        },
      ],
    },
    {
      id: 'q-seed-6',
      category: 'marketing',
      title: '인스타 계정 만들었는데 팔로워가 안 늘어요',
      body: '한 달째 메뉴 사진만 올리는데 반응이 거의 없어요. 뭘 바꿔야 할까요?',
      author: '연희동 베이커리',
      bizLabel: '카페·베이커리',
      createdAt: ago(100),
      likes: 6,
      answers: [],
    },
  ]
}
