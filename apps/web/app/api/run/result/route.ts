import type { NextRequest } from "next/server";
import type { CaseDerived, CaseRunStatus } from "@neurocast/shared";
import { runStore } from "../../../../lib/runStore";
import { sanitizeCaseDerived } from "../../../../lib/safeSerialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RunResultResponse = {
  status: CaseRunStatus;
  result: CaseDerived | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return new Response(JSON.stringify({ error: "runId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const run = runStore.getRun(runId);

  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If pipeline failed, surface failure
  if (run.status === "FAILED") {
    return new Response(JSON.stringify({ status: run.status }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If still running or not ready, return 409 to allow client retry
  if (!run.result || run.status === "RUNNING" || run.status === "READY") {
    return new Response(JSON.stringify({ status: run.status }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitize result before returning to UI (HIPAA safety)
  const safeResult: CaseDerived = sanitizeCaseDerived(run.result);

  const body: RunResultResponse = {
    status: run.status,
    result: safeResult,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

