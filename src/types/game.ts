export type LevelId = "golden-eye" | "debate" | "contract-maze";

export type GamePhase = "idle" | "playing" | "paused" | "game-over" | "victory";

export type LevelPhase = "intro" | "playing" | "review" | "results";

export type Rating = "S" | "A" | "B" | "C" | "D";

export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  score: number;
  rating: Rating | null;
  bestScore: number;
}

export interface GameState {
  hp: number;
  maxHp: number;
  exp: number;
  phase: GamePhase;
  currentLevel: LevelId | null;
  levels: Record<LevelId, LevelProgress>;
}

// Level 1: JD Trap Detection
export interface JDTrap {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  category: "salary" | "overtime" | "responsibility" | "benefit" | "contract" | "vague";
  severity: "high" | "medium" | "low";
  explanation: string;
}

export interface JDScript {
  id: string;
  company: string;
  position: string;
  salary: string;
  fullText: string;
  traps: JDTrap[];
}

// Level 2: Debate Chat
export interface DialogueOption {
  id: string;
  text: string;
  hpDelta: number;
  expDelta: number;
  isCorrect: boolean;
  feedback: string;
}

export interface DialogueNode {
  id: string;
  speaker: "hr" | "player" | "system";
  text: string;
  options?: DialogueOption[];
  allowFreeInput?: boolean;
  nextNodeId?: string;
}

export interface DebateScript {
  id: string;
  scenario: string;
  hrName: string;
  hrAvatar: string;
  nodes: DialogueNode[];
}

// Level 3: Contract Clauses
export interface ContractClause {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  isTrap: boolean;
  severity: "critical" | "warning" | "info";
  legalBasis: string;
  explanation: string;
  suggestion: string;
}

export interface ContractScript {
  id: string;
  title: string;
  companyName: string;
  fullText: string;
  clauses: ContractClause[];
  magnifierUses: number;
}

// Chat message for Level 2
export interface ChatMessage {
  id: string;
  role: "hr" | "player" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

// Game store actions
export interface GameActions {
  startGame: () => void;
  resetGame: () => void;
  setCurrentLevel: (level: LevelId) => void;
  completeLevel: (level: LevelId, score: number) => void;
  adjustHp: (delta: number) => void;
  adjustExp: (delta: number) => void;
  setPhase: (phase: GamePhase) => void;
  getRating: (score: number) => Rating;
}
