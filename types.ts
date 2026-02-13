
export enum AppView {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  ANALYSIS = 'ANALYSIS',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}

export type Language = 'en' | 'vi';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  hospitalName: string;
  specialty: string;
  avatarUrl?: string;
  themePref?: 'light' | 'dark';
}

export interface PatientIntake {
  name: string;
  age: string;
  gender: 'Male' | 'Female';
  chiefComplaint: string;
  history: string;
  vitals: {
    bp: string;
    hr: string;
    spO2: string;
    temp: string;
  };
  labs?: {
    creatinine?: string;
    cea?: string;
    afp?: string;
  };
}

export interface ROIAnnotation {
  id: string;
  type: 'rect' | 'path' | 'circle';
  points: { x: number; y: number }[];
  label: string;
  measurements?: {
    length?: number; // mm
    width?: number; // mm
    volume?: number; // mm3
    huValue?: number; // Hounsfield Units (CT)
    adcValue?: number; // ADC (MRI)
  };
  isConfirmed: boolean;
}

export interface PrognosisResult {
  recurrenceRisk: number; // 0-100%
  mortality5Year: number; // 0-100%
  pfsMonths: number; // Progression-free survival in months
  standardReference: string; // e.g., "NCCN 2024 Guidelines"
}

export interface AnalysisResult {
  findings: string[];
  diagnosis: string;
  confidence: number;
  recommendations: string[];
  maskImage?: string; 
  rois: ROIAnnotation[];
  prognosis?: PrognosisResult;
  guidelines: string;
  reportText: string;
}

export interface DetailedMedication {
  category: 'Chemotherapy' | 'Immunotherapy' | 'Supportive' | 'Antibiotic' | 'Analgesic';
  genericName: string;
  tradeNameExample: string;
  dosage: string;
  route: string; // e.g., "IV Infusion over 3 hrs", "PO"
  frequency: string;
  duration: string;
  mechanism: string; // Clinical explanation of why this drug is used
  sideEffects: string[];
  blackBoxWarning?: string; // Critical alerts
}

export interface SafetyCheck {
  isSafe: boolean;
  alerts: { type: 'Interaction' | 'Contraindication' | 'Vitals'; message: string; severity: 'high' | 'medium' }[];
  renalAdjustmentNeeded: boolean;
}

export interface TreatmentPlan {
  protocolName: string;
  guidelineVersion: string; // e.g., "NCCN v3.2024"
  cycleInfo: string; // e.g., "Repeat every 21 days for 6 cycles"
  medications: DetailedMedication[];
  lifestyle: string[];
  safetyAnalysis: SafetyCheck;
  followUp: string;
}

export interface FullCaseRecord {
  id?: string;
  userId: string;
  intake: PatientIntake;
  analysis: AnalysisResult;
  treatment: TreatmentPlan;
  imageUrl: string;
  maskUrl?: string;
  aiProposedRois: ROIAnnotation[];
  doctorConfirmedRois: ROIAnnotation[];
  timestamp: any;
}

// --- Chatbot Types ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface MedicalContext {
  patient?: PatientIntake;
  diagnosis?: AnalysisResult;
  treatment?: TreatmentPlan;
  activeView: AppView;
}
