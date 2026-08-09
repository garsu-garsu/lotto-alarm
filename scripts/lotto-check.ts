// node --experimental-strip-types scripts/lotto-check.ts 로 실행하는 오프라인 자체 점검.
// 네트워크를 타는 fetch* 함수는 호출하지 않는다(import만 함).
import assert from "node:assert";
import { rankOf, nextDrawAt, type Draw } from "../src/lib/lotto.ts";
import { recommendGames } from "../src/lib/recommend.ts";

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
const draws: Draw[] = [
  { ...makeDraw(), drawNo: 1, numbers: [1, 2, 3, 4, 5, 6] },
  { ...makeDraw(), drawNo: 2, numbers: [1, 2, 3, 10, 11, 12] },
];

const a1 = recommendGames(draws, 5, 42);
const a2 = recommendGames(draws, 5, 42);
assert.deepStrictEqual(a1, a2, "같은 seed는 같은 결과여야 함");

const b1 = recommendGames(draws, 5, 43);
assert.notDeepStrictEqual(a1, b1, "다른 seed는 다른 결과여야 함");

for (const game of a1) {
  assert.strictEqual(game.length, 6);
  assert.strictEqual(new Set(game).size, 6, "중복 없어야 함");
  for (const n of game) assert.ok(n >= 1 && n <= 45, "1~45 범위");
  const sorted = [...game].sort((x, y) => x - y);
  assert.deepStrictEqual(game, sorted, "오름차순이어야 함");
}

// 빈 이력 폴백도 정상 동작해야 함
const empty = recommendGames([], 3, 1);
assert.strictEqual(empty.length, 3);
for (const game of empty) assert.strictEqual(game.length, 6);

console.log("lotto-check ok");
