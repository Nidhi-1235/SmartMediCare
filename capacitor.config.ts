import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.smartmedicare",
  appName: "SmartMediCare",
  webDir: "dist",
  // The app is server-backed (AI scanning, prescription reading and safety checks
  // run in secure server functions), so the APK loads the published site.
  server: {
    url: "https://dev-my-mobile.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#0F6FFF",
    },
  },
};

export default config;
