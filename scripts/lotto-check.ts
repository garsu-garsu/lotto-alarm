// node --experimental-strip-types scripts/lotto-check.ts 로 실행하는 오프라인 자체 점검.
// 네트워크를 타는 fetch* 함수는 호출하지 않는다(import만 함).
import assert from "node:assert";
import { rankOf, nextDrawAt, type Draw } from "../src/lib/lotto.ts";
import { recommendGames, type Strategy } from "../src/lib/recommend.ts";
import { parseLottoQr } from "../src/lib/qr.ts";

function makeDraw(): Draw {
  return {
    drawNo: 1,
    numbers: [1, 2, 3, 4, 5, 6],
    bonusNo: 7,
    date: "2026-01-01",
    divisions: [],
    totalSalesAmount: 0,
  };
}

// ---- rankOf ----
const draw = makeDraw();
assert.strictEqual(rankOf([1, 2, 3, 4, 5, 6], draw), 1); // 6개 일치
assert.strictEqual(rankOf([1, 2, 3, 4, 5, 7], draw), 2); // 5개 + 보너스
assert.strictEqual(rankOf([1, 2, 3, 4, 5, 8], draw), 3); // 5개, 보너스 불일치
assert.strictEqual(rankOf([1, 2, 3, 4, 8, 9], draw), 4); // 4개
assert.strictEqual(rankOf([1, 2, 3, 8, 9, 10], draw), 5); // 3개
assert.strictEqual(rankOf([1, 2, 8, 9, 10, 11], draw), null); // 낙첨 (2개)
assert.strictEqual(rankOf([1, 2, 3, 4, 5], draw), null); // 6개가 아님

// ---- nextDrawAt ----
function kstFields(d: Date) {
  const t = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return { day: t.getUTCDay(), h: t.getUTCHours(), min: t.getUTCMinutes() };
}

const samples = [
  new Date("2026-08-09T00:00:00+09:00"), // 일요일
  new Date("2026-08-05T12:00:00+09:00"), // 수요일
  new Date("2026-08-08T00:00:00+09:00"), // 토요일 자정
];
for (const now of samples) {
  const next = nextDrawAt(now);
  const f = kstFields(next);
  assert.strictEqual(f.day, 6, "토요일이어야 함");
  assert.strictEqual(f.h, 20);
  assert.strictEqual(f.min, 45);
  assert.ok(next.getTime() > now.getTime(), "now 보다 미래여야 함");
}

// 토요일 20:44 -> 그날 20:45
const sat2044 = new Date("2026-08-08T20:44:00+09:00");
const nextFrom2044 = nextDrawAt(sat2044);
assert.strictEqual(nextFrom2044.toISOString(), new Date("2026-08-08T20:45:00+09:00").toISOString());

// 토요일 20:46 -> 다음 주 토요일 20:45
const sat2046 = new Date("2026-08-08T20:46:00+09:00");
const nextFrom2046 = nextDrawAt(sat2046);
assert.strictEqual(nextFrom2046.toISOString(), new Date("2026-08-15T20:45:00+09:00").toISOString());

// ---- recommendGames ----
const a1 = recommendGames("uniform", 5, 42);
const a2 = recommendGames("uniform", 5, 42);
assert.deepStrictEqual(a1, a2, "같은 seed는 같은 결과여야 함");

const b1 = recommendGames("uniform", 5, 43);
assert.notDeepStrictEqual(a1, b1, "다른 seed는 다른 결과여야 함");

for (const game of a1) {
  assert.strictEqual(game.length, 6);
  assert.strictEqual(new Set(game).size, 6, "중복 없어야 함");
  for (const n of game) assert.ok(n >= 1 && n <= 45, "1~45 범위");
  const sorted = [...game].sort((x, y) => x - y);
  assert.deepStrictEqual(game, sorted, "오름차순이어야 함");
}

// ---- parseLottoQr ----
const fullUrl =
  "https://m.dhlottery.co.kr/qr.do?method=winQr&v=1195m060713162425m050912202126m051820364243m051427303943m1527333436370000000645.net";
const ticket = parseLottoQr(fullUrl);
assert.ok(ticket);
assert.strictEqual(ticket.drawNo, 1195);
assert.strictEqual(ticket.games.length, 5);
assert.deepStrictEqual(ticket.games[0], [6, 7, 13, 16, 24, 25]);
assert.deepStrictEqual(ticket.games[4], [15, 27, 33, 34, 36, 37]);

const oneGame = parseLottoQr("1107m061430314041");
assert.ok(oneGame);
assert.strictEqual(oneGame.drawNo, 1107);
assert.strictEqual(oneGame.games.length, 1);
assert.deepStrictEqual(oneGame.games[0], [6, 14, 30, 31, 40, 41]);

// v= 없이 payload 만 줘도 동일하게 파싱돼야 함
const payloadOnly = parseLottoQr(
  "1195m060713162425m050912202126m051820364243m051427303943m1527333436370000000645.net",
);
assert.deepStrictEqual(payloadOnly, ticket);

// 구분 문자가 m 이 아니어도 파싱돼야 함
const otherSep = parseLottoQr("1107q061430314041");
assert.deepStrictEqual(otherSep, oneGame);

// 잘못된 입력은 전부 null
assert.strictEqual(parseLottoQr(""), null); // 빈 문자열
assert.strictEqual(parseLottoQr("1195"), null); // 게임 0개
assert.strictEqual(parseLottoQr("1107m064630314041"), null); // 46 이상 포함
assert.strictEqual(parseLottoQr("1107m061414314041"), null); // 한 게임 안 중복
assert.strictEqual(
  parseLottoQr(
    "1107m061430314041m061430314042m061430314043m061430314044m061430314045m061430314046",
  ),
  null,
); // 게임 6개 초과

// ---- recommendGames: 4가지 방식 점검 ----
const sumOf = (g: number[]) => g.reduce((a, b) => a + b, 0);
const oddCountOf = (g: number[]) => g.filter((n) => n % 2 === 1).length;
const hasConsecutive = (g: number[]) => g.some((n, i) => i > 0 && n - g[i - 1] === 1);
const strategies: Strategy[] = ["uniform", "lessCrowded", "typical", "spread"];

for (const strategy of strategies) {
  const s1 = recommendGames(strategy, 5, 100);
  const s2 = recommendGames(strategy, 5, 100);
  assert.deepStrictEqual(s1, s2, `${strategy}: 같은 seed는 같은 결과여야 함`);

  const s3 = recommendGames(strategy, 5, 101);
  assert.notDeepStrictEqual(s1, s3, `${strategy}: 다른 seed는 다른 결과여야 함`);

  assert.strictEqual(s1.length, 5);
  for (const game of s1) {
    assert.strictEqual(game.length, 6);
    assert.strictEqual(new Set(game).size, 6, `${strategy}: 중복 없어야 함`);
    for (const n of game) assert.ok(n >= 1 && n <= 45, `${strategy}: 1~45 범위`);
    assert.deepStrictEqual(game, [...game].sort((x, y) => x - y), `${strategy}: 오름차순이어야 함`);
  }
}

// lessCrowded: 합계 160 이상 + 연속쌍 1개 이상 (기각 표집이 200게임 내내 조건을 지키는지)
for (const game of recommendGames("lessCrowded", 200, 7)) {
  assert.ok(sumOf(game) >= 160, "lessCrowded: 합계가 160 이상이어야 함");
  assert.ok(hasConsecutive(game), "lessCrowded: 연속쌍이 있어야 함");
}

// typical: 홀수 정확히 3개 + 합계 121~160
for (const game of recommendGames("typical", 200, 7)) {
  assert.strictEqual(oddCountOf(game), 3, "typical: 홀수가 정확히 3개여야 함");
  const s = sumOf(game);
  assert.ok(s >= 121 && s <= 160, "typical: 합계가 121~160이어야 함");
}

// spread: 5게임(30개 번호)이 서로 겹치지 않아야 함
const spread5 = recommendGames("spread", 5, 9);
const flat5 = spread5.flat();
assert.strictEqual(flat5.length, 30);
assert.strictEqual(new Set(flat5).size, 30, "spread: 5게임 번호가 서로 겹치지 않아야 함");

// spread: 8게임 요청 시에도 게임마다 6개·중복 없음 유지, 앞 7게임은 서로소
const spread8 = recommendGames("spread", 8, 9);
assert.strictEqual(spread8.length, 8);
for (const game of spread8) {
  assert.strictEqual(game.length, 6);
  assert.strictEqual(new Set(game).size, 6);
}
const first7Flat = spread8.slice(0, 7).flat();
assert.strictEqual(new Set(first7Flat).size, 42, "spread: 앞 7게임은 서로소여야 함");

console.log("lotto-check ok");
