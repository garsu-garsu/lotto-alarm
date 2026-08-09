import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { EVENT, track } from "./analytics";
import { isOnboarded, markOnboarded } from "./onboarding";
import { useRouter, type RouteName } from "../router";

export type TourKey =
  | "result-numbers"
  | "mynumbers-qr"
  | "recommend-card"
  | "alarm-slots";

interface Step {
  key: TourKey;
  route: RouteName;
  message: string;
}

// 탭 4개를 순서대로 짚어요 — App(Shell)이 이 순서대로 route 를 옮겨줍니다.
const STEPS: Step[] = [
  {
    key: "result-numbers",
    route: "result",
    message: "이번 주 당첨번호예요. 발표되면 여기 바로 떠요",
  },
  {
    key: "mynumbers-qr",
    route: "mynumbers",
    message: "용지 QR을 찍으면 번호를 하나씩 안 눌러도 돼요",
  },
  {
    key: "recommend-card",
    route: "recommend",
    message: "방식을 골라 광고를 보면 다섯 게임이 나와요",
  },
  {
    key: "alarm-slots",
    route: "alarm",
    message: "원하는 시각을 고르면 잊지 않게 알려드려요",
  },
];

interface TourContextValue {
  index: number;
  total: number;
  current?: Step & { targetRef: RefObject<HTMLElement | null> };
  next: () => void;
  skip: () => void;
  register: (key: TourKey, el: HTMLElement | null) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/**
 * 탭 4개를 순회하는 코치마크 투어. 각 단계의 route 로 App(Shell)이 자동 이동시키고,
 * 그 화면에 등록된 대상을 짚어줘요.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const { route } = useRouter();

  // 딥링크(기본 화면인 result 가 아님)로 들어왔으면 이미 쓰던 사람 — 투어 없이 완료 처리
  const [index, setIndex] = useState(() => {
    if (route.name !== "result") {
      markOnboarded();
      return -1;
    }
    return isOnboarded() ? -1 : 0;
  });

  // 대상 DOM 은 state 가 아니라 ref 로 들고 있어요. state 로 두면 ref 콜백이
  // 매번 새 함수가 되면서 등록 → 리렌더 → 재등록이 무한히 돕니다.
  const targetRefs = useRef<Record<TourKey, { current: HTMLElement | null }>>({
    "result-numbers": { current: null },
    "mynumbers-qr": { current: null },
    "recommend-card": { current: null },
    "alarm-slots": { current: null },
  });

  const register = useCallback((key: TourKey, el: HTMLElement | null) => {
    targetRefs.current[key].current = el;
  }, []);

  const next = useCallback(() => {
    setIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= STEPS.length) {
        markOnboarded();
        track(EVENT.onboardingDone, { skipped: false });
        return -1;
      }
      track(EVENT.onboardingStep, { step: nextIndex });
      return nextIndex;
    });
  }, []);

  const skip = useCallback(() => {
    markOnboarded();
    track(EVENT.onboardingDone, { skipped: true });
    setIndex(-1);
  }, []);

  const value = useMemo<TourContextValue>(() => {
    const step = index >= 0 ? STEPS[index] : undefined;
    return {
      index,
      total: STEPS.length,
      current: step && { ...step, targetRef: targetRefs.current[step.key] },
      next,
      skip,
      register,
    };
  }, [index, next, skip, register]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

function useTourContext(): TourContextValue {
  const ctx = useContext(TourContext);
  if (ctx == null) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

/** 화면 요소에 다는 ref 콜백 — 투어가 꺼져 있어도 안전하게 등록만 해요. */
export function useTourTarget(key: TourKey): (el: HTMLElement | null) => void {
  const { register } = useTourContext();
  return useCallback((el: HTMLElement | null) => register(key, el), [register, key]);
}

export function useTour(): {
  current?: Step & { targetRef: RefObject<HTMLElement | null> };
  index: number;
  total: number;
  next: () => void;
  skip: () => void;
} {
  const { current, index, total, next, skip } = useTourContext();
  return { current, index, total, next, skip };
}
