// 로또는 매 회차 독립이라 과거 번호로 미래를 맞힐 수 없어요. 이건 "고르기 귀찮은 사람 대신 골라주는" 재미 기능입니다.
// 아래 방식별 근거(basis/effect)는 1,235회차 실데이터 분석·시뮬레이션 결과이며 화면에도 같은 문구를 그대로 노출해요.

export type Strategy = "uniform" | "lessCrowded" | "typical" | "spread";

// mulberry32: seed 하나로 결정적 난수를 만드는 초경량 PRNG (테스트 재현성 때문에 Math.random 대신 사용)
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 45개에서 6개를 균등 비복원 추출 (오름차순)
function drawUniform(rand: () => number): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const picked: number[] = [];
  for (let k = 0; k < 6; k++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}

// 1~45를 섞어서 반환 (spread 방식에서 서로소 게임을 자르는 데 사용)
function shuffle45(rand: () => number): number[] {
  const arr = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const sum = (game: number[]): number => game.reduce((a, b) => a + b, 0);
const oddCount = (game: number[]): number => game.filter((n) => n % 2 === 1).length;
const hasConsecutivePair = (game: number[]): boolean =>
  game.some((n, i) => i > 0 && n - game[i - 1] === 1);

const MAX_REJECT_TRIES = 500;

// 조건을 만족할 때까지 균등 추출을 반복하고, 500회 넘게 실패하면 균등 추출로 폴백한다(조용히 넘기지 않고 이유를 남김)
function drawWithRejection(
  rand: () => number,
  predicate: (game: number[]) => boolean,
  label: string,
): number[] {
  for (let i = 0; i < MAX_REJECT_TRIES; i++) {
    const game = drawUniform(rand);
    if (predicate(game)) return game;
  }
  console.warn(
    `[recommend] ${label}: ${MAX_REJECT_TRIES}회 시도해도 조건을 못 채워 균등 추출로 대체했어요.`,
  );
  return drawUniform(rand);
}

// 45개를 섞어 앞에서부터 6개씩 잘라 서로소 게임을 만든다. 7게임(=42개)까지만 가능하고
// 그 이상은 번호가 모자라니 나머지는 독립적인 균등 추출로 채운다.
function drawSpread(rand: () => number, games: number): number[][] {
  const disjointCount = Math.min(games, 7);
  const shuffled = shuffle45(rand);
  const result: number[][] = [];
  for (let g = 0; g < disjointCount; g++) {
    result.push(shuffled.slice(g * 6, g * 6 + 6).sort((a, b) => a - b));
  }
  for (let g = disjointCount; g < games; g++) {
    result.push(drawUniform(rand));
  }
  return result;
}

export function recommendGames(strategy: Strategy, games: number, seed: number): number[][] {
  const rand = mulberry32(seed);

  if (strategy === "spread") return drawSpread(rand, games);

  const predicate =
    strategy === "lessCrowded"
      ? (game: number[]) => sum(game) >= 160 && hasConsecutivePair(game)
      : strategy === "typical"
        ? (game: number[]) => oddCount(game) === 3 && sum(game) >= 121 && sum(game) <= 160
        : null;

  const result: number[][] = [];
  for (let g = 0; g < games; g++) {
    result.push(predicate ? drawWithRejection(rand, predicate, strategy) : drawUniform(rand));
  }
  return result;
}

export interface StrategyInfo {
  key: Strategy;
  label: string; // 버튼/제목용 짧은 이름
  summary: string; // 한 줄 설명
  basis: string; // 수학적 근거
  effect: string; // 실제로 뭐가 달라지는지
}

export const STRATEGIES: StrategyInfo[] = [
  {
    key: "uniform",
    label: "완전 무작위",
    summary: "45개에서 그냥 고르게 뽑아요",
    basis:
      "모든 조합의 당첨 확률은 8,145,060분의 1로 똑같아요. 어떤 방식도 이보다 당첨 확률을 높이지 못해요.",
    effect: "기준이 되는 방식이에요. 아래 방식들도 당첨 확률은 이것과 같아요.",
  },
  {
    key: "lessCrowded",
    label: "덜 붐비는 조합",
    summary: "당첨됐을 때 덜 나눠 갖는 쪽으로",
    basis:
      "지난 1,235회를 분석했더니, 여섯 수의 합이 160 이상인 조합은 1등 당첨자가 기대치의 0.88배였고 합이 117 이하인 조합은 1.01배였어요. 연속된 두 수가 들어간 조합도 0.93배로 적었어요. 둘 다 우연으로 보기 어려운 차이예요.",
    effect: "당첨 확률은 그대로예요. 다만 1등이 됐을 때 당첨금을 나눠 가질 사람이 평균적으로 적어요.",
  },
  {
    key: "typical",
    label: "가장 흔한 모양",
    summary: "실제 당첨 번호에서 제일 자주 나온 형태",
    basis:
      "실제 당첨 조합의 33.4퍼센트가 홀수 세 개짜리였고, 여섯 수의 합도 121에서 160 사이가 가장 두꺼웠어요.",
    effect:
      "당첨 확률은 올라가지 않아요. 흔한 모양이라는 건 그런 조합이 많다는 뜻이지, 하나하나가 더 잘 나온다는 뜻은 아니에요.",
  },
  {
    key: "spread",
    label: "겹치지 않게 분산",
    summary: "다섯 게임에 같은 번호를 안 써요",
    basis:
      "40만 번 돌려보니 다섯 게임에 번호를 겹치지 않게 쓰면 5등 이상이 하나라도 나올 확률이 12.42퍼센트, 겹치게 쓰면 11.06퍼센트였어요.",
    effect: "평균 맞히는 개수는 똑같아요. 대신 다섯 장이 한꺼번에 꽝날 일이 줄어요.",
  },
];
