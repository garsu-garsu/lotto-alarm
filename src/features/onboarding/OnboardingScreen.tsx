import { useState } from "react";

import { Button, Paragraph } from "@toss/tds-mobile";

import { EVENT, track } from "../../lib/analytics";
import { palette } from "../../theme";

const STEPS = [
  {
    emoji: "🎯",
    title: "이번 주 당첨번호",
    desc: "앱을 열면 이번 주 당첨번호가 바로 떠요. 등수별 당첨금과 다음 추첨까지 남은 시간도 함께 볼 수 있어요.",
  },
  {
    emoji: "🎟️",
    title: "내 번호 확인",
    desc: "산 번호를 저장해 두면 발표 직후 몇 등인지 자동으로 알려드려요. 용지의 QR을 찍으면 번호를 하나씩 누르지 않아도 돼요.",
  },
  {
    emoji: "🍀",
    title: "번호 추천",
    desc: "고르기 귀찮을 때 대신 골라드려요. 방식을 골라 광고를 보면 다섯 게임이 나와요. 다만 어떤 방식도 당첨 확률을 높이지는 못해요.",
  },
  {
    emoji: "🔔",
    title: "알림 받기",
    desc: "로또 사는 걸 깜빡하거나 번호 확인을 놓치지 않게, 원하는 시각에 알려드려요. 밤 9시 이후에는 토스 방해금지 시간이라 알림이 가지 않아요.",
  },
];

export function OnboardingScreen({ onDone }: { onDone: (goToAlarm: boolean) => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const goNext = () => {
    const next = step + 1;
    setStep(next);
    track(EVENT.onboardingStep, { step: next });
  };

  const finish = (goToAlarm: boolean) => {
    track(EVENT.onboardingDone, { goToAlarm });
    onDone(goToAlarm);
  };

  return (
    <div
      style={{
        height: "100%",
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "16px 20px 24px",
        paddingTop: "max(16px, env(safe-area-inset-top))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {!isLast && (
          <button
            type="button"
            onClick={() => finish(false)}
            style={{
              border: "none",
              background: "none",
              padding: 8,
              fontSize: 14,
              fontWeight: 600,
              color: palette.sub,
              cursor: "pointer",
            }}
          >
            건너뛰기
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 12,
          padding: "0 8px",
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1 }}>{current.emoji}</div>
        <Paragraph typography="t3" fontWeight="bold" color={palette.ink}>
          {current.title}
        </Paragraph>
        <Paragraph typography="t5" color={palette.sub} style={{ lineHeight: 1.6 }}>
          {current.desc}
        </Paragraph>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: i === step ? palette.primary : palette.line,
            }}
          />
        ))}
      </div>

      {isLast ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button display="full" onClick={() => finish(true)}>
            알림 설정하기
          </Button>
          <Button display="full" variant="weak" color="dark" onClick={() => finish(false)}>
            나중에 할게요
          </Button>
        </div>
      ) : (
        <Button display="full" onClick={goNext}>
          다음
        </Button>
      )}
    </div>
  );
}
