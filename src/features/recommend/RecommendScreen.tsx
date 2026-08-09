import { useState } from "react";

import { Button, Paragraph } from "@toss/tds-mobile";

import { LottoBalls } from "../../components/LottoBalls";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { useAdGate } from "../../hooks/useAdGate";
import { EVENT, track } from "../../lib/analytics";
import { recommendGames, STRATEGIES, type Strategy } from "../../lib/recommend";
import { useTourTarget } from "../../lib/tour";
import { palette } from "../../theme";

const LABELS = ["A", "B", "C", "D", "E"];

type Results = Record<Strategy, number[][] | null>;

export function RecommendScreen() {
  const { watchThen } = useAdGate();
  const coachRef = useTourTarget("recommend-card");
  const [results, setResults] = useState<Results>({
    uniform: null,
    lessCrowded: null,
    typical: null,
    spread: null,
  });

  const onGenerate = (key: Strategy) => {
    watchThen(() => {
      const seed = Date.now();
      setResults((prev) => ({ ...prev, [key]: recommendGames(key, 5, seed) }));
      track(EVENT.recommendGenerated, { strategy: key });
    }, "recommend:" + key);
  };

  return (
    <ScreenLayout title="번호 추천" subtitle="고르기 귀찮을 때 대신 골라드려요">
      <Card style={{ marginTop: 8 }}>
        <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.5 }}>
          로또는 매 회차 독립이라 어떤 방식도 당첨 확률을 높이지 못해요. 아래는 확률이 아니라
          당첨금을 나눠 갖는 인원이나 꽝날 확률을 바꾸는 방식이에요.
        </Paragraph>
      </Card>

      {STRATEGIES.map(({ key, label, summary, basis, effect }, index) => {
        const games = results[key];
        const card = (
          <Card style={{ marginTop: 12 }}>
            <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
              {label}
            </Paragraph>
            <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 2 }}>
              {summary}
            </Paragraph>
            <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 8, lineHeight: 1.5 }}>
              {basis}
            </Paragraph>
            <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.5 }}>
              → {effect}
            </Paragraph>

            {games != null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                {games.map((game, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
                      {LABELS[i]}
                    </Paragraph>
                    <LottoBalls numbers={game} size={30} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <Button display="full" onClick={() => onGenerate(key)}>
                {games == null ? "광고 보고 추천받기" : "다시 추천받기"}
              </Button>
            </div>
          </Card>
        );
        return index === 0 ? (
          <div key={key} ref={coachRef}>
            {card}
          </div>
        ) : (
          <div key={key}>{card}</div>
        );
      })}
    </ScreenLayout>
  );
}
