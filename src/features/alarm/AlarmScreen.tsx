import { useState } from "react";

import { Paragraph } from "@toss/tds-mobile";

import { NotifySlotCard } from "../../components/NotifySlotCard";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import {
  BUY_SLOTS,
  CHECK_SLOTS,
  agreedBuySlot,
  agreedCheckSlot,
  canRequestNotifyConsent,
} from "../../data/notify";
import { useTourTarget } from "../../lib/tour";
import { palette } from "../../theme";

export function AlarmScreen() {
  const coachRef = useTourTarget("alarm-slots");
  const [buy, setBuy] = useState(agreedBuySlot);
  const [check, setCheck] = useState(agreedCheckSlot);

  return (
    <ScreenLayout title="알림 설정" subtitle="사는 것도 확인하는 것도 대신 챙겨드려요">
      {!canRequestNotifyConsent() && (
        <Card style={{ marginTop: 8 }}>
          <Paragraph typography="t7" color={palette.sub}>
            토스 앱에서 열면 알림을 설정할 수 있어요.
          </Paragraph>
        </Card>
      )}

      <div ref={coachRef}>
        <NotifySlotCard
          title="로또 사라고 알려드릴 시각"
          slots={BUY_SLOTS}
          agreedCode={buy}
          onAgreed={setBuy}
          where="alarm"
        />
      </div>
      <NotifySlotCard
        title="번호 확인하라고 알려드릴 시각"
        slots={CHECK_SLOTS}
        agreedCode={check}
        onAgreed={setCheck}
        where="alarm"
      />

      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.5 }}>
          밤 9시 이후에는 토스 방해금지 시간이라 알림이 가지 않아요. 그래서 토요일 밤 알림은
          발표 직후 8시 50분이 마지막이에요.
        </Paragraph>
      </Card>
    </ScreenLayout>
  );
}
