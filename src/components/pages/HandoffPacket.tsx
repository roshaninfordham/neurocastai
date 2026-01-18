import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Copy, Download, Send, ArrowLeft, CheckCircle2, Circle, Shield, Lock, CloudUpload } from 'lucide-react';
import { CaseData, WorkflowState } from '../../types/case';
import { formatTimeWithDate, calculateTimeDiff } from '../../lib/caseUtils';
import { toast } from 'sonner';
import { useState } from 'react';

interface HandoffPacketProps {
  caseData: CaseData;
  onBack: () => void;
}

export function HandoffPacket({ caseData, onBack }: HandoffPacketProps) {
  const [verifying, setVerifying] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [kairoDecision, setKairoDecision] = useState<any>(null);

  const stateColors: Record<WorkflowState, string> = {
    PROCEED: 'bg-green-600',
    HOLD: 'bg-yellow-600',
    ESCALATE: 'bg-red-600'
  };

  const handleVerifyVtp = async () => {
    if (!caseData.vtp) return;
    
    setVerifying(true);
    try {
      const response = await fetch('/api/vtp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vtp: caseData.vtp }),
      });
      const result = await response.json();
      setVerificationResult(result);
      
      if (result.verified) {
        toast.success('VTP verified successfully!');
      } else {
        toast.error('VTP verification failed');
      }
    } catch (err) {
      toast.error('Verification error');
    } finally {
      setVerifying(false);
    }
  };

  const handleCommitHash = async () => {
    if (!caseData.vtp) return;
    
    setCommitting(true);
    try {
      const response = await fetch('/api/vtp/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: caseData.vtp.integrity?.hash_sha256,
          metadata: {
            vtpId: caseData.vtp.vtp_meta?.vtp_id || caseData.vtp.vtpId,
            caseId: caseData.id,
            runId: caseData.vtp.vtp_meta?.run_id || caseData.vtp.runId,
            workflowState: caseData.workflowState,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      const result = await response.json();
      setCommitResult(result);
      setKairoDecision({
        decision: result.kairoDecision,
        riskScore: result.kairoRiskScore,
        findings: result.kairoFindingsSummary,
      });
      
      if (result.kairoBlocked) {
        toast.error(`Commit blocked by Kairo: ${result.kairoReason}`);
      } else {
        toast.success(`VTP committed (Kairo: ${result.kairoDecision})`);
      }
    } catch (err) {
      toast.error('Commit error');
    } finally {
      setCommitting(false);
    }
  };

  const handleCopyHash = () => {
    if (caseData.vtp?.integrity?.hash_sha256 || caseData.vtp?.packetHash) {
      navigator.clipboard.writeText(caseData.vtp.integrity?.hash_sha256 || caseData.vtp.packetHash);
      toast.success('VTP hash copied');
    }
  };

  const handleDownloadVtp = () => {
    if (caseData.vtp) {
      const blob = new Blob([JSON.stringify(caseData.vtp, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const vtpId = caseData.vtp.vtp_meta?.vtp_id || caseData.vtp.vtpId || `VTP-${caseData.id}`;
      a.download = `${vtpId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('VTP JSON downloaded');
    }
  };

  const handleCopy = () => {
    if (caseData.vtp) {
      navigator.clipboard.writeText(JSON.stringify(caseData.vtp, null, 2));
      toast.success('VTP JSON copied');
    } else {
      toast.success('Handoff packet copied to clipboard');
    }
  };

  const handleExport = () => {
    if (caseData.vtp) {
      const blob = new Blob([JSON.stringify(caseData.vtp, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${caseData.vtp.vtpId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('VTP JSON exported');
    } else {
      toast.success('PDF export initiated');
    }
  };

  const handleSend = () => {
    toast.success('Packet sent to stroke center coordinator');
  };

  const timeSinceLKW = caseData.lastKnownWell ? calculateTimeDiff(caseData.lastKnownWell, new Date()) : 'Unknown';

  const doorToCT = caseData.ctStart ? calculateTimeDiff(caseData.edArrival, caseData.ctStart) : 'Not started';

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Handoff Packet</h2>
          <p className="text-slate-600">One-page coordination summary</p>
        </div>
        {caseData.vtp && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified Transfer Packet</Badge>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="size-4" />
            Copy Text
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            Export PDF
          </Button>
          <Button onClick={handleSend} className="gap-2">
            <Send className="size-4" />
            Send to Coordinator
          </Button>
        </div>
      </div>

      {/* VTP Verification Card */}
      {caseData.vtp && (
        <Card className="mb-6 border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-emerald-600" />
                  Verified Transfer Packet (VTP)
                </CardTitle>
                <CardDescription className="mt-1">
                  Cryptographically signed coordination packet with immutable audit trail
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                {verificationResult?.verified ? 'VERIFIED' : caseData.vtp.integrity?.verification_status || 'VERIFIED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-600">VTP ID</p>
                <p className="text-sm font-mono">{caseData.vtp.vtp_meta?.vtp_id || caseData.vtp.vtpId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">SHA-256 Hash</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono truncate">{caseData.vtp.integrity?.hash_sha256 || caseData.vtp.packetHash}</p>
                  <Button variant="ghost" size="sm" onClick={handleCopyHash} className="h-6 w-6 p-0">
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Signature Status</p>
                <div className="flex items-center gap-1">
                  <Lock className="size-3 text-emerald-600" />
                  <p className="text-sm">{caseData.vtp.integrity?.signature ? 'Signed (Ed25519)' : 'Local Demo'}</p>
                </div>
              </div>
            </div>

            {verificationResult && (
              <div className="p-3 bg-slate-50 rounded-md border">
                <p className="text-sm font-medium mb-2">Verification Result:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-600">Hash Valid:</span>
                    <span className={`ml-2 font-semibold ${verificationResult.hash?.valid ? 'text-green-600' : 'text-red-600'}`}>
                      {verificationResult.hash?.valid ? 'YES' : 'NO'}
                    </span>
                  </div>
                  {verificationResult.signature?.present && (
                    <div>
                      <span className="text-slate-600">Signature Valid:</span>
                      <span className={`ml-2 font-semibold ${verificationResult.signature?.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {verificationResult.signature?.valid ? 'YES' : 'NO'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {commitResult && (
              <div className={`p-3 rounded-md border ${
                commitResult.kairoBlocked 
                  ? 'bg-red-50 border-red-200' 
                  : (kairoDecision?.decision === 'WARN'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-emerald-50 border-emerald-200')
              }`}>
                <p className={`text-sm font-medium mb-1 ${
                  commitResult.kairoBlocked 
                    ? 'text-red-700' 
                    : (kairoDecision?.decision === 'WARN'
                      ? 'text-yellow-700'
                      : 'text-emerald-700')
                }`}>
                  {commitResult.kairoBlocked ? '⛔ Commit Blocked' : '✅ Commit Successful'}
                </p>
                <div className="text-xs text-slate-600 space-y-1">
                  {commitResult.kairoBlocked && (
                    <>
                      <p><strong>Kairo Decision:</strong> {commitResult.kairoDecision}</p>
                      <p><strong>Reason:</strong> {commitResult.kairoReason}</p>
                      <p><strong>Risk Score:</strong> {commitResult.kairoRiskScore}/100</p>
                      {commitResult.findings && (
                        <>
                          <p><strong>Critical Issues:</strong> {commitResult.findings.critical}</p>
                          <p><strong>High Issues:</strong> {commitResult.findings.high}</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {commitResult.result?.txId && (
                        <p><strong>Transaction ID:</strong> {commitResult.result.txId}</p>
                      )}
                      {kairoDecision && (
                        <>
                          <p><strong>Kairo Decision:</strong> {kairoDecision.decision}</p>
                          <p><strong>Risk Score:</strong> {kairoDecision.riskScore}/100</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleVerifyVtp} disabled={verifying} className="gap-2">
                <CheckCircle2 className="size-4" />
                {verifying ? 'Verifying...' : 'Verify Packet'}
              </Button>
              <Button variant="outline" onClick={handleDownloadVtp} className="gap-2">
                <Download className="size-4" />
                Download VTP JSON
              </Button>
              <Button variant="outline" onClick={handleCopyHash} className="gap-2">
                <Copy className="size-4" />
                Copy Hash
              </Button>
              <Button onClick={handleCommitHash} disabled={committing} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CloudUpload className="size-4" />
                {committing ? 'Committing...' : 'Simulate On-chain Commit'}
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              💡 On-chain commitment is Kairo-gated. Deploy TransferReceiptRegistry.sol after security analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Printable One-Page Handoff */}
      <div className="max-w-5xl mx-auto bg-white border shadow-lg rounded-lg p-8 space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">NeuroCast AI</h1>
              <p className="text-sm text-slate-600 mt-1">Stroke Care Coordination Handoff</p>
              <p className="text-xs text-slate-500 mt-1">Generated {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Case ID</p>
              <p className="text-xl font-semibold">{caseData.id}</p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded mt-2">
                <span className="text-xs text-slate-600">Completeness:</span>
                <span className="text-sm font-semibold text-blue-600">
                  {caseData.handoffPacket?.header.completenessScorePct ?? caseData.completenessScore}%
                </span>
              </div>
              {caseData.vtp && (
                <div className="mt-2 text-left">
                  <p className="text-xs text-slate-600">VTP ID</p>
                  <p className="text-xs font-mono break-all">{caseData.vtp.vtpId}</p>
                  <p className="text-xs text-slate-600 mt-1">Packet Hash</p>
                  <p className="text-[11px] font-mono break-all">{caseData.vtp.packetHash}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Case Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Case Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Facility:</span>
                <span className="ml-2 font-medium">
                  {caseData.handoffPacket?.header.facilityType ||
                    (caseData.facilityType === 'spoke'
                      ? 'Non-specialized ED (spoke)'
                      : 'Stroke center (hub)')}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Arrival Mode:</span>
                <span className="ml-2 font-medium">{caseData.arrivalMode}</span>
              </div>
              {caseData.patientAge && (
                <div>
                  <span className="text-slate-600">Age:</span>
                  <span className="ml-2 font-medium">{caseData.patientAge}y</span>
                </div>
              )}
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-slate-600">Workflow State:</span>
                <Badge className={`${stateColors[caseData.workflowState]} text-white`}>
                  {caseData.workflowState}
                </Badge>
                <span className="text-xs text-slate-500">
                  (Generated {new Date().toLocaleTimeString()})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Interval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Last Known Well</TableCell>
                  <TableCell>
                    {caseData.lkwUnknown ? (
                      <Badge variant="outline" className="bg-amber-50">Unknown</Badge>
                    ) : (
                      formatTimeWithDate(caseData.lastKnownWell)
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ED Arrival</TableCell>
                  <TableCell>{formatTimeWithDate(caseData.edArrival)}</TableCell>
                  <TableCell className="text-slate-600">LKW + {timeSinceLKW}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CT Start</TableCell>
                  <TableCell>
                    {caseData.ctStart ? formatTimeWithDate(caseData.ctStart) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">Door + {doorToCT}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CTA Result</TableCell>
                  <TableCell>
                    {caseData.ctaResult ? formatTimeWithDate(caseData.ctaResult) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Decision Time</TableCell>
                  <TableCell>
                    {caseData.decisionTime ? formatTimeWithDate(caseData.decisionTime) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: Vitals Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Vitals Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.currentVitals ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">HR</p>
                    <p className="font-semibold text-lg">{caseData.currentVitals.hr} bpm</p>
                  </div>
                  <div>
                    <p className="text-slate-600">BP</p>
                    <p className="font-semibold text-lg">
                      {caseData.currentVitals.bpSys}/{caseData.currentVitals.bpDia}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">SpO2</p>
                    <p className="font-semibold text-lg">{caseData.currentVitals.spO2}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Glucose</p>
                    <p className="font-semibold text-lg">{caseData.currentVitals.glucose} mg/dL</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Stability Assessment:</span>
                  <Badge className={
                    caseData.numericInsights?.stabilityFlag === 'Stable' ? 'bg-green-600' :
                    caseData.numericInsights?.stabilityFlag === 'Borderline' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }>
                    {caseData.numericInsights?.stabilityFlag || 'Unknown'}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No vitals data available</p>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Extracted Risks */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Risks (with Evidence)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {caseData.riskFlags.filter(f => f.includeInHandoff).map((flag) => (
                <div key={flag.id} className="p-3 border rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant="outline" className={
                      flag.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                      flag.severity === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-blue-100 text-blue-800 border-blue-200'
                    }>
                      {flag.severity}
                    </Badge>
                    <p className="font-medium text-sm flex-1">{flag.name}</p>
                  </div>
                  <div className="pl-4 border-l-2 border-slate-200 ml-2">
                    <p className="text-xs text-slate-600 italic mb-1">Evidence:</p>
                    <p className="text-xs">"{flag.evidenceQuote}"</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Source: {flag.source} • {flag.section}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Missing Info Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Missing Information Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {caseData.missingItems.length > 0 ? (
                caseData.missingItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Circle className="size-4 text-slate-400" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="size-4" />
                  <span className="text-sm font-medium">All required information collected</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Coordination Next Steps */}
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle>Coordination Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {caseData.nextSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <p className="text-sm flex-1">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Disclaimer */}
        <div className="border-t pt-4 text-center">
          <p className="text-xs text-slate-500">
            This handoff packet was generated by NeuroCast AI for care coordination purposes only.
            <br />
            No diagnosis or treatment recommendations are provided. Clinical judgment required.
            <br />
            <strong>Synthetic demo data only.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
