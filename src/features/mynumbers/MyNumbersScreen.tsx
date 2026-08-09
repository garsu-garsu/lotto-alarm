import { useEffect, useRef, useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { LottoBall, LottoBalls } from "../../components/LottoBalls";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { EVENT, track } from "../../lib/analytics";
import { fetchLatestDraw, rankOf, type Draw, type Rank } from "../../lib/lotto";
import { palette } from "../../theme";

const GAMES_KEY = "la:my-games";
const MAX_GAMES = 10;

function loadGames(): number[][] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    return raw ? (JSON.parse(raw) as number[][]) : [];
  } catch {
    return [];
  }
}

function saveGames(games: number[][]): void {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  } catch {
    /* 프라이빗 모드 등에서 저장이 막힐 수 있어요 */
  }
}

const RANK_LABEL: Record<Exclude<Rank, null>, string> = {
  1: "1등",
  2: "2등",
  3: "3등",
  4: "4등",
  5: "5등",
};

export function MyNumbersScreen() {
  const { openToast } = useToast();
  const [selected, setSelected] = useState<number[]>([]);
  const [games, setGames] = useState<number[][]>(loadGames);
  const [draw, setDraw] = useState<Draw | null>(null);
  // 회차 대조가 끝난 뒤 딱 한 번만 기록하기 위한 플래그
  const checkedRef = useRef(false);

  useEffect(() => {
    fetchLatestDraw()
      .then(setDraw)
      .catch(() => {
        /* 실패하면 대조 없이 저장한 번호 목록만 보여줘요 */
      });
  }, []);

  useEffect(() => {
    if (checkedRef.current || draw == null || games.length === 0) return;
    checkedRef.current = true;
    track(EVENT.myNumbersChecked, { games: games.length });
  }, [draw, games.length]);

  const toggle = (n: number) => {
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= 6) {
        openToast("6개까지 고를 수 있어요.");
        return prev;
      }
      return [...prev, n].sort((a, b) => a - b);
    });
  };

  const onSave = () => {
    // 버튼을 disabled 로 두면 TDS 버튼이 활성일 때와 같은 색으로 보여서
    // 눌리는지 아닌지 구분이 안 돼요. 항상 누를 수 있게 두고 여기서 막아요.
    if (selected.length !== 6) {
      openToast("번호 6개를 골라주세요.");
      return;
    }
    if (games.length >= MAX_GAMES) {
      openToast(`최대 ${MAX_GAMES}게임까지 저장할 수 있어요.`);
      return;
    }
    const next = [...games, selected];
    setGames(next);
    saveGames(next);
    setSelected([]);
    track(EVENT.myNumbersSaved, { games: next.length });
  };

  const onDelete = (index: number) => {
    const next = games.filter((_, i) => i !== index);
    setGames(next);
    saveGames(next);
  };

  return (
    <ScreenLayout
      title="내 번호 확인"
      subtitle="산 번호를 저장해 두면 발표 직후 몇 등인지 알려드려요"
    >
      <Card style={{ marginTop: 8 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          번호 6개를 골라주세요 ({selected.length}/6)
        </Paragraph>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              onClick={() => toggle(n)}
              style={{
                cursor: "pointer",
                borderRadius: "50%",
                // 고른 번호만 테두리로 표시해요. 반대로 안 고른 걸 흐리게 하면
                // 45개가 전부 꺼진 것처럼 보여서 숫자가 안 읽혀요.
                outline: selected.includes(n) ? `3px solid ${palette.ink}` : "none",
                outlineOffset: 2,
              }}
            >
              <LottoBall n={n} size={32} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Button display="full" onClick={onSave}>
            저장
          </Button>
        </div>
      </Card>

      {games.length === 0 ? (
        <Card style={{ marginTop: 12, textAlign: "center" }}>
          <Paragraph typography="t6" color={palette.sub}>
            아직 저장한 번호가 없어요
          </Paragraph>
        </Card>
      ) : (
        games.map((game, i) => {
          const rank = draw ? rankOf(game, draw) : null;
          return (
            <Card
              key={i}
              style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ flex: 1 }}>
                <LottoBalls
                  numbers={game}
                  size={30}
                  dim={draw ? (n) => !draw.numbers.includes(n) : undefined}
                />
              </div>
              {draw && (
                <Paragraph
                  typography="t7"
                  fontWeight="bold"
                  color={rank ? palette.good : palette.sub}
                >
                  {rank ? `${RANK_LABEL[rank]} 🎉` : "낙첨"}
                </Paragraph>
              )}
              <button
                type="button"
                onClick={() => onDelete(i)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: palette.sub,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </Card>
          );
        })
      )}
    </ScreenLayout>
  );
}
