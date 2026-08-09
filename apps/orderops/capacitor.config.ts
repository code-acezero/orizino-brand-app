import type { CapacitorConfig } from "@capacitor/cli";

// This file is inert until you run the Capacitor CLI steps in README.md —
// it's committed now so the app is "APK-ready" without needing any later
// restructuring. appId follows Android's reverse-domain convention.
const config: CapacitorConfig = {
  appId: "com.orizino.orderops",
  appName: "Order Ops",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
