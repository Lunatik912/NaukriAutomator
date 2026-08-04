import { useEffect, useState } from "react";

type Health = "starting" | "ready" | "offline";

/**
 * Polls GET /api/health every 2s. Returns "starting" until first success,
 * "ready" once /api/health returns 200, "offline" if 5 consecutive polls fail.
 *
 * Created by: Adikarthik Gupta C B
 */
export function useBackendHealth(): Health {
  const [health, setHealth] = useState<Health>("starting");

  useEffect(() => {
    let cancelled = false;
    let failures = 0;

    // Retrieve port safely and fallback to 8080 if undefined, null, or 0
    const rawPort = (window as any).NAUKRI_BE_PORT;
    const port = rawPort && rawPort !== 0 ? rawPort : 8080;

    // Dev-server: use a relative URL so Vite's proxy forwards to the BE.
    // Packaged Electron: use the absolute localhost URL with the resolved port.
    const url = import.meta.env.DEV
      ? "/api/health"
      : `http://127.0.0.1:${port}/api/health`;

    async function poll() {
      try {
        const r = await fetch(url);
        if (r.ok) {
          if (!cancelled) setHealth("ready");
          failures = 0;
        } else {
          throw new Error(String(r.status));
        }
      } catch {
        failures++;
        if (!cancelled && failures >= 5) setHealth("offline");
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return health;
}