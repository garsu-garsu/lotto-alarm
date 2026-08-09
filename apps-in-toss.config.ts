import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "lotto-alarm",
  brand: {
    primaryColor: "#E8452C", // 로또 용지의 붉은 톤
  },
  permissions: [
    { name: "camera", access: "access" },
    { name: "photos", access: "read" },
  ],
  webBundleDir: "dist",
  // 토스 네이티브 상단 바: 뒤로가기 버튼 사용 (graniteEvent.backEvent 로 연결)
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
});
