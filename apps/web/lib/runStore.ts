import type {
  CaseDerived,
  CaseRunStatus,
  PipelineEvent,
} from "@neurocast/shared";

export type RunUpdate =
  | PipelineEvent
  | {
      type: "done";
      status: CaseRunStatus;
    };

export type RunSubscriber = (update: RunUpdate) => void;

export type RunEntry = {
  runId: string;
  caseId: string;
  status: CaseRunStatus;
  events: PipelineEvent[];
  result?: CaseDerived;
  createdAt: number;
  subscribers: Set<RunSubscriber>;
};

class RunStore {
  private runs = new Map<string, RunEntry>();

  createRun(runId: string, caseId: string): RunEntry {
    const existing = this.runs.get(runId);
    if (existing) {
      return existing;
    }

    const entry: RunEntry = {
      runId,
      caseId,
      status: "READY",
      events: [],
      createdAt: Date.now(),
      subscribers: new Set(),
    };

    this.runs.set(runId, entry);
    return entry;
  }

  getRun(runId: string): RunEntry | undefined {
    return this.runs.get(runId);
  }

  getResult(runId: string): CaseDerived | undefined {
    const entry = this.runs.get(runId);
    return entry?.result;
  }

  appendEvent(runId: string, event: PipelineEvent): void {
    const entry = this.runs.get(runId);
    if (!entry) {
      return;
    }

    entry.events.push(event);

    entry.subscribers.forEach((subscriber) => {
      subscriber(event);
    });
  }

  setStatus(runId: string, status: CaseRunStatus): void {
    const entry = this.runs.get(runId);
    if (!entry) {
      return;
    }

    entry.status = status;
  }

  completeRun(runId: string, result: CaseDerived): void {
    const entry = this.runs.get(runId);
    if (!entry) {
      return;
    }

    entry.status = result.status;
    entry.result = result;

    const update: RunUpdate = {
      type: "done",
      status: entry.status,
    };

    entry.subscribers.forEach((subscriber) => {
      subscriber(update);
    });

    entry.subscribers.clear();
  }

  failRun(runId: string): void {
    const entry = this.runs.get(runId);
    if (!entry) {
      return;
    }

    entry.status = "FAILED";

    const update: RunUpdate = {
      type: "done",
      status: entry.status,
    };

    entry.subscribers.forEach((subscriber) => {
      subscriber(update);
    });

    entry.subscribers.clear();
  }

  subscribe(runId: string, subscriber: RunSubscriber): () => void {
    const entry = this.runs.get(runId);
    if (!entry) {
      return () => {};
    }

    entry.subscribers.add(subscriber);

    return () => {
      entry.subscribers.delete(subscriber);
    };
  }
}

export const runStore = new RunStore();

