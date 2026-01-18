import type { NextRequest } from "next/server";
import type { CaseRunStatus, PipelineEvent } from "@neurocast/shared";
import { runStore, type RunUpdate } from "../../../../lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return new Response("runId query parameter is required", { status: 400 });
  }

  const run = runStore.getRun(runId);

  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendMessage = (event: PipelineEvent) => {
        const data = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendDone = (status: CaseRunStatus) => {
        const data = `event: done\ndata: ${JSON.stringify({ status })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      run.events.forEach((evt) => {
        sendMessage(evt);
      });

      if (run.status === "DONE" || run.status === "FAILED") {
        sendDone(run.status);
        controller.close();
        return;
      }

      unsubscribe = runStore.subscribe(runId, (update: RunUpdate) => {
        if ("eventType" in update) {
          sendMessage(update as PipelineEvent);
        } else if (update.type === "done") {
          sendDone(update.status);
          controller.close();
        }
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
