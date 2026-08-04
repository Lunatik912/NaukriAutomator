import type { JobEvent } from "./types";

declare global {
  interface Window {
    NAUKRI_BE_PORT?: number;
  }
}

function getPort(): number {
  const port = window.NAUKRI_BE_PORT;
  // If port is undefined, null, or 0, fallback to port 8080
  if (!port || port === 0) {
    return 8080;
  }
  return port;
}

function wsUrl(jobId: string): string {
  if (import.meta.env.DEV) {
    // DEV: connect directly to the standalone BE at :8080. The Vite WS proxy
    // has been observed to close the upgrade before Spring's handshake
    // completes; direct-connect avoids that entirely. The BE's WS handler
    // has setAllowedOriginPatterns("*") so cross-origin from :5173 is fine.
    return `ws://127.0.0.1:8080/ws/jobs/${jobId}`;
  }
  return `ws://127.0.0.1:${getPort()}/ws/jobs/${jobId}`;
}

export interface JobStreamHandle {
  close(): void;
}

export function connectJobStream(
  jobId: string,
  onEvent: (event: JobEvent) => void,
  onClose: () => void
): JobStreamHandle {
  const url = wsUrl(jobId);
  const socket = new WebSocket(url);

  socket.addEventListener("message", (msg) => {
    try {
      const event = JSON.parse(msg.data as string) as JobEvent;
      onEvent(event);
    } catch {
      // ignore malformed frames
    }
  });

  socket.addEventListener("close", () => {
    onClose();
  });

  socket.addEventListener("error", () => {
    onClose();
  });

  return {
    close() {
      socket.close();
    }
  };
}