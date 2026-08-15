import { Paragraph } from "@toss/tds-mobile";

import { useRouter, type Route, type RouteName } from "../router";
import { palette } from "../theme";

interface Tab {
  name: RouteName;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { name: "result", label: "당첨번호", emoji: "🎯" },
  { name: "mynumbers", label: "내번호", emoji: "🎟️" },
  { name: "recommend", label: "번호추천", emoji: "🍀" },
  { name: "alarm", label: "알림", emoji: "🔔" },
];

/** 메인 탭 하단 내비게이션 */
export function BottomNav() {
  const { route, reset } = useRouter();

  // 토스 미니앱 브랜딩 가이드: 탭바는 화면 폭을 채우는 형태가 아니라
  // 바닥에서 떠 있는 흰색 캡슐이어야 해요(토스 메인 하단 탭과 겹치지 않게).
  return (
    <nav
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "calc(12px + env(safe-area-inset-bottom))",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 1100,
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "inline-flex",
          background: palette.white,
          borderRadius: 999,
          padding: 6,
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        }}
      >
        {TABS.map((tab) => {
          const active = route.name === tab.name;
          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => reset({ name: tab.name } as Route)}
              style={{
                border: "none",
                background: "transparent",
                borderRadius: 999,
                padding: "8px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1.1, opacity: active ? 1 : 0.4 }}>
                {tab.emoji}
              </span>
              <Paragraph
                typography="t7"
                fontWeight={active ? "bold" : "medium"}
                color={active ? palette.primary : palette.sub}
              >
                {tab.label}
              </Paragraph>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
