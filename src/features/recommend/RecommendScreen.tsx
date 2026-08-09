import { useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { LottoBalls } from "../../components/LottoBalls";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { useAdGate } from "../../hooks/useAdGate";
import { EVENT, track } from "../../lib/analytics";
import { fetchAllDraws } from "../../lib/lotto";
import { recommendGames } from "../../lib/recommend";
import { palette } from "../../theme";

const LABELS = ["A", "B", "C", "D", "E"];

export function RecommendScreen() {
  const { watchThen } = useAdGate();
  const { openToast } = useToast();
  const [games, setGames] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(false);

  const onGenerate = () => {
    watchThen(() => {
      setLoading(true);
      const seed = Date.now();
      fetchAllDraws()
        .then((draws) => setGames(recommendGames(draws, 5, seed)))
        .catch(() => {
          setGames(recommendGames([], 5, seed));
          openToast("과거 기록을 못 불러와서 무작위로 뽑았어요.");
        })
        .finally(() => {
          setLoading(false);
          track(EVENT.recommendGenerated, {});
        });
    }, "recommend");
  };

  return (
    <ScreenLayout title="번호 추천" subtitle="고르기 귀찮을 때 대신 골라드려요">
      <Card style={{ marginTop: 8 }}>
        <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.5 }}>
          로또는 매 회차 독립이라 과거 번호로 다음 회차를 맞힐 수 없어요. 재미로만 봐주세요.
        </Paragraph>
      </Card>

      <Card style={{ marginTop: 12 }}>
        {loading ? (
          <Paragraph typography="t6" color={palette.sub} style={{ textAlign: "center" }}>
            번호를 고르는 중…
          </Paragraph>
        ) : games == null ? (
          <Button display="full" onClick={onGenerate}>
            광고 보고 번호 추천받기
          </Button>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {games.map((game, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
                    {LABELS[i]}
                  </Paragraph>
                  <LottoBalls numbers={game} size={30} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <Button display="full" onClick={onGenerate}>
                다시 추천받기
              </Button>
            </div>
          </>
        )}
      </Card>
    </ScreenLayout>
  );
}
