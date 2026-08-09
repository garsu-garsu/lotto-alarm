import { useEffect, useState } from "react";

import { Button, Paragraph } from "@toss/tds-mobile";

import { LottoBalls } from "../../components/LottoBalls";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { EVENT, track } from "../../lib/analytics";
import {
  fetchLatestDraw,
  formatCountdown,
  msUntilNextDraw,
  type Draw,
} from "../../lib/lotto";
import { palette } from "../../theme";

const RANK_LABELS = ["1등", "2등", "3등", "4등", "5등"];

export function ResultScreen() {
  const [draw, setDraw] = useState<Draw | null>(null);
  const [error, setError] = useState(false);
  // 다시 시도 버튼을 누르면 이 값을 올려서 아래 effect 를 다시 돌려요.
  const [reloadKey, setReloadKey] = useState(0);
  const [countdown, setCountdown] = useState(() => formatCountdown(msUntilNextDraw()));

  useEffect(() => {
    setError(false);
    setDraw(null);
    fetchLatestDraw()
      .then((d) => {
        setDraw(d);
        track(EVENT.resultViewed, { drawNo: d.drawNo });
      })
      .catch(() => setError(true));
  }, [reloadKey]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(formatCountdown(msUntilNextDraw())), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScreenLayout title="이번 주 당첨번호" subtitle={`다음 추첨까지 ${countdown}`}>
      {error ? (
        <Card style={{ marginTop: 8, textAlign: "center" }}>
          <Paragraph typography="t6" color={palette.sub}>
            당첨번호를 불러오지 못했어요
          </Paragraph>
          <div style={{ marginTop: 12 }}>
            <Button display="full" onClick={() => setReloadKey((k) => k + 1)}>
              다시 시도
            </Button>
          </div>
        </Card>
      ) : !draw ? (
        <Card style={{ marginTop: 8, textAlign: "center" }}>
          <Paragraph typography="t6" color={palette.sub}>
            불러오는 중…
          </Paragraph>
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: 8 }}>
            <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
              제{draw.drawNo}회 · {draw.date} 추첨
            </Paragraph>
            <div style={{ marginTop: 12 }}>
              <LottoBalls numbers={draw.numbers} bonus={draw.bonusNo} />
            </div>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
              등수별 당첨금
            </Paragraph>
            {RANK_LABELS.map((label, i) => {
              const division = draw.divisions[i];
              const winners = division?.winners;
              const noWinner = winners == null || winners === 0;
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 10,
                  }}
                >
                  <Paragraph typography="t7" color={palette.sub}>
                    {label}
                  </Paragraph>
                  {noWinner ? (
                    <Paragraph typography="t7" color={palette.sub}>
                      당첨자 없음
                    </Paragraph>
                  ) : (
                    <Paragraph typography="t7" color={palette.ink}>
                      {(division.prize ?? 0).toLocaleString("ko-KR")}원 ·{" "}
                      {winners.toLocaleString("ko-KR")}명
                    </Paragraph>
                  )}
                </div>
              );
            })}
          </Card>
        </>
      )}
    </ScreenLayout>
  );
}
