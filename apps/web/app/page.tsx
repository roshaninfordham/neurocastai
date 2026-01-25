import Link from "next/link";
import {
  Activity,
  Command,
  Mic,
  Stethoscope,
  ArrowRight
} from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 selection:bg-rose-500/30">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-white/5 bg-slate-900/50 px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            NeuroCast AI
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Autonomous Stroke Care Coordination Platform
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
              System Online
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20">
              v3.0.0-beta
            </span>
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform-gpu blur-3xl" aria-hidden="true">
          <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-10"
            style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
          />
        </div>
      </section>

      {/* Module Grid */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">

          {/* Home Check-In Card (Primary) */}
          <Link href="/home-checkin" className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-900/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-semibold leading-7 tracking-tight text-white group-hover:text-rose-400 transition-colors">
                Home Check-In
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-400">
                Patient-side autonomous triage. AI vision detection for stroke symptoms, generating a Verified Transfer Packet (VTP).
              </p>
            </div>
            <div className="mt-8 flex items-center text-sm font-semibold leading-6 text-rose-500">
              Start Triage <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Command Center Card */}
          <Link href="/command-center" className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-sky-500/50 hover:shadow-2xl hover:shadow-sky-900/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Command className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-semibold leading-7 tracking-tight text-white group-hover:text-sky-400 transition-colors">
                Command Center
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-400">
                Live coordination board for active cases. Monitor real-time telemetry, risk scores, and manage hospital allocation.
              </p>
            </div>
            <div className="mt-8 flex items-center text-sm font-semibold leading-6 text-sky-500">
              Open Dashboard <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Start Case Card */}
          <Link href="/start-case" className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-900/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-semibold leading-7 tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Start Case
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-400">
                Simulate an incoming EMS transfer. Inject synthetic patient data and Transfer Packets into the pipeline.
              </p>
            </div>
            <div className="mt-8 flex items-center text-sm font-semibold leading-6 text-emerald-500">
              Initialize Case <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Voice Commander Card */}
          <Link href="/voice-commander" className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-900/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                <Mic className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-semibold leading-7 tracking-tight text-white group-hover:text-violet-400 transition-colors">
                Voice Commander
              </h3>
              <p className="mt-2 text-base leading-7 text-slate-400">
                Hands-free voice interface for paramedics and coordinators. Powered by LiveKit for real-time interaction.
              </p>
            </div>
            <div className="mt-8 flex items-center text-sm font-semibold leading-6 text-violet-500">
              Activate Voice <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

        </div>
      </div>
    </main>
  );
}
