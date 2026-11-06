"""
골목 장사왕 도트 캐릭터 원화 도구
- 부위별 도트를 정수 좌표에 직접 찍어 만들고 (모양 도우미 + 손으로 찍는 패턴 + 손으로 고른 명암)
- src/world/render/spriteData.ts 로 내보내요. 게임은 팔레트만 바꿔 끼워 합성해요.
    python3 tools/sprite_art.py export            → spriteData.ts
    python3 tools/sprite_art.py preview out.png   → 미리보기

캔버스 36×46, 발바닥 = 45번째 줄. 'F' = 앞 3/4(오른쪽을 봄), 'B' = 뒤 3/4(오른쪽 위를 봄). 왼쪽은 좌우 반전.

기호 (게임에서 색으로 바뀌어요)
  피부 1 밝게 2 기본 3 그늘 4 선       머리카락 h 밝게 H 기본 j 그늘 J 깊은그늘 K 선
  상의 t T y Y(선) u(깊은그늘)          하의 p P q Q        신발 f F g G
  흰천 w W v V                          포인트 r R x X      모자 c C d D e(깊은그늘)
  눈 # 진한 i 눈동자 l 눈동자밝게 o 반짝  입 m 진한 n 혀     볼 b   안경 @ 테 _ 알 s 선글라스
  금속 z Z
  다리 % & (바지면 하의, 아니면 피부)   양말 = + (바지면 하의, 아니면 흰천)
  소매 ~ ^ : (긴소매면 상의, 반팔이면 피부)
"""
import json
import math
import os
import sys

W, H = 36, 46
OFF = 6  # 모자가 들어갈 위쪽 여유 (그림 좌표 -6 ~ 45 → 캔버스 0 ~ 51)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Layer:
    def __init__(self, px=None):
        self.px = dict(px or {})

    def put(self, x, y, c):
        if 0 <= x < W and -OFF <= y < H and c not in ' .':
            self.px[(x, y)] = c
        return self

    def get(self, x, y):
        return self.px.get((x, y))

    def has(self, x, y):
        return (x, y) in self.px

    def stamp(self, x, y, rows):
        for j, row in enumerate(rows):
            for i, c in enumerate(row):
                self.put(x + i, y + j, c)
        return self

    def erase(self, x, y):
        self.px.pop((x, y), None)
        return self

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(-OFF, H):
            for x in range(W):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    self.put(x, y, c)
        return self

    def spans(self, spans, c):
        """{y: (x0, x1)}"""
        for y, (x0, x1) in spans.items():
            for x in range(x0, x1 + 1):
                self.put(x, y, c)
        return self

    def poly(self, pts, c):
        ys = [p[1] for p in pts]
        for y in range(max(-OFF, int(min(ys))), min(H, int(max(ys)) + 1)):
            for x in range(W):
                px, py = x + 0.5, y + 0.5
                inside = False
                n = len(pts)
                for i in range(n):
                    x1, y1 = pts[i]
                    x2, y2 = pts[(i + 1) % n]
                    if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
                        inside = not inside
                if inside:
                    self.put(x, y, c)
        return self

    def mask(self):
        return set(self.px.keys())

    def outline(self, c, diag=False):
        m = self.mask()
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if diag else [])
        add = set()
        for (x, y) in m:
            for dx, dy in nb:
                q = (x + dx, y + dy)
                if q not in m:
                    add.add(q)
        for q in add:
            self.put(q[0], q[1], c)
        return self

    def recolor(self, frm, to, where=lambda x, y: True):
        for (x, y), c in list(self.px.items()):
            if c in frm and where(x, y):
                self.px[(x, y)] = to
        return self

    def edge_shade(self, base, shade, right=True, bottom=True, left=False, top=False, where=lambda x, y: True):
        m = self.mask()
        for (x, y), c in list(self.px.items()):
            if c != base or not where(x, y):
                continue
            if (right and (x + 1, y) not in m) or (bottom and (x, y + 1) not in m) or (left and (x - 1, y) not in m) or (top and (x, y - 1) not in m):
                self.px[(x, y)] = shade
        return self

    def copy(self):
        return Layer(self.px)

    def shift(self, dx, dy):
        return Layer({(x + dx, y + dy): c for (x, y), c in self.px.items() if 0 <= x + dx < W and -OFF <= y + dy < H})

    def mirror_x(self, axis):
        return Layer({(round(2 * axis - x), y): c for (x, y), c in self.px.items()})

    def over(self, other):
        """other를 위에 덮기"""
        p = dict(self.px)
        p.update(other.px)
        return Layer(p)

    def export(self):
        if not self.px:
            return {'x': 0, 'y': 0, 'rows': []}
        xs = [p[0] for p in self.px]
        ys = [p[1] for p in self.px]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        rows = [''.join(self.px.get((x, y), '.') for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        return {'x': x0, 'y': y0 + OFF, 'rows': rows}


def merge(*layers):
    out = Layer()
    for l in layers:
        if l:
            out.px.update(l.px)
    return out


# ───────────────────────── 머리 (앞 3/4) ─────────────────────────
HEAD_SPANS = {
    6: (16, 19), 7: (13, 22), 8: (12, 23), 9: (11, 24), 10: (10, 25), 11: (9, 26),
    12: (9, 26), 13: (9, 26), 14: (9, 26), 15: (9, 26), 16: (9, 26), 17: (9, 26), 18: (9, 26),
    19: (9, 26), 20: (10, 26), 21: (10, 25), 22: (11, 25), 23: (13, 24), 24: (15, 22),
}


def head_mask():
    return Layer().spans(HEAD_SPANS, '2').mask()


def head_F():
    L = Layer().spans(HEAD_SPANS, '2')
    # 오른쪽 볼선·턱 그늘
    for y, (x0, x1) in HEAD_SPANS.items():
        if y >= 14:
            L.put(x1, y, '3')
        if y >= 22:
            for x in range(x0, x1 + 1):
                if (x, y + 1) not in L.px:
                    L.put(x, y, '3')
    L.put(24, 22, '3')
    # 귀 (왼쪽 뒤)
    L.stamp(7, 15, [
        '.22',
        '232',
        '232',
        '.22',
    ])
    L.outline('4')
    return L


# 눈: (가까운 눈 @x=13, 먼 눈 @x=21, 윗줄 y=16)
EYE_PATTERNS = {
    'round': (['.##.', '####', '#oi#', '#ill', '.ll.'], ['.##', '###', 'oi#', 'il#', 'll.']),
    'sparkle': (['.###', '####', '#oii', '#ilo', '.ll.'], ['##.', '###', 'oii', 'ilo', 'll.']),
    'smile': (['....', '.##.', '#..#', '....', '....'], ['...', '.#.', '#.#', '...', '...']),
    'sharp': (['####.', '.###', '.#oi', '.#il', '..l.'], ['###', '.##', 'oi#', 'il.', 'l..']),
    'sleepy': (['....', '....', '####', '#ill', '.ll.'], ['...', '...', '###', 'il#', 'l..']),
    'happy': (['....', '.##.', '#..#', '....', '....'], ['...', '.#.', '#.#', '...', '...']),
    'surprised': (['.##.', '#oo#', '#.i#', '#ii#', '.##.'], ['.#.', '#o#', '#i#', '#i#', '.#.']),
    'tired': (['....', '....', '####', '.ll.', '....'], ['...', '...', '###', 'l..', '...']),
    'closed': (['....', '....', '....', '####', '....'], ['...', '...', '...', '###', '...']),
}
EYE_STYLES = ['round', 'sparkle', 'smile', 'sharp', 'sleepy']

MOUTH_PATTERNS = {
    'smile': ['mm'],
    'grin': ['mmm', 'nn.'],
    'cat': ['m.m', '.m.'],
    'neutral': ['mm'],
    'surprised': ['.m.', 'mnm', '.m.'],
    'yawn': ['.m.', 'mnm', 'mnm', '.m.'],
    'talkOpen': ['mm', 'nm'],
    'talk': ['mm'],
    'happy': ['mmm', 'nnm'],
    'tired': ['mm.'],
}
MOUTH_STYLES = ['smile', 'grin', 'cat', 'neutral']


def eyes_F(key):
    near, far = EYE_PATTERNS[key]
    L = Layer()
    L.stamp(12, 16, near)
    L.stamp(21, 16, far)
    return L


def mouth_F(key):
    pat = MOUTH_PATTERNS[key]
    return Layer().stamp(19, 22 if len(pat) < 3 else 21, pat)


def blush_F():
    return Layer().stamp(11, 21, ['bb']).stamp(24, 21, ['b'])


def brows_F(style):
    L = Layer()
    if style == 0:
        L.stamp(13, 14, ['jj.']).stamp(21, 14, ['jj'])
    elif style == 1:
        L.stamp(12, 14, ['JJJ']).stamp(21, 14, ['JJ'])
    else:
        L.stamp(13, 13, ['jj']).stamp(21, 13, ['j.'])
    return L


# ───────────────────────── 머리카락 ─────────────────────────
def lock(L, x0, x1, base_y, tip_x, tip_y, c='H'):
    """아래로 뾰족한 머리 술 (위 폭 x0~x1, 끝 tip)"""
    L.poly([(x0, base_y), (x1 + 1, base_y), (tip_x + 0.9, tip_y + 1), (tip_x + 0.1, tip_y + 1)], c)
    return L


def shade_hair(L, ring=(), strands=(), dark_right=1, cut=None):
    """명암: 오른쪽·아래 끝은 그늘(j), 맨 끝 모서리는 깊은 그늘(J), 하이라이트 띠(h)"""
    m = L.mask()
    for (x, y) in list(m):
        if cut and not cut(x, y):
            continue
        r = (x + 1, y) not in m
        b = (x, y + 1) not in m
        if r or b:
            L.px[(x, y)] = 'j'
            if r and b:
                L.px[(x, y)] = 'J'
        if dark_right > 1 and (x + 2, y) not in m and (x + 1, y) in m:
            L.px[(x, y)] = 'j'
    for p in strands:
        if p in m:
            L.px[p] = 'j'
    for p in ring:
        if p in m:
            L.px[p] = 'h'
    return L


def forehead_shadow(L):
    """머리카락 바로 아래 피부에 그늘 한 줄 (눈 줄은 건드리지 않아요)"""
    hm = head_mask()
    add = []
    for (x, y), c in L.px.items():
        q = (x, y + 1)
        if q not in L.px and q in hm and y + 1 < 16:
            add.append(q)
    for q in add:
        L.put(q[0], q[1], '3')
    return L


def crown(rx=10.9, ry=10.6, cx=18.2, cy=13.4, until=11):
    L = Layer()
    for y in range(0, until + 1):
        for x in range(W):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1.0:
                L.put(x, y, 'H')
    return L


RING = [(12, 5), (13, 5), (14, 4), (15, 4), (16, 4), (11, 6), (17, 5), (10, 7)]


def hair_short_F():
    L = crown(until=11)
    # 뒷머리(왼쪽): 귀 위까지
    L.spans({12: (7, 10), 13: (7, 10), 14: (7, 9), 15: (8, 8)}, 'H')
    # 앞머리 술
    lock(L, 9, 13, 10, 10, 16)
    lock(L, 13, 18, 10, 15, 14)
    lock(L, 18, 23, 10, 20, 15)
    lock(L, 23, 27, 10, 25, 14)
    lock(L, 26, 28, 10, 27, 18)
    shade_hair(L, RING, strands=[(13, 11), (13, 12), (18, 11), (18, 12), (23, 11), (23, 12)])
    L.outline('K')
    return forehead_shadow(L)


def hair_bob_F():
    L = crown(rx=11.3, until=12)
    L.spans({13: (7, 10), 14: (7, 10), 15: (7, 10), 16: (7, 10), 17: (7, 10), 18: (7, 10), 19: (8, 10), 20: (8, 10), 21: (9, 10)}, 'H')
    # 반듯한 앞머리 (살짝 들쭉날쭉)
    L.spans({11: (9, 27), 12: (9, 27)}, 'H')
    for x in range(10, 27):
        if x % 3 != 0:
            L.put(x, 13, 'H')
    # 오른쪽 옆머리 (볼 옆으로 내려옴)
    L.spans({14: (25, 28), 15: (25, 28), 16: (25, 28), 17: (25, 28), 18: (25, 28), 19: (25, 28), 20: (25, 27), 21: (25, 27), 22: (26, 27)}, 'H')
    shade_hair(L, RING + [(9, 8)], strands=[(13, 12), (17, 12), (21, 12), (26, 17), (8, 17)])
    L.outline('K')
    return forehead_shadow(L)


def hair_long_front_F():
    L = hair_bob_F()
    return L


def hair_curly_F():
    L = crown(rx=11.8, ry=11.2, until=12)
    # 몽글몽글 바깥선
    for (cx, cy, r) in [(9, 9, 2.6), (8, 13, 2.4), (11, 5, 2.6), (16, 3, 2.8), (21, 3.5, 2.7), (26, 6, 2.6), (28, 10, 2.4), (28, 14, 2.2)]:
        L.ellipse(cx, cy, r, r, 'H')
    lock(L, 9, 14, 11, 11, 15)
    lock(L, 13, 18, 11, 16, 14)
    lock(L, 17, 22, 11, 20, 15)
    lock(L, 21, 26, 11, 24, 14)
    lock(L, 25, 28, 11, 27, 17)
    L.spans({13: (7, 10), 14: (7, 10), 15: (7, 9), 16: (7, 9)}, 'H')
    shade_hair(L, [(11, 4), (12, 4), (15, 2), (16, 2), (10, 6), (20, 2)], strands=[(13, 7), (18, 6), (23, 7), (15, 10), (21, 10)])
    L.outline('K')
    return forehead_shadow(L)


def hair_spiky_F():
    L = crown(until=11)
    # 뾰족한 윗머리
    for (bx, tx, ty) in [(11, 9, 2), (15, 14, 0), (19, 20, 0), (23, 25, 2), (26, 29, 6)]:
        L.poly([(bx - 2, 7), (bx + 3, 7), (tx + 0.5, ty)], 'H')
    L.spans({12: (7, 10), 13: (7, 10), 14: (7, 9)}, 'H')
    lock(L, 9, 14, 10, 11, 16)
    lock(L, 13, 17, 10, 15, 14)
    lock(L, 17, 21, 10, 19, 15)
    lock(L, 21, 25, 10, 23, 13)
    lock(L, 24, 28, 10, 27, 16)
    shade_hair(L, [(12, 5), (13, 5), (14, 4), (15, 3), (16, 4), (11, 6)], strands=[(14, 8), (19, 8), (23, 8)])
    L.outline('K')
    return forehead_shadow(L)


def hair_bun_F():
    L = crown(rx=10.4, ry=10.2, until=11)
    # 이마를 드러내고 옆으로 넘긴 머리
    L.spans({11: (8, 27), 12: (8, 12), 13: (8, 11), 14: (8, 10)}, 'H')
    lock(L, 20, 27, 10, 26, 15)
    L.spans({12: (24, 27), 13: (25, 27)}, 'H')
    shade_hair(L, [(12, 5), (13, 5), (14, 4), (15, 4), (11, 6), (16, 4)], strands=[(16, 9), (20, 9)])
    L.outline('K')
    return forehead_shadow(L)


def hair_buzz_F():
    L = crown(rx=9.9, ry=9.6, cy=14.2, until=10)
    L.spans({11: (8, 10), 12: (8, 10), 13: (8, 9)}, 'H')
    L.recolor('H', 'j', lambda x, y: (x + y) % 2 == 0 and y > 6)
    shade_hair(L, [(13, 6), (14, 5), (15, 5), (16, 5)])
    L.outline('K')
    return forehead_shadow(L)


def hair_ponytail_F():
    L = hair_short_F()
    return L


HAIR_FRONT_F = {
    0: hair_short_F,
    1: hair_bob_F,
    2: hair_ponytail_F,
    3: hair_long_front_F,
    4: hair_curly_F,
    5: hair_spiky_F,
    6: hair_bun_F,
    7: hair_buzz_F,
}


# 뒤로 늘어진 머리 (몸 뒤에 그려요)
def hair_back_F(style):
    L = Layer()
    if style == 1:  # 단발: 목 뒤
        L.spans({18: (8, 12), 19: (8, 12), 20: (8, 12), 21: (8, 13), 22: (9, 13), 23: (9, 13)}, 'H')
        shade_hair(L)
        L.outline('K')
    elif style == 3:  # 긴 머리: 등까지
        L.spans({y: (6, 12) for y in range(14, 31)}, 'H')
        L.spans({y: (24, 29) for y in range(16, 30)}, 'H')
        L.spans({30: (7, 11), 31: (8, 10)}, 'H')
        L.spans({30: (25, 28), 31: (26, 27)}, 'H')
        shade_hair(L, strands=[(9, y) for y in range(18, 28)] + [(27, y) for y in range(19, 28)])
        for y in range(15, 29, 3):
            L.put(7, y, 'h')
        L.outline('K')
    elif style == 2:  # 포니테일: 뒤통수에서 왼쪽으로
        L.poly([(5, 9), (10, 7), (11, 13), (8, 22), (5, 26), (3, 23), (4, 15)], 'H')
        shade_hair(L, ring=[(6, 12), (6, 13), (5, 16)], strands=[(7, 15), (7, 18), (6, 21)])
        L.outline('K')
        L.stamp(8, 9, ['RR', 'Rx'])  # 머리끈
    elif style == 6:  # 똥머리
        L.ellipse(11.5, 4.5, 4.2, 3.8, 'H')
        shade_hair(L, ring=[(10, 2), (11, 2), (9, 3)], strands=[(12, 4), (13, 5)])
        L.outline('K')
    return L


# ───────────────────────── 몸 (앞 3/4) ─────────────────────────
def neck_F():
    return Layer().stamp(16, 23, ['33', '33', '3'])


TORSO_BASE = [
    '...TTTTTT...',
    '.TTTTTTTTTT.',
    'TTTTTTTTTTTy',
    'TTTTTTTTTTyy',
    'tTTTTTTTTTyy',
    'tTTTTTTTTTyy',
    'TTTTTTTTTTyy',
    'TTTTTTTTTyyy',
    'TTTTTTTTTyyy',
    'yyyyyyyyyyyy',
]


def torso_F(top):
    L = Layer().stamp(12, 25, TORSO_BASE)
    if top == 0:  # 티셔츠: 둥근 목선
        L.stamp(15, 25, ['y22y', '.yy.'])
    elif top == 1:  # 후드티: 후드 + 주머니 + 끈
        L.stamp(13, 24, ['.yyuuuuy.', 'yy....yyy'])
        L.stamp(15, 25, ['.22.'])
        L.stamp(15, 26, ['w..w', 'w..w'])
        L.stamp(13, 30, ['.yyyyyyy.', 'y.......y', 'yyyyyyyyy'])
    elif top == 2:  # 셔츠: 깃 + 단추
        L.stamp(14, 25, ['tt22tt', '.tt.t.'])
        for y in (28, 30, 32):
            L.put(18, y, 'u')
        L.put(18, 27, 'y')
        L.put(18, 29, 'y')
        L.put(18, 31, 'y')
    elif top == 3:  # 니트: 줄무늬 + 밑단
        L.stamp(15, 25, ['y22y', '.yy.'])
        for y in (28, 31):
            for x in range(12, 24):
                L.put(x, y, 'w' if x < 21 else 'v')
        for x in range(12, 24):
            L.put(x, 34, 'u' if x % 2 else 'y')
    L.outline('Y')
    return L


def apron_F():
    L = Layer()
    L.stamp(14, 26, [
        '.w....w.',
        'wWWWWWWv',
        'WWWWWWWv',
        'WvvvvWWv',
        'WvWWvWWv',
        'WvvvvWWv',
        'WWWWWWvv',
        'WWWWWWvv',
        'vvvvvvvv',
    ])
    for y in range(27, 35):
        L.put(13, y, 'V')
    for x in range(14, 22):
        L.put(x, 35, 'V')
    return L


def tie_F():
    L = Layer()
    L.stamp(15, 25, ['WW.WW', '.WRW.', '..R..', '.RRx.', '.RRx.', '.RRx.', '..x..'])
    L.stamp(13, 29, ['WW', 'Wz'])  # 사원증
    return L


def waist_F(bottom):
    L = Layer()
    if bottom == 2:  # 치마
        L.stamp(11, 33, [
            '.PPPPPPPPPPPq.',
            'pPPPPPPPPPPPqq',
            'pPPPPqPPPPPqqq',
            'PPPPqPPPPPqqqq',
            'qqqqqqqqqqqqqq',
        ])
        L.outline('Q')
    else:
        L.stamp(12, 34, ['QQQQQzQQQQQQ'])
    return L


# 팔: 어깨 기준점에서 그린 패턴
ARM_NEAR = {
    'idle': ['TT.', 'TTy', 'tTy', '~~^', '~~^', '~~^', '122', '123'],
    'back': ['.TT', 'TTy', 'tTy', '~~^.', '.~~^', '.~~^', '.122', '.123'],
    'fwd': ['TT.', 'TTy', 'tTy', '~~^', '~~^', '~~^', '122', '123'],
}


def arm_shape(x, y, length, dx_per_row, sleeve_rows, hand=True, wide=3):
    """기울어진 팔 (dx_per_row: 한 줄 내려갈 때 x 변화)"""
    L = Layer()
    for k in range(length):
        xx = x + round(dx_per_row * k)
        for w in range(wide):
            c = ('t' if w == 0 else ('T' if w < wide - 1 else 'y')) if k < sleeve_rows else ('~' if w < wide - 1 else '^')
            L.put(xx + w, y + k, c)
    if hand:
        hx = x + round(dx_per_row * length)
        L.stamp(hx, y + length, ['122', '123'])
    return L


def arm_F(side, pose, long_sleeve_rows=3):
    """side: 'near'(왼쪽) / 'far'(오른쪽, 몸 뒤)"""
    L = Layer()
    if side == 'near':
        x, y = 10, 26
        if pose == 'idle':
            L = arm_shape(x, y, 6, 0, long_sleeve_rows)
        elif pose == 'swingA':  # 뒤로
            L = arm_shape(x, y, 6, -0.25, long_sleeve_rows)
        elif pose == 'swingB':  # 앞으로
            L = arm_shape(x, y, 6, 0.3, long_sleeve_rows)
        elif pose == 'up':  # 만세
            L.stamp(6, 16, ['.12.', '1222', '2223', '.~^.', '.~^.', '.~^.', '.~T.', '.tTT', '..tTT', '...TT'])
        elif pose == 'stretch':
            L.stamp(8, 12, ['12.', '222', '.~^', '.~^', '.~^', '.~^', '.~^', '.TT', '.Ty', '.TTy', '..TTy', '...Ty', '....T'])
        elif pose == 'mouth':  # 하품: 손으로 입 가리기
            L.stamp(10, 21, ['.122', '.123', '~~^.', '~^..', 'TT..', 'Ty..'])
        else:
            L = arm_shape(x, y, 6, 0, long_sleeve_rows)
    else:
        x, y = 23, 26
        if pose == 'idle':
            L = arm_shape(x, y, 6, 0.0, long_sleeve_rows)
        elif pose == 'swingA':  # 앞으로 (가까운 팔과 반대)
            L = arm_shape(x, y, 6, 0.3, long_sleeve_rows)
        elif pose == 'swingB':
            L = arm_shape(x, y, 6, -0.2, long_sleeve_rows)
        elif pose == 'wave1':
            L.stamp(26, 15, ['.12.', '1222', '2223', '.~^.', '.~^.', '.~^.', 'T~^.', 'TTy.', 'TTy..'])
            L.stamp(23, 23, ['TTy', 'Ty.'])
        elif pose == 'wave2':
            L.stamp(27, 16, ['12..', '222.', '223.', '~^..', '~^..', '~^..'])
            L.stamp(25, 22, ['T~^', 'TTy', 'TTy'])
            L.stamp(23, 24, ['Ty', 'y.'])
        elif pose == 'up':
            L.stamp(26, 16, ['.21.', '2221', '3222', '.^~.', '.^~.', '.^~.', '.T~.', 'TTt.', 'TTt..', 'TT...'])
            L.stamp(23, 25, ['TT'])
        elif pose == 'stretch':
            L.stamp(25, 12, ['.21', '222', '~^.', '~^.', '~^.', '~^.', '~^.', 'TT.', 'Ty.', 'TTy', 'TTy.', 'Ty..', 'y...'])
            L.stamp(23, 24, ['TT'])
        elif pose == 'work1':  # 망치 들기
            L.stamp(24, 21, ['....zz', '...122', '..~~^.', '.~~^..', 'TTy...', 'Ty....'])
        elif pose == 'work2':  # 내려치기
            L.stamp(24, 26, ['TTT~~^12', 'yyy~~^23', '......zz'])
        else:
            L = arm_shape(x, y, 6, 0.0, long_sleeve_rows)
    # 선: 소매 부분은 상의 선, 손·맨팔은 피부 선
    out = L.copy()
    m = L.mask()
    inner = 1 if side == 'near' else -1
    for (px, py), c in L.px.items():
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (px + dx, py + dy)
            if q not in m and q not in out.px:
                toward_body = dx == inner and pose in ('idle', 'swingA', 'swingB') and 26 <= q[1] <= 34
                if toward_body:
                    out.put(q[0], q[1], 'u' if c in 'tTyu' else ('^' if c in '~^' else '3'))
                else:
                    out.put(q[0], q[1], 'Y' if c in 'tTyu' else (':' if c in '~^' else '4'))
    return out


# 다리 프레임: (가까운 다리 x, 먼 다리 x, 가까운 다리 들림, 먼 다리 들림)
LEG_FRAMES = {
    'idle': (14, 19, 0, 0),
    'stepA': (13, 20, 0, 0),
    'passA': (15, 18, 1, 0),
    'stepB': (15, 18, 0, 0),
    'passB': (14, 19, 0, 1),
    'jump': (14, 19, 1, 1),
}


def legs_F(frame):
    nx, fx, nl, fl = LEG_FRAMES[frame]
    L = Layer()
    # 먼 다리 (조금 어둡게)
    for k in range(6 - fl):
        L.put(fx, 35 + k, '%' if k < 4 else '=')
        L.put(fx + 1, 35 + k, '&' if k < 4 else '+')
    for k in range(6 - nl):
        L.put(nx, 35 + k, '%' if k < 4 else '=')
        L.put(nx + 1, 35 + k, '%' if k < 4 else '=')
        L.put(nx + 2, 35 + k, '&' if k < 4 else '+')
    L.outline('Q')
    # 신발: 오른쪽을 향해
    S = Layer()
    S.stamp(fx - 1, 41 - fl, ['.FFg', 'FFFgg'])
    S.stamp(nx - 1, 41 - nl, ['.fFFg', 'FFFFgg'])
    S.outline('G')
    # 밑창 (밝은 줄)
    for (x, y), c in list(S.px.items()):
        if c == 'G' and (x, y - 1) in S.px and S.px[(x, y - 1)] in 'Fg' and y >= 43 - min(nl, fl):
            S.px[(x, y)] = 'Z' if False else 'g'
    for (x, y) in list(S.px):
        if y > 44:
            S.erase(x, y)
    return merge(L, S)


# ───────────────────────── 모자 (앞 3/4) ─────────────────────────
def hat_F(kind):
    L = Layer()
    if kind == 1:  # 야구모자
        L.ellipse(18.2, 10.6, 10.4, 8.4, 'C')
        for (x, y) in list(L.px):
            if y > 10:
                L.erase(x, y)
        L.stamp(20, 10, ['dddddddddd', '.eeeeeeeeee'])
        L.edge_shade('C', 'd')
        L.stamp(12, 4, ['cc', 'c'])
        L.put(18, 2, 'e')
        L.outline('D')
    elif kind == 2:  # 비니
        L.ellipse(18.2, 11.4, 10.8, 9.4, 'C')
        for (x, y) in list(L.px):
            if y > 10:
                L.erase(x, y)
        L.spans({9: (7, 29), 10: (7, 29), 11: (7, 29)}, 'd')
        for x in range(8, 29, 2):
            L.put(x, 10, 'e')
        L.edge_shade('C', 'd')
        L.stamp(12, 4, ['cc', 'c'])
        L.ellipse(18.5, 1.6, 2.2, 1.8, 'c')
        L.outline('D')
    elif kind == 3:  # 요리사 모자
        for (cx, cy, r) in [(12.6, 1.4, 3.8), (17.8, -1.6, 4.8), (23.4, 1.2, 3.9), (15, 2.6, 3.4), (21, 2.6, 3.4)]:
            L.ellipse(cx, cy, r, r * 0.92, 'W')
        L.spans({4: (9, 27), 5: (9, 27), 6: (9, 27), 7: (9, 27), 8: (9, 27)}, 'W')
        L.edge_shade('W', 'v')
        L.spans({7: (9, 27), 8: (9, 27)}, 'v')
        L.spans({4: (10, 26)}, 'v')
        for (x, y) in [(13, -1), (14, -2), (17, -5), (18, -5), (19, -4), (11, 0), (12, -1)]:
            L.put(x, y, 'w')
        for (x, y) in [(15, 1), (20, 0), (16, -1), (21, 1)]:
            L.put(x, y, 'v')
        L.outline('V')
    elif kind == 4:  # 머리띠
        for x in range(8, 29):
            y = round(8.5 + 0.0016 * (x - 18) ** 4 / 10 + abs(x - 18) * 0.12)
            L.put(x, y, 'C')
            L.put(x, y + 1, 'd')
        L.stamp(25, 5, ['CC.CC', 'CdCdC', '.CC.C'])
        L.outline('D')
    elif kind == 5:  # 밀짚모자
        L.ellipse(18.4, 9.5, 14.4, 3.4, 'C')
        L.ellipse(18.4, 7.2, 8.6, 6.4, 'C')
        for (x, y) in list(L.px):
            if y > 11:
                L.erase(x, y)
        L.spans({7: (11, 26), 8: (11, 26)}, 'R')
        L.put(26, 8, 'x')
        L.put(26, 7, 'x')
        for x in range(5, 33, 3):
            L.put(x, 10, 'd')
        L.edge_shade('C', 'd')
        L.stamp(13, 2, ['cc', 'cc'])
        L.outline('D')
    return L


def glasses_F(kind):
    L = Layer()
    if kind == 1:  # 동그란 안경
        L.stamp(11, 15, ['.@@@@.', '@____@', '@....@', '@....@', '@....@', '.@@@@.'])
        L.stamp(20, 15, ['.@@@.', '@___@', '@...@', '@...@', '@...@', '.@@@.'])
        L.stamp(17, 17, ['@@@'])
    elif kind == 2:  # 네모 안경
        L.stamp(11, 15, ['@@@@@@', '@____@', '@....@', '@....@', '@....@', '@@@@@@'])
        L.stamp(20, 15, ['@@@@@', '@___@', '@...@', '@...@', '@...@', '@@@@@'])
        L.stamp(17, 17, ['@@@'])
    elif kind == 3:  # 선글라스
        L.stamp(11, 16, ['@@@@@@', '@sssS@', '@ssss@', '@ssss@', '.@@@@.'])
        L.stamp(20, 16, ['@@@@@', '@ssS@', '@sss@', '@sss@', '.@@@.'])
        L.stamp(17, 17, ['@@@'])
    return L


# ───────────────────────── 뒷모습 (뒤 3/4) ─────────────────────────
def head_B():
    L = Layer().spans(HEAD_SPANS, '2')
    L.stamp(7, 15, ['.22', '232', '232', '.22'])
    L.edge_shade('2', '3')
    L.outline('4')
    return L


def hair_B(style):
    """뒷모습은 머리카락이 머리 전체를 덮어요"""
    L = Layer()
    if style == 7:
        L.ellipse(18.0, 14.4, 9.8, 9.4, 'H')
        for (x, y) in list(L.px):
            if y > 20:
                L.erase(x, y)
        L.recolor('H', 'j', lambda x, y: (x + y) % 2 == 0)
        shade_hair(L, [(12, 6), (13, 5), (14, 5)])
        L.outline('K')
        return L
    L.ellipse(18.2, 13.4, 10.9 + (0.6 if style in (1, 4) else 0), 10.6, 'H')
    nape = {0: 21, 1: 23, 2: 20, 3: 23, 4: 21, 5: 21, 6: 19}[style]
    for (x, y) in list(L.px):
        if y > nape:
            L.erase(x, y)
    if style == 4:
        for (cx, cy, r) in [(9, 9, 2.6), (8, 14, 2.4), (11, 5, 2.6), (16, 3, 2.8), (21, 3.5, 2.7), (26, 6, 2.6), (28, 11, 2.4), (28, 16, 2.2), (10, 19, 2.2), (25, 20, 2.2)]:
            L.ellipse(cx, cy, r, r, 'H')
    if style == 5:
        for (bx, tx, ty) in [(11, 9, 2), (15, 14, 0), (19, 20, 0), (23, 25, 2), (26, 29, 6)]:
            L.poly([(bx - 2, 7), (bx + 3, 7), (tx + 0.5, ty)], 'H')
    if style in (0, 4, 5):  # 목덜미 술
        for (x0, x1, tx, ty) in [(11, 15, 13, 23), (15, 20, 17, 24), (20, 24, 22, 23)]:
            lock(L, x0, x1, 19, tx, ty)
    if style in (1, 3):
        L.spans({22: (9, 27), 23: (9, 27), 24: (10, 26)}, 'H')
    if style == 3:
        L.spans({24: (10, 26), 25: (10, 26), 26: (10, 26), 27: (10, 26), 28: (10, 26), 29: (10, 26), 30: (10, 26), 31: (11, 25), 32: (11, 25)}, 'H')
        for x in range(11, 26):
            L.put(x, 33, 'H')
            if x % 4 != 2:
                L.put(x, 34, 'H')
            if x % 4 == 0:
                L.put(x, 35, 'H')
    strands = [(14, y) for y in range(10, 20)] + [(21, y) for y in range(11, 21)] + [(17, y) for y in range(15, 21)]
    if style == 3:
        strands += [(14, y) for y in range(23, 33)] + [(18, y) for y in range(22, 34)] + [(22, y) for y in range(23, 33)]
    ring = [(13, 5), (14, 5), (15, 4), (16, 4), (17, 4), (12, 6), (18, 4), (11, 7), (19, 5)]
    if style == 3:
        ring += [(12, y) for y in range(25, 31)] + [(11, 26), (11, 27)]
    shade_hair(L, ring, strands)
    if style in (1, 3):  # 목덜미 아래 그늘 띠
        for x in range(11, 26):
            if L.get(x, 22) == 'H':
                L.put(x, 22, 'j')
    L.outline('K')
    # 포니테일·똥머리
    if style == 2:
        T = Layer().poly([(15, 8), (21, 8), (22, 15), (19, 24), (17, 27), (15, 22), (14, 14)], 'H')
        shade_hair(T, ring=[(16, 11), (16, 12), (16, 15)], strands=[(18, 13), (18, 17), (18, 20)])
        T.outline('K')
        T.stamp(16, 8, ['RRRR', 'xRRx'])
        L = L.over(T)
    if style == 6:
        T = Layer().ellipse(18.0, 4.4, 4.4, 3.8, 'H')
        shade_hair(T, ring=[(16, 2), (17, 2), (15, 3)])
        T.outline('K')
        L = L.over(T)
    return L


def torso_B(top, role):
    L = Layer().stamp(12, 25, TORSO_BASE)
    if top == 1:
        L.stamp(13, 24, ['.yyyyyyy.', 'yuuuuuuuy', '.yuuuuuy.', '..yuuuy..', '...yyy...'])
    elif top == 3:
        for y in (28, 31):
            for x in range(12, 24):
                L.put(x, y, 'w' if x < 21 else 'v')
        for x in range(12, 24):
            L.put(x, 34, 'u' if x % 2 else 'y')
    elif top == 2:
        L.stamp(14, 25, ['tttttt'])
    L.outline('Y')
    if role == 'owner':  # 앞치마 끈 리본
        L.stamp(14, 29, ['WW.WW', 'WvWvW', '.vWv.', '.W.W.'])
        L.stamp(12, 30, ['W', '.'])
        L.put(23, 30, 'W')
    return L


def neck_B():
    return Layer().stamp(16, 23, ['22', '33'])


def legs_B(frame):
    nx, fx, nl, fl = LEG_FRAMES[frame]
    L = Layer()
    # 뒤에서 보면 오른쪽 다리가 가까워요
    near_x, far_x = nx, fx
    for k in range(6 - fl):
        L.put(far_x, 35 + k, '%' if k < 4 else '=')
        L.put(far_x + 1, 35 + k, '&' if k < 4 else '+')
    for k in range(6 - nl):
        L.put(near_x, 35 + k, '%' if k < 4 else '=')
        L.put(near_x + 1, 35 + k, '%' if k < 4 else '=')
        L.put(near_x + 2, 35 + k, '&' if k < 4 else '+')
    L.outline('Q')
    S = Layer()
    S.stamp(far_x - 1, 41 - fl, ['.FFg', 'gFFFg'])
    S.stamp(near_x - 1, 41 - nl, ['.fFFg', 'gFFFFg'])
    S.outline('G')
    for (x, y) in list(S.px):
        if y > 44:
            S.erase(x, y)
    return merge(L, S)


def hat_B(kind):
    L = hat_F(kind)
    if kind == 1:  # 챙은 앞쪽(오른쪽 위) → 뒤에서 보면 머리 너머로 살짝
        L = Layer()
        L.ellipse(18.2, 10.6, 10.4, 8.4, 'C')
        for (x, y) in list(L.px):
            if y > 11:
                L.erase(x, y)
        L.edge_shade('C', 'd')
        L.stamp(13, 9, ['..dddd..', '.d....d.'])
        L.stamp(12, 4, ['cc', 'c'])
        L.outline('D')
    return L


# ───────────────────────── 내보내기 ─────────────────────────
POSES = {
    # 이름: (가까운 팔, 먼 팔, 다리, 몸 높이, 머리 추가 높이)
    'idle': ('idle', 'idle', 'idle', 0, 0),
    'breath': ('idle', 'idle', 'idle', 1, 0),
    'walk0': ('swingA', 'swingA', 'stepA', 0, 0),
    'walk1': ('idle', 'idle', 'passA', -1, 0),
    'walk2': ('swingB', 'swingB', 'stepB', 0, 0),
    'walk3': ('idle', 'idle', 'passB', -1, 0),
    'wave1': ('idle', 'wave1', 'idle', 0, 0),
    'wave2': ('idle', 'wave2', 'idle', 0, 0),
    'cheer0': ('idle', 'idle', 'idle', 1, 0),
    'cheer1': ('up', 'up', 'jump', -4, 0),
    'cheer2': ('up', 'up', 'jump', -2, 0),
    'work1': ('idle', 'work1', 'idle', 0, 1),
    'work2': ('idle', 'work2', 'idle', 1, 1),
    'stretch': ('stretch', 'stretch', 'idle', -1, 0),
    'yawn': ('mouth', 'idle', 'idle', 0, -1),
    'nod': ('idle', 'idle', 'idle', 0, 1),
    'hop': ('idle', 'idle', 'jump', -3, 0),
}


def export():
    data = {'W': W, 'H': H + OFF, 'F': {}, 'B': {}}
    F, B = data['F'], data['B']
    F['head'] = head_F().export()
    F['neck'] = neck_F().export()
    F['eyes'] = {k: eyes_F(k).export() for k in EYE_PATTERNS}
    F['mouth'] = {k: mouth_F(k).export() for k in MOUTH_PATTERNS}
    F['blush'] = blush_F().export()
    F['brows'] = [brows_F(i).export() for i in range(3)]
    F['hairFront'] = [HAIR_FRONT_F[i]().export() for i in range(8)]
    F['hairBack'] = [hair_back_F(i).export() for i in range(8)]
    F['torso'] = [torso_F(i).export() for i in range(4)]
    F['apron'] = apron_F().export()
    F['tie'] = tie_F().export()
    F['waist'] = [waist_F(i).export() for i in range(3)]
    F['hat'] = [hat_F(i).export() for i in range(6)]
    F['glasses'] = [glasses_F(i).export() for i in range(4)]
    arms = {}
    for side in ('near', 'far'):
        for pose in ('idle', 'swingA', 'swingB', 'wave1', 'wave2', 'up', 'stretch', 'work1', 'work2', 'mouth'):
            for sl in (3, 6):
                arms[f'{side}:{pose}:{sl}'] = arm_F(side, pose, sl).export()
    F['arm'] = arms
    F['legs'] = {k: legs_F(k).export() for k in LEG_FRAMES}
    B['head'] = head_B().export()
    B['neck'] = neck_B().export()
    B['hair'] = [hair_B(i).export() for i in range(8)]
    B['torso'] = {f'{t}:{r}': torso_B(t, r).export() for t in range(4) for r in ('owner', 'employee', 'npc')}
    B['waist'] = [waist_F(i).export() for i in range(3)]
    B['hat'] = [hat_B(i).export() for i in range(6)]
    B['legs'] = {k: legs_B(k).export() for k in LEG_FRAMES}
    # 뒷모습 팔: 앞모습 팔을 그대로 쓰되 가까운/먼 팔이 바뀌어요
    data['poses'] = POSES
    path = os.path.join(ROOT, 'src/world/render/spriteData.ts')
    with open(path, 'w') as f:
        f.write('// 자동 생성: tools/sprite_art.py export — 손으로 고치지 말고 도구에서 고쳐 주세요\n')
        f.write('/* eslint-disable */\n')
        f.write('export const SPRITE = ')
        f.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        f.write(' as const\n')
    print('exported', path, os.path.getsize(path), 'bytes')


# ───────────────────────── 미리보기 ─────────────────────────
def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ramp(base, kind='cloth'):
    b = hexrgb(base)
    lum = (0.3 * b[0] + 0.59 * b[1] + 0.11 * b[2]) / 255
    L = mix(b, (255, 246, 220), 0.35 if lum < 0.85 else 0.6)
    S = mix(mix(b, (78, 60, 140), 0.26), (0, 0, 0), 0.06)
    D = mix(mix(b, (52, 36, 110), 0.45), (0, 0, 0), 0.12)
    O = mix(b, (24, 14, 38), 0.74)
    if kind == 'skin':
        L = mix(b, (255, 252, 244), 0.45)
        S = mix(b, (222, 120, 118), 0.3)
        D = mix(b, (180, 80, 90), 0.5)
        O = mix(b, (92, 38, 44), 0.74)
    return L, b, S, D, O


def palette(look):
    sk = ramp(look['skin'], 'skin')
    hr = ramp(look['hair'])
    tp = ramp(look['top'])
    bt = ramp(look['bottom'])
    sh = ramp(look['shoes'])
    wh = ramp('#FBF8F0')
    ac = ramp('#E2453E')
    ht = ramp(look.get('hatColor', look['top']))
    iris = hexrgb(look['eye'])
    pal = {
        '1': sk[0], '2': sk[1], '3': sk[2], '4': sk[4],
        'h': hr[0], 'H': hr[1], 'j': hr[2], 'J': hr[3], 'K': hr[4],
        't': tp[0], 'T': tp[1], 'y': tp[2], 'u': tp[3], 'Y': tp[4],
        'p': bt[0], 'P': bt[1], 'q': bt[2], 'Q': bt[4],
        'f': sh[0], 'F': sh[1], 'g': sh[2], 'G': sh[4],
        'w': wh[0], 'W': wh[1], 'v': wh[2], 'V': wh[4],
        'r': ac[0], 'R': ac[1], 'x': ac[2], 'X': ac[4],
        'c': ht[0], 'C': ht[1], 'd': ht[2], 'e': ht[3], 'D': ht[4],
        '#': (40, 28, 52), 'i': mix(iris, (40, 28, 52), 0.25), 'l': mix(iris, (255, 255, 255), 0.42), 'o': (255, 255, 255),
        'm': (128, 44, 56), 'n': (236, 124, 132), 'b': mix(hexrgb(look['skin']), (255, 112, 138), 0.42),
        '@': (58, 48, 66), '_': (215, 235, 250), 's': (40, 34, 52), 'S': (120, 116, 150), 'z': (242, 196, 76), 'Z': (170, 120, 40),
    }
    pants = look.get('bottomType', 0) == 0
    pal['%'] = pal['P'] if pants else pal['2']
    pal['&'] = pal['q'] if pants else pal['3']
    pal['='] = pal['P'] if pants else pal['W']
    pal['+'] = pal['q'] if pants else pal['v']
    long_sleeve = look.get('topType', 0) != 0
    pal['~'] = pal['T'] if long_sleeve else pal['2']
    pal['^'] = pal['y'] if long_sleeve else pal['3']
    pal[':'] = pal['Y'] if long_sleeve else pal['4']
    return pal


RAISED = ('wave1', 'wave2', 'up', 'stretch', 'work1')


def build(look, view='F', pose='idle', face='normal'):
    na, fa, legs, by, hy = POSES[pose]
    style = look.get('hairStyle', 0)
    top = look.get('topType', 0)
    bottom = look.get('bottomType', 0)
    role = look.get('role', 'owner')
    hat = look.get('hatType', 0)
    gl = look.get('glasses', 0)
    sl = 3 if top == 0 else 6
    up = lambda l, extra=0: l.shift(0, by + extra)
    raised = fa in RAISED
    L = []
    if view == 'F':
        L.append(up(hair_back_F(style), hy))
        if not raised:
            L.append(up(arm_F('far', fa, sl)))
        L.append(legs_F(legs).shift(0, by if legs == 'jump' else 0))
        if bottom != 2:
            L.append(up(waist_F(bottom)))
        L.append(up(neck_F()))
        L.append(up(torso_F(top)))
        if role == 'owner':
            L.append(up(apron_F()))
        if role == 'employee':
            L.append(up(tie_F()))
        if bottom == 2:
            L.append(up(waist_F(bottom)))
        L.append(up(arm_F('near', na, sl)))
        L.append(up(head_F(), hy))
        ek = face if face in ('happy', 'surprised', 'tired', 'closed') else EYE_STYLES[look.get('eyes', 0)]
        L.append(up(eyes_F(ek), hy))
        L.append(up(brows_F(look.get('brows', 0)), hy))
        mk = face if face in ('happy', 'surprised', 'yawn', 'talkOpen', 'talk', 'tired') else MOUTH_STYLES[look.get('mouth', 0)]
        L.append(up(mouth_F(mk), hy))
        if look.get('blush', True):
            L.append(up(blush_F(), hy))
        L.append(up(HAIR_FRONT_F[style](), hy))
        if gl:
            L.append(up(glasses_F(gl), hy))
        if hat:
            L.append(up(hat_F(hat), hy))
        if raised:
            L.append(up(arm_F('far', fa, sl)))
    else:
        L.append(up(arm_F('far', fa, sl)) if not raised else None)
        L.append(legs_B(legs).shift(0, by if legs == 'jump' else 0))
        if bottom != 2:
            L.append(up(waist_F(bottom)))
        L.append(up(neck_B()))
        L.append(up(torso_B(top, role)))
        if bottom == 2:
            L.append(up(waist_F(bottom)))
        L.append(up(arm_F('near', na, sl)))
        L.append(up(head_B(), hy))
        L.append(up(hair_B(style), hy))
        if hat:
            L.append(up(hat_B(hat), hy))
        if raised:
            L.append(up(arm_F('far', fa, sl)))
    return [l for l in L if l]


def render(layers, look, scale=8, bg=(232, 238, 226)):
    from PIL import Image
    pal = palette(look)
    img = Image.new('RGB', (W, H + OFF), bg)
    for l in layers:
        for (x, y), c in l.px.items():
            img.putpixel((x, y + OFF), pal.get(c, (255, 0, 255)))
    return img.resize((W * scale, (H + OFF) * scale), Image.NEAREST)


LOOKS = [
    {'skin': '#FFD9B8', 'hair': '#6B3F24', 'top': '#F25C54', 'bottom': '#34385A', 'shoes': '#2E2A33', 'eye': '#6B4226', 'hairStyle': 0, 'topType': 0, 'bottomType': 0, 'role': 'owner'},
    {'skin': '#FFE6D2', 'hair': '#E86FA0', 'top': '#3E86D6', 'bottom': '#34385A', 'shoes': '#8A5A3B', 'eye': '#3E86D6', 'hairStyle': 3, 'topType': 1, 'bottomType': 2, 'role': 'npc', 'eyes': 1},
    {'skin': '#DDA67E', 'hair': '#151317', 'top': '#E9EEF6', 'bottom': '#2E3248', 'shoes': '#2E2A33', 'eye': '#2A2238', 'hairStyle': 0, 'topType': 2, 'bottomType': 0, 'role': 'employee', 'eyes': 3, 'glasses': 2},
    {'skin': '#FFD9B8', 'hair': '#D9A75F', 'top': '#5DBB63', 'bottom': '#4A6FA5', 'shoes': '#FFFFFF', 'eye': '#2E9C6A', 'hairStyle': 2, 'topType': 3, 'bottomType': 1, 'role': 'npc', 'eyes': 1},
    {'skin': '#B9805A', 'hair': '#6B3F24', 'top': '#F2A93B', 'bottom': '#2E3248', 'shoes': '#3E86D6', 'eye': '#3E86D6', 'hairStyle': 4, 'topType': 1, 'bottomType': 0, 'role': 'npc', 'hatType': 2, 'hatColor': '#F2A93B'},
    {'skin': '#F2C29B', 'hair': '#B9B4AD', 'top': '#8E6BBF', 'bottom': '#7A5A3C', 'shoes': '#8A5A3B', 'eye': '#6B4226', 'hairStyle': 6, 'topType': 3, 'bottomType': 2, 'role': 'npc', 'eyes': 2, 'glasses': 1},
    {'skin': '#FFD9B8', 'hair': '#151317', 'top': '#FFFFFF', 'bottom': '#2E2A33', 'shoes': '#2E2A33', 'eye': '#6B4226', 'hairStyle': 5, 'topType': 2, 'bottomType': 0, 'role': 'owner', 'hatType': 3, 'eyes': 3},
    {'skin': '#B9805A', 'hair': '#6B3F24', 'top': '#5A7D4A', 'bottom': '#4A6FA5', 'shoes': '#8A5A3B', 'eye': '#6B4226', 'hairStyle': 7, 'topType': 0, 'bottomType': 0, 'role': 'npc', 'hatType': 5, 'hatColor': '#E2C178', 'eyes': 2},
]


def preview(out):
    from PIL import Image
    rows = []
    for look in LOOKS:
        imgs = [render(build(look, 'F', 'idle'), look, 5), render(build(look, 'F', 'walk0'), look, 5), render(build(look, 'F', 'walk1'), look, 5), render(build(look, 'F', 'wave1'), look, 5), render(build(look, 'B', 'idle'), look, 5), render(build(look, 'B', 'walk2'), look, 5)]
        rows.append(imgs)
    cw, ch = rows[0][0].size
    sheet = Image.new('RGB', (len(rows) * (cw + 4), 6 * (ch + 4)), (255, 255, 255))
    for i, imgs in enumerate(rows):
        for j, im in enumerate(imgs):
            sheet.paste(im, (i * (cw + 4), j * (ch + 4)))
    sheet.save(out)
    print('saved', out, sheet.size)


def closeup(out, look_idx=0, faces=('normal', 'happy', 'surprised', 'tired', 'closed')):
    from PIL import Image
    look = LOOKS[look_idx]
    imgs = [render(build(look, 'F', 'idle', f), look, 10) for f in faces]
    sheet = Image.new('RGB', (len(imgs) * (imgs[0].width + 6), imgs[0].height), (255, 255, 255))
    for i, im in enumerate(imgs):
        sheet.paste(im, (i * (im.width + 6), 0))
    sheet.save(out)
    print('saved', out)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    if cmd == 'export':
        export()
    elif cmd == 'closeup':
        closeup(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 0)
    else:
        preview(sys.argv[2] if len(sys.argv) > 2 else '/tmp/sprite_preview.png')
