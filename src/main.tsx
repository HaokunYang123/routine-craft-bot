import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateClientEnv } from "@/lib/env-check";

validateClientEnv();

createRoot(document.getElementById("root")!).render(<App />);
