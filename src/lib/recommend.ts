// 로또는 매 회차 독립이라 과거 빈도로 미래를 맞힐 수 없어요. 이건 "고르기 귀찮은 사람 대신 골라주는" 재미 기능입니다. 화면에도 같은 문구를 노출해요.

import type { Draw } from "./lotto";

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

export function recommendGames(draws: Draw[], games: number, seed: number): number[][] {
  const counts = new Array<number>(46).fill(0); // index 1~45 사용
  for (const draw of draws) {
    for (const n of draw.numbers) counts[n]++;
  }
  // 빈도를 그대로 가중치로 쓰면 매번 같은 상위 번호만 나오니 제곱근으로 완만하게 반영.
  // +1 은 한 번도 안 나온 번호도 가중치 0이 되지 않게 하는 최소 바닥값.
  const weights =
    draws.length === 0 ? new Array<number>(46).fill(1) : counts.map((c) => Math.sqrt(c) + 1);

  const rand = mulberry32(seed);
  const result: number[][] = [];
  for (let g = 0; g < games; g++) {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    const poolWeights = pool.map((n) => weights[n]);
    const picked: number[] = [];
    for (let k = 0; k < 6; k++) {
      const total = poolWeights.reduce((a, b) => a + b, 0);
      let r = rand() * total;
      let idx = 0;
      while (idx < poolWeights.length - 1 && r > poolWeights[idx]) {
        r -= poolWeights[idx];
        idx++;
      }
      picked.push(pool[idx]);
      pool.splice(idx, 1);
      poolWeights.splice(idx, 1);
    }
    result.push(picked.sort((a, b) => a - b));
  }
  return result;
}
