// ponytail: 동행복권 공식 JSON API(getLottoNumber)가 현재 홈으로 302 리다이렉트해서
// 공개 미러를 씁니다. 미러가 갱신을 멈추면 이 앱의 당첨번호도 멈춰요.
// 공식 API가 복구되거나 data.go.kr 키를 발급받으면 BASE 만 바꾸면 됩니다.

const BASE = "https://smok95.github.io/lotto/results";

/** 당첨자가 0명인 등수는 미러가 `{}` 로 내려줘요 (예: 1회차 1등). 그래서 둘 다 optional. */
export interface Division {
  prize?: number;
  winners?: number;
}

export interface Draw {
  drawNo: number;
  numbers: number[]; // 오름차순 6개
  bonusNo: number;
  date: string; // "YYYY-MM-DD" (KST 추첨일)
  divisions: Division[]; // 1등~5등
  totalSalesAmount: number;
}

export type Rank = 1 | 2 | 3 | 4 | 5 | null; // null = 낙첨

// 미러 응답은 snake_case
interface RawDraw {
  draw_no: number;
  numbers: number[];
  bonus_no: number;
  date: string;
  divisions: Division[];
  total_sales_amount: number;
}

function toDraw(raw: RawDraw): Draw {
  return {
    drawNo: raw.draw_no,
    numbers: raw.numbers,
    bonusNo: raw.bonus_no,
    date: raw.date.slice(0, 10),
    divisions: raw.divisions,
    totalSalesAmount: raw.total_sales_amount,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lotto fetch failed: ${url} (${res.status})`);
  return res.json();
}

export async function fetchLatestDraw(): Promise<Draw> {
  return toDraw((await fetchJson(`${BASE}/latest.json`)) as RawDraw);
}

export async function fetchDraw(drawNo: number): Promise<Draw> {
  return toDraw((await fetchJson(`${BASE}/${drawNo}.json`)) as RawDraw);
}

let allDrawsCache: Draw[] | null = null;

export async function fetchAllDraws(): Promise<Draw[]> {
  if (allDrawsCache) return allDrawsCache; // 세션 내 재호출 시 네트워크 안 탐
  const raw = (await fetchJson(`${BASE}/all.json`)) as RawDraw[];
  allDrawsCache = raw.map(toDraw).sort((a, b) => a.drawNo - b.drawNo);
  return allDrawsCache;
}

export function rankOf(picked: number[], draw: Draw): Rank {
  if (picked.length !== 6) return null;
  const matched = picked.filter((n) => draw.numbers.includes(n)).length;
  const bonusMatch = picked.includes(draw.bonusNo);
  if (matched === 6) return 1;
  if (matched === 5 && bonusMatch) return 2;
  if (matched === 5) return 3;
  if (matched === 4) return 4;
  if (matched === 3) return 5;
  return null;
}

// now 를 KST 벽시계 기준 필드로 변환 (실행 환경 타임존과 무관하게 계산하기 위함)
function kstParts(now: Date) {
  const t = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    d: t.getUTCDate(),
    day: t.getUTCDay(),
    h: t.getUTCHours(),
    min: t.getUTCMinutes(),
  };
}

export function nextDrawAt(now: Date = new Date()): Date {
  const { y, m, d, day, h, min } = kstParts(now);
  let dayDiff = (6 - day + 7) % 7; // 이번 주 토요일까지 남은 일수
  const pastDrawTimeToday = day === 6 && (h > 20 || (h === 20 && min >= 45));
  if (dayDiff === 0 && pastDrawTimeToday) dayDiff = 7; // 오늘 추첨 시각이 지났으면 다음 주로

  // KST 20:45 = UTC 11:45 (날짜는 그대로, 시각만 -9시간)
  return new Date(Date.UTC(y, m, d + dayDiff, 11, 45, 0, 0));
}

export function msUntilNextDraw(now: Date = new Date()): number {
  return nextDrawAt(now).getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days >= 1) return `${days}일 ${hours}시간 ${minutes}분`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hours}시간 ${minutes}분 ${pad(seconds)}초`;
}
