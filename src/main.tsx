import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { validateClientEnv } from "@/lib/env-check";

validateClientEnv();

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      void registration?.update();
    },
    onRegisterError(error) {
      console.error("[PWA] service worker registration failed", error);
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
