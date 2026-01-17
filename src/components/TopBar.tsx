import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { HelpCircle, Activity } from 'lucide-react';
import { WorkflowState } from '../types/case';

interface TopBarProps {
  currentCaseId: string;
  availableCases: string[];
  workflowState: WorkflowState;
  completenessScore: number;
  onCaseChange: (caseId: string) => void;
}

export function TopBar({ currentCaseId, availableCases, workflowState, completenessScore, onCaseChange }: TopBarProps) {
  const stateColors: Record<WorkflowState, string> = {
    PROCEED: 'bg-green-600 hover:bg-green-600',
    HOLD: 'bg-yellow-600 hover:bg-yellow-600',
    ESCALATE: 'bg-red-600 hover:bg-red-600'
  };

  return (
    <div className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="size-6 text-blue-600" />
          <h1 className="text-xl font-semibold">NeuroCast AI</h1>
        </div>
        <Badge variant="outline" className="bg-slate-50">
          Demo / Synthetic Data
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Active Case:</span>
          <Select value={currentCaseId} onValueChange={onCaseChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCases.map((caseId) => (
                <SelectItem key={caseId} value={caseId}>
                  {caseId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border rounded-lg">
          <span className="text-xs text-slate-600">Completeness:</span>
          <span className="text-sm font-semibold text-blue-600">{completenessScore}%</span>
        </div>

        <Badge className={`${stateColors[workflowState]} text-white px-4 py-1.5 text-sm font-semibold`}>
          {workflowState}
        </Badge>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <HelpCircle className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>About NeuroCast AI</SheetTitle>
              <SheetDescription>Care coordination guidance</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  ⚕️ Coordination Only - No Diagnosis
                </p>
                <p className="text-sm text-blue-700">
                  NeuroCast AI assists with care coordination, handoff preparation, and workflow navigation. 
                  It does not diagnose patients or recommend specific treatments.
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  🧪 Synthetic Demo Data
                </p>
                <p className="text-sm text-amber-700">
                  All patient data shown is synthetic and generated for demonstration purposes only.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-sm">Workflow States</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge className="bg-green-600 hover:bg-green-600 shrink-0">PROCEED</Badge>
                    <span className="text-slate-600">Data complete, no contraindications detected</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-yellow-600 hover:bg-yellow-600 shrink-0">HOLD</Badge>
                    <span className="text-slate-600">Critical information missing or risk requires review</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-red-600 hover:bg-red-600 shrink-0">ESCALATE</Badge>
                    <span className="text-slate-600">Immediate specialist consultation required</span>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}