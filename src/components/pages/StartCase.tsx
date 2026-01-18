import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Upload, Play, CheckCircle2, Circle } from 'lucide-react';
import { CaseData, FacilityType, ArrivalMode } from '../../types/case';
import { DEMO_CASES } from '../../lib/mockData';
import { calculateCompletenessScore } from '../../lib/caseUtils';

interface StartCaseProps {
  onStartCase: (caseData: Partial<CaseData>) => void;
  onLoadDemo: (demoKey: string) => void;
  onDemoRun?: () => void;
}

export function StartCase({ onStartCase, onLoadDemo, onDemoRun }: StartCaseProps) {
  const [caseId, setCaseId] = useState(`NC-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  const [facilityType, setFacilityType] = useState<FacilityType>('spoke');
  const [patientAge, setPatientAge] = useState<string>('');
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode>('EMS');

  const [lkwMode, setLkwMode] = useState<'exact' | 'estimate' | 'unknown'>('estimate');
  const [lkwTime, setLkwTime] = useState<string>('');
  const [lkwEstimate, setLkwEstimate] = useState([60]); // minutes ago
  const [lkwUnknown, setLkwUnknown] = useState(false);

  const [uploadedText, setUploadedText] = useState('');
  const [medsListPresent, setMedsListPresent] = useState(false);
  const [imagingReportAvailable, setImagingReportAvailable] = useState(false);
  const [vitalsStreaming, setVitalsStreaming] = useState(false);

  const completeness = calculateCompletenessScore({
    lastKnownWell: lkwMode === 'unknown' ? null : new Date(),
    uploadedDocument: uploadedText || undefined,
    vitalsStreaming,
    medsListPresent,
    imagingReportAvailable
  });

  const handleStartCase = () => {
    let lkw: Date | null = null;

    if (lkwMode === 'exact' && lkwTime) {
      lkw = new Date(lkwTime);
    } else if (lkwMode === 'estimate') {
      lkw = new Date(Date.now() - lkwEstimate[0] * 60 * 1000);
    }

    const newCase: Partial<CaseData> = {
      id: caseId,
      facilityType,
      patientAge: patientAge ? parseInt(patientAge) : undefined,
      arrivalMode,
      lastKnownWell: lkw,
      lkwUnknown: lkwMode === 'unknown',
      edArrival: new Date(),
      uploadedDocument: uploadedText || undefined,
      medsListPresent,
      imagingReportAvailable,
      vitalsStreaming
    };

    onStartCase(newCase);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Start New Case</h2>
        <p className="text-slate-600">Create a new stroke pathway coordination case in under 60 seconds</p>
      </div>

      {/* Demo Run (Full Stack) - Prominent Button */}
      {onDemoRun && (
        <Card className="border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900">Demo Run (Full Stack)</h3>
                <p className="text-sm text-purple-700">Load Case A → Start MCP Pipeline → Navigate to Command Center</p>
              </div>
              <Button
                onClick={onDemoRun}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Play className="size-5" />
                Start Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Cases Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">Quick Demo Cases</CardTitle>
          <CardDescription>Load a pre-configured case to see NeuroCast in action</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            onClick={() => onLoadDemo('case-a')}
            variant="outline"
            className="bg-white"
          >
            Case A: Anticoagulant Alert
          </Button>
          <Button
            onClick={() => onLoadDemo('case-b')}
            variant="outline"
            className="bg-white"
          >
            Case B: Wake-up Stroke
          </Button>
          <Button
            onClick={() => onLoadDemo('case-c')}
            variant="outline"
            className="bg-white"
          >
            Case C: Clear LVO
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Case Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Case Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="caseId">Case ID</Label>
              <Input
                id="caseId"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="facilityType">Facility Type</Label>
              <Select
                value={facilityType}
                onValueChange={(value: FacilityType) => setFacilityType(value)}
              >
                <SelectTrigger id="facilityType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spoke">Non-specialized ED (spoke)</SelectItem>
                  <SelectItem value="hub">Stroke center (hub)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="patientAge">Patient Age (optional)</Label>
              <Input
                id="patientAge"
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="e.g., 68"
              />
            </div>

            <div>
              <Label htmlFor="arrivalMode">Arrival Mode</Label>
              <Select
                value={arrivalMode}
                onValueChange={(value: ArrivalMode) => setArrivalMode(value)}
              >
                <SelectTrigger id="arrivalMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMS">EMS</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Time Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline Seed</CardTitle>
            <CardDescription>Last Known Well (LKW) time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>LKW Input Mode</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mode-exact"
                    checked={lkwMode === 'exact'}
                    onCheckedChange={() => setLkwMode('exact')}
                  />
                  <Label htmlFor="mode-exact" className="font-normal cursor-pointer">Exact time</Label>
                </div>
                {lkwMode === 'exact' && (
                  <Input
                    type="datetime-local"
                    value={lkwTime}
                    onChange={(e) => setLkwTime(e.target.value)}
                    className="ml-6"
                  />
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mode-estimate"
                    checked={lkwMode === 'estimate'}
                    onCheckedChange={() => setLkwMode('estimate')}
                  />
                  <Label htmlFor="mode-estimate" className="font-normal cursor-pointer">Estimated</Label>
                </div>
                {lkwMode === 'estimate' && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">~{lkwEstimate[0]} min ago</span>
                    </div>
                    <Slider
                      value={lkwEstimate}
                      onValueChange={setLkwEstimate}
                      min={15}
                      max={180}
                      step={15}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mode-unknown"
                    checked={lkwMode === 'unknown'}
                    onCheckedChange={() => setLkwMode('unknown')}
                  />
                  <Label htmlFor="mode-unknown" className="font-normal cursor-pointer">Unknown</Label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-slate-600">
                <strong>ED Arrival:</strong> Now (auto-set)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Ingestion */}
      <Card>
        <CardHeader>
          <CardTitle>Data Ingestion</CardTitle>
          <CardDescription>Upload transfer packet or paste EHR text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="upload">Transfer Packet / EHR Text</Label>
            <Textarea
              id="upload"
              placeholder="Paste transfer packet, EHR summary, or patient history..."
              value={uploadedText}
              onChange={(e) => setUploadedText(e.target.value)}
              className="h-32 mt-2"
            />
            <p className="text-xs text-slate-500 mt-2">
              <Upload className="size-3 inline mr-1" />
              Or drag & drop PDF/TXT files (demo)
            </p>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="meds"
                checked={medsListPresent}
                onCheckedChange={(checked: boolean | "indeterminate") => setMedsListPresent(!!checked)}
              />
              <Label htmlFor="meds" className="font-normal cursor-pointer">Meds list present</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="imaging"
                checked={imagingReportAvailable}
                onCheckedChange={(checked: boolean | "indeterminate") => setImagingReportAvailable(!!checked)}
              />
              <Label htmlFor="imaging" className="font-normal cursor-pointer">Imaging report available</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telemetry */}
      <Card>
        <CardHeader>
          <CardTitle>Telemetry / Vitals Stream</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="vitals"
              checked={vitalsStreaming}
              onCheckedChange={(checked: boolean | "indeterminate") => setVitalsStreaming(!!checked)}
            />
            <Label htmlFor="vitals" className="font-normal cursor-pointer">Start vitals stream (demo simulator)</Label>
          </div>
          {vitalsStreaming && (
            <div className="ml-6 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <div className="size-2 bg-green-500 rounded-full animate-pulse" />
                <span>Streaming: HR, BP, SpO2, Glucose</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completeness Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Handoff Completeness Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Completeness Score</span>
              <span className="text-sm font-semibold">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              {lkwMode !== 'unknown' ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <Circle className="size-4 text-slate-300" />
              )}
              <span>LKW known</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {uploadedText ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <Circle className="size-4 text-slate-300" />
              )}
              <span>Packet uploaded</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {vitalsStreaming ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <Circle className="size-4 text-slate-300" />
              )}
              <span>Vitals streaming</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {imagingReportAvailable ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <Circle className="size-4 text-slate-300" />
              )}
              <span>CT/CTA info present</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="space-y-2 max-w-md">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="text-blue-900 font-medium mb-1">Pipeline Preview:</p>
            <p className="text-xs text-blue-700">
              REDACT → Compression (TokenCo) → Extraction → Numeric (Wood Wide) → Gate → Packet
            </p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-1">
            <p className="text-amber-900">
              <strong>Data Policy:</strong> Coordination tool only. No diagnosis. Synthetic demo data.
            </p>
            <p className="text-amber-900 text-xs">
              Before any AI processing, NeuroCast redacts PHI (names, DOB, MRN, phone, address).
            </p>
            <p className="text-amber-900 text-xs">
              Only redacted text is used for compression and extraction.
            </p>
          </div>
        </div>

        <Button onClick={handleStartCase} size="lg" className="gap-2">
          <Play className="size-5" />
          Run NeuroCast Pipeline
        </Button>
      </div>
    </div>
  );
}
