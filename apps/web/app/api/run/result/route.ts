import type { NextRequest } from "next/server";
import type { CaseDerived, CaseRunStatus } from "@neurocast/shared";
import { runStore } from "../../../../lib/runStore";

export const dynamic = "force-dynamic";

type RunResultResponse = {
  status: CaseRunStatus;
  result: CaseDerived | null;
};

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

  const body: RunResultResponse = {
    status: run.status,
    result: run.result ?? null,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

