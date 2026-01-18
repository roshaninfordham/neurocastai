import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Shield, Zap, ArrowRight } from 'lucide-react';

export function Products() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">NeuroCast Products</h1>
        <p className="text-slate-600">Intelligent coordination for stroke care networks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VTP Product Card */}
        <Card className="border-2 border-emerald-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-2">
              <Shield className="size-8 text-emerald-600" />
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Production Ready</Badge>
            </div>
            <CardTitle className="text-2xl">Verified Transfer Packet (VTP)</CardTitle>
            <CardDescription>
              Cryptographically signed coordination packets with immutable on-chain commitment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Key Features</h3>
              <ul className="text-sm space-y-1 text-slate-600">
                <li>✅ SHA-256 + Ed25519 cryptographic signature</li>
                <li>✅ Deterministic canonicalization for auditability</li>
                <li>✅ Kairo security gate analysis before deployment</li>
                <li>✅ On-chain commitment (EVM-ready architecture)</li>
                <li>✅ Tamper-evident audit trail (no PHI on-chain)</li>
                <li>✅ HIPAA-compliant inter-hospital transfers</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">What It Solves</h3>
              <p className="text-sm text-slate-600">
                VTP eliminates coordination delays by providing verifiable proof that transfer packets haven't been altered. Hospitals can trust the integrity of critical timing data (Last Known Well, imaging reports) without duplicating entry.
              </p>
            </div>

            <div className="bg-emerald-50 p-3 rounded-md">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Use Case</p>
              <p className="text-xs text-slate-600">
                Spoke ED sends VTP to hub center. Hub coordinator verifies packet integrity and Kairo security findings, then commits immutable proof before admitting patient.
              </p>
            </div>

            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
              Explore VTP <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Home Check-in Product Card */}
        <Card className="border-2 border-blue-300 hover:shadow-lg transition-shadow opacity-75">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-2">
              <Zap className="size-8 text-blue-500" />
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Coming Next</Badge>
            </div>
            <CardTitle className="text-2xl">NeuroCast Home Check-in</CardTitle>
            <CardDescription>
              Guided escalation assessment for stroke prevention (future product)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Planned Features</h3>
              <ul className="text-sm space-y-1 text-slate-600">
                <li>📋 Symptom checklist & guided risk assessment</li>
                <li>🚑 Smart routing (when to call 911 vs urgent care)</li>
                <li>📱 Voice-enabled assessment for accessibility</li>
                <li>📄 Auto-generated pre-arrival addendum (for ED)</li>
                <li>🔗 Integration with hospital EHR systems</li>
                <li>📊 Community health analytics & outcomes tracking</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">What It Solves</h3>
              <p className="text-sm text-slate-600">
                Delays happen at the community level too. Home Check-in reduces time-to-activation by providing instant medical guidance and generating a rich pre-arrival packet for the ED.
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-xs font-semibold text-blue-700 mb-1">Vision</p>
              <p className="text-xs text-slate-600">
                Patient at home experiences stroke symptoms, calls NeuroCast app. Guided assessment + "call 911 now" plus pre-arrival summary sent to ambulance + ED.
              </p>
            </div>

            <Button variant="outline" className="w-full gap-2 text-slate-600" disabled>
              Coming in 2026 <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Product Roadmap */}
      <div className="mt-12 p-6 bg-slate-50 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Why These Products?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-semibold text-emerald-600 mb-2">🏥 For Hospitals</p>
            <p className="text-slate-600">
              VTP ensures inter-hospital transfers are audit-proof and HIPAA-safe. Kairo-gated deployment means security reviews happen before go-live.
            </p>
          </div>
          <div>
            <p className="font-semibold text-blue-600 mb-2">👥 For Communities</p>
            <p className="text-slate-600">
              Home Check-in guides patients in real-time and feeds intelligent pre-arrival summaries to EDs. No redundant data entry, less confusion.
            </p>
          </div>
          <div>
            <p className="font-semibold text-purple-600 mb-2">📊 For Stroke Networks</p>
            <p className="text-slate-600">
              Both products plug into a "network brain" that tracks delays, safety gaps, and outcomes—enabling data-driven coordination improvements.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Callout */}
      <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border-2 border-emerald-200">
        <h3 className="font-semibold text-slate-900 mb-2">🔗 Integrated Architecture</h3>
        <p className="text-slate-600 text-sm">
          VTP is the backbone. Home Check-in feeds into it. Both generate cryptographically verified handoffs that persist in the network ledger. 
          Hospitals see a unified, auditable record of decision-making across the care continuum.
        </p>
      </div>
    </div>
  );
}
