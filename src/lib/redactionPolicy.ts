import type { RedactionSummary } from '@neurocast/shared';

export type PhiPattern = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  examples: string[];
};

export const PHI_PATTERNS: PhiPattern[] = [
  {
    id: 'NAME',
    label: 'Patient name',
    description: 'First and last names, including initials when paired with clinical context.',
    placeholder: '[NAME]',
    examples: ['Patient: John Smith', 'Name: A. B.']
  },
  {
    id: 'DOB',
    label: 'Date of birth',
    description: 'Exact dates of birth or age patterns that imply DOB.',
    placeholder: '[DOB]',
    examples: ['DOB: 01/02/1950', 'Date of Birth: 1950-02-01']
  },
  {
    id: 'PHONE',
    label: 'Phone number',
    description: 'Telephone numbers in common US formats.',
    placeholder: '[PHONE]',
    examples: ['Contact: 555-123-4567', '(555) 123-4567']
  },
  {
    id: 'EMAIL',
    label: 'Email address',
    description: 'Email addresses containing an @ symbol and domain.',
    placeholder: '[EMAIL]',
    examples: ['john.smith@example.com']
  },
  {
    id: 'ADDRESS',
    label: 'Postal address',
    description: 'Street addresses and ZIP codes that can locate an individual.',
    placeholder: '[ADDRESS]',
    examples: ['Address: 123 Main St, Springfield, NY 12345']
  },
  {
    id: 'MRN',
    label: 'Medical record number',
    description: 'Identifiers such as MRN, patient ID, or account numbers.',
    placeholder: '[MRN]',
    examples: ['MRN: 123456789', 'Patient ID: A12345']
  }
];

export type RedactResult = {
  redactedText: string;
  redactionSummary: RedactionSummary;
};

export function redactText(rawText: string): RedactResult {
  return {
    redactedText: rawText,
    redactionSummary: {
      phiRemoved: false,
      removedFields: [],
      method: 'REGEX_DEMO'
    }
  };
}

