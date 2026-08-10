import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

import { isInTossApp } from "../lib/tossEnv";

export type NotifyConsent =
  | "newAgreement"
  | "alreadyAgreed"
  | "agreementRejected";

/**
 * 알림 슬롯 — 콘솔에 등록한 발송 코드와 1:1로 짝지어요.
 * 코드를 바꾸면 콘솔의 발송 코드도 같이 바꿔야 알림 동의 화면이 떠요.
 *
 * 앱인토스 푸시는 야간 방해금지 시간이 있어 21:00 이후에는 발송이 안 돼요.
 * 아래 슬롯은 전부 그 시간 안에 들어가도록 골랐어요.
 */

/** 로또 사라고 알려주는 알림 — 추첨(토 20:45) 전에 살 시간이 남는 시각만 넣었어요. */
export const BUY_SLOTS = [
  { code: "lotto-alarm-buy-fri1900-p", label: "금요일 저녁 7시" },
  { code: "lotto-alarm-buy-sat1000-p", label: "토요일 오전 10시" },
  { code: "lotto-alarm-buy-sat1400-p", label: "토요일 오후 2시" },
  { code: "lotto-alarm-buy-sat1800-p", label: "토요일 오후 6시" },
] as const;

/** 번호 확인하라고 알려주는 알림. 20:50 은 발표 직후, 나머지는 다음날 아침이에요. */
export const CHECK_SLOTS = [
  { code: "lotto-alarm-check-sat2050-p", label: "토요일 밤 8시 50분" },
  { code: "lotto-alarm-check-sun0800-p", label: "일요일 오전 8시" },
  { code: "lotto-alarm-check-sun1000-p", label: "일요일 오전 10시" },
] as const;

export type NotifySlotCode =
  | (typeof BUY_SLOTS)[number]["code"]
  | (typeof CHECK_SLOTS)[number]["code"];

const AGREED_BUY_KEY = "la:notify-agreed-buy";
const AGREED_CHECK_KEY = "la:notify-agreed-check";

function isBuyCode(code: NotifySlotCode): boolean {
  return BUY_SLOTS.some((s) => s.code === code);
}

/** 알림 동의 요청 가능 환경인지 (토스 앱 안) */
export function canRequestNotifyConsent(): boolean {
  return isInTossApp();
}

/** 동의한 구매 알림 슬롯 코드 — 화면 표시용. 실제 발송 대상은 토스가 관리해요. */
export function agreedBuySlot(): string | null {
  return localStorage.getItem(AGREED_BUY_KEY);
}

/** 동의한 확인 알림 슬롯 코드 — 화면 표시용. 실제 발송 대상은 토스가 관리해요. */
export function agreedCheckSlot(): string | null {
  return localStorage.getItem(AGREED_CHECK_KEY);
}

/**
 * 구매 / 확인 알림 동의 화면을 띄워요.
 * 브라우저이면 null 반환.
 */
export function requestNotifyConsent(
  code: NotifySlotCode,
): Promise<NotifyConsent | null> {
  if (!canRequestNotifyConsent()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: code },
        onEvent: (result) => {
          if (result.type !== "agreementRejected") {
            localStorage.setItem(
              isBuyCode(code) ? AGREED_BUY_KEY : AGREED_CHECK_KEY,
              code,
            );
          }
          resolve(result.type);
          cleanup();
        },
        onError: () => {
          resolve(null);
          cleanup();
        },
      });
    } catch {
      resolve(null);
    }
  });
}
