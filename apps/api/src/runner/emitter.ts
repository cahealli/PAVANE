import { EventEmitter } from "events";
import type { SSEEvent } from "@pavane/shared";

class SSEEmitter extends EventEmitter {
  emit(runId: string, event: SSEEvent): boolean {
    return super.emit(runId, event);
  }

  on(runId: string, listener: (event: SSEEvent) => void): this {
    return super.on(runId, listener);
  }

  off(runId: string, listener: (event: SSEEvent) => void): this {
    return super.off(runId, listener);
  }
}

export const sseEmitter = new SSEEmitter();
sseEmitter.setMaxListeners(100);
