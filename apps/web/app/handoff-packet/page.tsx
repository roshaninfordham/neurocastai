import Link from "next/link";

export default function HandoffPacketPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Handoff Packet
          </h1>
          <Link
            href="/"
            className="text-sm text-sky-400 hover:text-sky-300 underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </header>
        <p className="text-slate-300 text-sm">
          Placeholder screen for the one-page, evidence-backed handoff packet
          that travels with the patient.
        </p>
      </div>
    </main>
  );
}

