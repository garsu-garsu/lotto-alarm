import jsQR from "jsqr";

export interface LottoTicket {
  drawNo: number;
  games: number[][]; // 각 6개, 오름차순
}

// 회차(4자리) 뒤로 [영문자1글자][숫자12자리]가 게임 수만큼 반복돼요.
// 구분 문자가 항상 "m"은 아니라서(선택 방식 표시) 글자 자체엔 의존하지 않아요.
const GAME_RE = /[A-Za-z](\d{12})/g;

/** QR 이 담은 URL 또는 v= 값 문자열을 파싱해요. 형식이 안 맞으면 null. */
export function parseLottoQr(text: string): LottoTicket | null {
  const vMatch = text.match(/[?&]v=([^&]+)/);
  const payload = vMatch ? vMatch[1] : text;

  const drawMatch = payload.match(/^(\d{4})/);
  if (!drawMatch) return null;
  const drawNo = Number(drawMatch[1]);
  if (!Number.isInteger(drawNo) || drawNo < 1) return null;

  const games: number[][] = [];
  for (const m of payload.slice(4).matchAll(GAME_RE)) {
    const digits = m[1];
    const game: number[] = [];
    for (let i = 0; i < 12; i += 2) {
      game.push(Number(digits.slice(i, i + 2)));
    }
    games.push(game);
  }

  if (games.length < 1 || games.length > 5) return null;
  for (const game of games) {
    if (new Set(game).size !== 6) return null;
    if (game.some((n) => n < 1 || n > 45)) return null;
    game.sort((a, b) => a - b);
  }

  return { drawNo, games };
}

/**
 * iOS 사파리는 캔버스 총 픽셀을 약 1,670만으로 제한해요. 그 위로 키우면 캔버스가
 * 통째로 비어서 오히려 못 읽어요. 확대 재시도는 이 한도 안에서만 해요.
 */
const MAX_CANVAS_PIXELS = 16_000_000;

/** dataUri 의 QR 을 읽어 담긴 텍스트를 반환해요. 못 읽으면 null. */
export function decodeQrFromDataUri(dataUri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 용지의 QR 이 작게 찍혀 첫 시도에 실패하는 경우가 있어 한 번 확대해 재시도해요.
      // 이미 큰 사진이면 확대 여지가 없으니(=한도에 걸리니) 재시도하지 않아요.
      const pixels = img.naturalWidth * img.naturalHeight;
      const scale = Math.min(2, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, pixels)));
      const text = scan(img, 1) ?? (scale > 1.2 ? scan(img, scale) : null);
      resolve(text);
    };
    img.onerror = () => resolve(null);
    img.src = dataUri;
  });
}

function scan(img: HTMLImageElement, scale: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(data, width, height);
  return result ? result.data : null;
}
