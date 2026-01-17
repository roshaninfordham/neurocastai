import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { AlertTriangle, FileText, ArrowLeft, Copy } from 'lucide-react';
import { CaseData, RiskFlag } from '../../types/case';
import { toast } from 'sonner';

interface EvidenceAuditProps {
  caseData: CaseData;
  onBack: () => void;
  onToggleFlag: (flagId: string) => void;
}

export function EvidenceAudit({ caseData, onBack, onToggleFlag }: EvidenceAuditProps) {
  const [selectedFlag, setSelectedFlag] = useState<RiskFlag | null>(
    caseData.riskFlags[0] || null
  );

  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const severityIcons = {
    critical: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back to Command Center
        </Button>
        <div>
          <h2 className="text-2xl font-semibold">Evidence & Audit Viewer</h2>
          <p className="text-slate-600">Extracted risk flags with source evidence</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left List: Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Flags ({caseData.riskFlags.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {caseData.riskFlags.map((flag) => (
                  <button
                    key={flag.id}
                    onClick={() => setSelectedFlag(flag)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedFlag?.id === flag.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${severityIcons[flag.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{flag.name}</p>
                        <Badge 
                          variant="outline" 
                          className={`mt-1 text-xs ${severityColors[flag.severity]}`}
                        >
                          {flag.severity}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel: Evidence Detail */}
        <div className="col-span-2 space-y-4">
          {selectedFlag ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`size-5 ${severityIcons[selectedFlag.severity]}`} />
                        <CardTitle>{selectedFlag.name}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={severityColors[selectedFlag.severity]}>
                          {selectedFlag.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Confidence: {selectedFlag.confidence.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-slate-700">Evidence Quote</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedFlag.evidenceQuote);
                          toast.success('Evidence copied to clipboard');
                        }}
                        className="gap-1"
                      >
                        <Copy className="size-3" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-4 bg-slate-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm italic">"{selectedFlag.evidenceQuote}"</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-1 text-slate-700">Source Document</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-slate-400" />
                        <span>{selectedFlag.source}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1 text-slate-700">Source Anchor</h4>
                      <Badge variant="outline" className="font-mono text-xs">
                        {selectedFlag.source} → {selectedFlag.section} → Line {selectedFlag.lineNumber || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coordination Guidance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-slate-700">Why It Matters</h4>
                    <p className="text-sm text-slate-600">{selectedFlag.whyMatters}</p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2 text-blue-900">Recommended Coordination Action</h4>
                    <p className="text-sm text-blue-700">{selectedFlag.recommendedAction}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Handoff Packet Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor={`include-${selectedFlag.id}`} className="font-medium cursor-pointer">
                        Include in handoff packet
                      </Label>
                      <p className="text-sm text-slate-600 mt-1">
                        This flag will be included in the generated handoff document
                      </p>
                    </div>
                    <Switch
                      id={`include-${selectedFlag.id}`}
                      checked={selectedFlag.includeInHandoff}
                      onCheckedChange={() => onToggleFlag(selectedFlag.id)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> All evidence is extracted from source documents with exact quotes. 
                  No diagnosis or treatment recommendations are provided—coordination guidance only.
                </p>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <FileText className="size-12 mx-auto mb-4 opacity-30" />
                <p>Select a risk flag to view evidence details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}