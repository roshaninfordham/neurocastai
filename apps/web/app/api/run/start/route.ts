import type { NextRequest } from "next/server";
import type { CaseInput } from "@neurocast/shared";
import { runStore } from "../../../../lib/runStore";
import { startPipelineRun } from "../../../../lib/pipelineRunner";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const caseInput = body as CaseInput;

  const caseId =
    caseInput.caseId && caseInput.caseId.length > 0
      ? caseInput.caseId
      : `NC-CASE-${Date.now()}`;

  const runId = crypto.randomUUID();

  runStore.createRun(runId, caseId);
  startPipelineRun(runId, caseId, caseInput);

  return new Response(JSON.stringify({ runId, caseId }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
