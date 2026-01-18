import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Mic, Volume2, MessageCircle, ArrowLeft } from 'lucide-react';
import { CaseData, VoiceAnnouncement } from '../../types/case';
import { toast } from 'sonner';

interface VoiceCommanderProps {
  caseData: CaseData;
  announcements: VoiceAnnouncement[];
  onBack: () => void;
  onAnnounce: (message: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'Why did you escalate?',
  'What evidence triggered that?',
  'What\'s missing to proceed?',
  'Summarize this case for transfer',
  'Read the evidence line'
];

export function VoiceCommander({ caseData, announcements, onBack, onAnnounce }: VoiceCommanderProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [announceStateChanges, setAnnounceStateChanges] = useState(true);
  const [announceMissing, setAnnounceMissing] = useState(true);
  
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const handleTestAnnouncement = () => {
    const message = `Workflow state is ${caseData.workflowState}. ${caseData.workflowReason}`;
    onAnnounce(message);
    toast.success('Test announcement played');
    
    // Simulate voice
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceQuestion = (question: string) => {
    setTranscript(question);
    
    // Generate contextual response
    let answer = '';
    
    if (question.includes('escalate')) {
      answer = `I escalated this case because: ${caseData.workflowReason}. The triggered rule was: ${caseData.triggeredRule}`;
    } else if (question.includes('evidence')) {
      const topFlag = caseData.riskFlags[0];
      if (topFlag) {
        answer = `The most critical evidence is: ${topFlag.name}. Quote: "${topFlag.evidenceQuote}". This is found in the ${topFlag.section} section.`;
      } else {
        answer = 'No critical evidence flags were extracted.';
      }
    } else if (question.includes('missing')) {
      if (caseData.missingItems.length > 0) {
        answer = `The following items are missing: ${caseData.missingItems.join(', ')}. I recommend obtaining these before proceeding.`;
      } else {
        answer = 'All required information has been collected. The case appears complete.';
      }
    } else if (question.includes('summarize')) {
      answer = `Case ${caseData.id}. ${caseData.patientAge ? `Age ${caseData.patientAge}. ` : ''}Arrived via ${caseData.arrivalMode}. Current state: ${caseData.workflowState}. ${caseData.riskFlags.length} risk flags identified. Completeness: ${caseData.completenessScore}%.`;
    } else {
      answer = 'I can help summarize the case and explain coordination decisions, but I cannot provide medical diagnosis or treatment advice.';
    }
    
    setResponse(answer);
    
    // Speak response
    if ('speechSynthesis' in window && voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleListen = () => {
    setListening(!listening);
    if (!listening) {
      toast.info('Voice input activated (demo)');
      setTimeout(() => {
        setListening(false);
        setTranscript('Why did you escalate?');
        handleVoiceQuestion('Why did you escalate?');
      }, 2000);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-semibold">Voice Commander</h2>
          <p className="text-slate-600">Push alerts and interactive Q&A</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Mode A: Push Alerts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="size-5" />
                Push Alerts
              </CardTitle>
              <CardDescription>Automatic voice announcements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label htmlFor="voice-enabled" className="cursor-pointer">
                  Voice alerts enabled
                </Label>
                <Switch
                  id="voice-enabled"
                  checked={voiceEnabled}
                  onCheckedChange={(checked: boolean) => setVoiceEnabled(checked)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="announce-state" className="cursor-pointer text-sm">
                    Announce state changes
                  </Label>
                  <Switch
                    id="announce-state"
                    checked={announceStateChanges}
                    onCheckedChange={(checked: boolean) => setAnnounceStateChanges(checked)}
                    disabled={!voiceEnabled}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="announce-missing" className="cursor-pointer text-sm">
                    Announce missing checklist items
                  </Label>
                  <Switch
                    id="announce-missing"
                    checked={announceMissing}
                    onCheckedChange={(checked: boolean) => setAnnounceMissing(checked)}
                    disabled={!voiceEnabled}
                  />
                </div>
              </div>

              <Button 
                onClick={handleTestAnnouncement} 
                variant="outline" 
                className="w-full gap-2"
                disabled={!voiceEnabled}
              >
                <Volume2 className="size-4" />
                Test Announcement
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Log</CardTitle>
              <CardDescription>Recent announcements</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                      <div 
                        key={announcement.id} 
                        className="p-3 bg-slate-50 border rounded text-sm"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {announcement.type}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {announcement.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-700">{announcement.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No announcements yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Mode B: Interactive Q&A */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                Interactive Q&A
              </CardTitle>
              <CardDescription>Ask about case coordination</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <Button
                  size="lg"
                  onClick={handleListen}
                  className={`gap-2 ${listening ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  <Mic className={`size-5 ${listening ? 'animate-pulse' : ''}`} />
                  {listening ? 'Listening...' : 'Hold to Talk'}
                </Button>
              </div>

              {transcript && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Your Question:</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm">{transcript}</p>
                  </div>
                </div>
              )}

              {response && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">NeuroCast Response:</Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm">{response}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested Questions</CardTitle>
              <CardDescription>Click to ask</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handleVoiceQuestion(question)}
                  >
                    <MessageCircle className="size-4 mr-2 shrink-0" />
                    <span className="text-sm">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-sm">Question Guardrails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-amber-900 mb-1">✅ Allowed Questions:</p>
                <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Coordination decisions & workflow state</li>
                  <li>Evidence extraction & source details</li>
                  <li>Missing information checklist</li>
                  <li>Case summarization for handoff</li>
                  <li>Timeline & metric calculations</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-amber-900 mb-1">❌ Blocked Topics:</p>
                <p className="text-xs text-amber-700">
                  Diagnosis, treatment advice, clinical decision-making. 
                  NeuroCast provides coordination guidance only.
                </p>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-600 italic">Voice powered by LiveKit (demo)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
