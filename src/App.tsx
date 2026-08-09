import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useEffect } from "react";

import "./App.css";
import { BannerAd } from "./components/BannerAd";
import { BottomNav } from "./components/BottomNav";
import { CoachMark } from "./components/CoachMark";
import { AlarmScreen } from "./features/alarm/AlarmScreen";
import { MyNumbersScreen } from "./features/mynumbers/MyNumbersScreen";
import { RecommendScreen } from "./features/recommend/RecommendScreen";
import { ResultScreen } from "./features/result/ResultScreen";
import { trackScreen } from "./lib/analytics";
import { RouterProvider, useRouter, type Route } from "./router";
import { TourProvider, useTour } from "./lib/tour";
import { palette } from "./theme";

/** BannerAd 가 잡아두는 높이 — 본문이 배너 뒤로 숨지 않게 같은 값만큼 비워둬요. */
const BANNER_H = 96;

function CurrentScreen() {
  const { route } = useRouter();

  switch (route.name) {
    case "mynumbers":
      return <MyNumbersScreen />;
    case "recommend":
      return <RecommendScreen />;
    case "alarm":
      return <AlarmScreen />;
    default:
      return <ResultScreen />;
  }
}

function Shell() {
  const { route, back, canGoBack, reset } = useRouter();
  const tour = useTour();

  useEffect(() => {
    trackScreen(route.name);
  }, [route.name]);

  // 투어 진행 중이면 해당 단계의 탭으로 자동 이동해요. 이미 그 탭이면 그대로 둡니다.
  useEffect(() => {
    if (tour.current != null && route.name !== tour.current.route) {
      reset({ name: tour.current.route } as Route);
    }
  }, [tour, route.name, reset]);

  // 창 전체 클릭으로 다음 단계 — 건너뛰기 버튼 클릭은 여기서 가로채지 않고 그대로 통과시켜요.
  useEffect(() => {
    if (tour.current == null) return;
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("[data-tour-skip]") != null) return;
      event.preventDefault();
      event.stopPropagation();
      tour.next();
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [tour]);

  // 토스 네이티브 상단 바 뒤로가기를 앱 내 이동에 연결
  useEffect(() => {
    try {
      return graniteEvent.addEventListener("backEvent", {
        onEvent: () => {
          if (canGoBack) back();
          else
            try {
              closeView();
            } catch {
              /* noop */
            }
        },
      });
    } catch {
      return undefined;
    }
  }, [back, canGoBack]);

  // 우측 상단 닫기(홈) 버튼 — 어느 화면에 있든 앱을 닫아요.
  // backEvent 만 구독하면 이 버튼을 아무도 처리하지 않아 눌러도 안 닫혀요.
  useEffect(() => {
    try {
      return graniteEvent.addEventListener("homeEvent", {
        onEvent: () => {
          try {
            void closeView();
          } catch {
            /* 브라우저 등 미지원 환경 */
          }
        },
      });
    } catch {
      return undefined;
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: palette.bg,
        // 하단 고정 배너(96px + 안전영역)만큼 본문·탭 자리를 비워둬요.
        // 이게 없으면 마지막 버튼이 배너에 가려요.
        boxSizing: "border-box",
        paddingBottom: `calc(${BANNER_H}px + env(safe-area-inset-bottom))`,
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <CurrentScreen />
      </div>
      <BottomNav />

      {tour.current != null && (
        <CoachMark
          targetRef={tour.current.targetRef}
          message={tour.current.message}
          index={tour.index}
          total={tour.total}
          onSkip={tour.skip}
        />
      )}

      {/* 배너는 화면마다 따로 두지 않고 여기 하나만 띄워요 — 앱 전체에 배너는 하나입니다.
          본문과 탭은 위 컨테이너의 paddingBottom 만큼 올라와 있어서 가려지지 않아요. */}
      <div
        style={{
          // position: fixed 는 #root 가 아니라 화면 기준이라, 넓은 화면에서는
          // App.css 의 max-width 480px 를 벗어나 창 전체로 퍼져요. 직접 맞춰줍니다.
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          bottom: 0,
          zIndex: 10,
          background: palette.bg,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <BannerAd />
      </div>
    </div>
  );
}

// 확인 알림은 딥링크로 들어올 수 있어요 — 경로 끝 조각과 ?screen= 둘 다 보고,
// 모르는 값이면 평소대로 당첨번호 화면.
function initialRoute(): Route {
  try {
    const { pathname, search } = window.location;
    const screen =
      new URLSearchParams(search).get("screen") ??
      pathname.split("/").filter(Boolean).pop();
    if (screen === "mynumbers" || screen === "recommend" || screen === "alarm") {
      return { name: screen };
    }
  } catch {
    /* noop */
  }
  return { name: "result" };
}

function App() {
  return (
    // 투어를 켤지 말지는 TourProvider 가 라우트(딥링크 여부)와 온보딩 기록을 보고 정해요.
    <RouterProvider initial={initialRoute()}>
      <TourProvider>
        <Shell />
      </TourProvider>
    </RouterProvider>
  );
}

export default App;
