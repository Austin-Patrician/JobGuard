export type RiskLevel = "safe" | "suspicious" | "dangerous";

export type ToolkitTool = "mirror" | "contract";

// Mirror tool types
export interface TalkTranslation {
  original: string;
  realMeaning: string;
  severity: "high" | "medium" | "low";
}

export interface MirrorResult {
  riskLevel: RiskLevel;
  overallScore: number;
  summary: string;
  translations: TalkTranslation[];
  redFlags: string[];
  advice: string;
}

// Contract scanner types
export type ContractRiskCategory =
  | "salary"
  | "probation"
  | "resignation"
  | "liability"
  | "rights"
  | "other";

export interface ContractRiskItem {
  clause: string;
  category: ContractRiskCategory;
  severity: "high" | "medium" | "low";
  legalBasis: string;
  explanation: string;
  suggestion: string;
}

export interface ContractResult {
  riskLevel: RiskLevel;
  overallScore: number;
  salaryClarity: "clear" | "vague" | "missing";
  riskItems: ContractRiskItem[];
  legalAdvice: string;
}

// Analysis history record
interface AnalysisRecordBase {
  id: string;
  tool: ToolkitTool;
  timestamp: number;
  inputPreview: string;
  riskLevel: RiskLevel;
  score: number;
  summary: string;
}

export type AnalysisRecord =
  | (AnalysisRecordBase & {
      tool: "mirror";
      result: MirrorResult;
    })
  | (AnalysisRecordBase & {
      tool: "contract";
      result: ContractResult;
    });

// Store types
export interface ToolkitState {
  history: AnalysisRecord[];
  currentMirrorResult: MirrorResult | null;
  currentContractResult: ContractResult | null;
  isAnalyzing: boolean;
}

export interface ToolkitActions {
  setMirrorResult: (result: MirrorResult | null) => void;
  setContractResult: (result: ContractResult | null) => void;
  setIsAnalyzing: (value: boolean) => void;
  addHistory: (record: AnalysisRecord) => void;
  clearHistory: () => void;
}
