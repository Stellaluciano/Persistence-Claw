export type PerceptionMode = "reuse" | "regional_refresh" | "full_refresh";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneSnapshot {
  frameId: string;
  imagePath: string;
  capturedAt: string;
  sourceWindow?: string;
  dimensions: { width: number; height: number };
}

export interface AnchorRegion {
  id: string;
  label: string;
  bounds: BoundingBox;
  taskRelevant: boolean;
  lastValidatedAt?: string;
}

export interface SceneState {
  sceneId: string;
  snapshot: SceneSnapshot;
  anchorRegions: AnchorRegion[];
  semanticSummary: string;
}

export interface VisualMemoryEntry {
  timestamp: string;
  sceneState: SceneState;
  diffScoreFromPrevious?: number;
}

export interface TaskContext {
  taskId: string;
  goal: string;
  maxTokenBudget: number;
  strictVerification: boolean;
}

export interface DiffRegion extends BoundingBox {
  changedPixels: number;
  normalizedChange: number;
}

export interface DiffResult {
  diffScore: number;
  changedRegions: DiffRegion[];
  comparedFrames: [string, string];
}

export interface ObservationForPlanner {
  task: TaskContext;
  currentScene: SceneState;
  routeDecision: PerceptionMode;
}

export interface ProposedDesktopAction {
  actionType: "click" | "type" | "wait";
  target?: BoundingBox;
  payload?: string;
  rationale: string;
}
