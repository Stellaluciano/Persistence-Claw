import { z } from "zod";
import type { DiffResult, PerceptionMode, TaskContext, VisualMemoryEntry } from "@persistence-claw/shared-types";

export interface RouterConfig {
  lowDiffThreshold: number;
  highDiffThreshold: number;
  maxRegionShare: number;
}

export interface RoutingDecision {
  mode: PerceptionMode;
  reason: string;
}

const configSchema = z.object({
  lowDiffThreshold: z.number().min(0).max(1),
  highDiffThreshold: z.number().min(0).max(1),
  maxRegionShare: z.number().min(0).max(1)
});

export class AttentionRouter {
  constructor(private readonly config: RouterConfig = { lowDiffThreshold: 0.05, highDiffThreshold: 0.35, maxRegionShare: 0.4 }) {
    configSchema.parse(config);
  }

  route(params: {
    diff: DiffResult;
    memory: VisualMemoryEntry | undefined;
    task: TaskContext;
    verificationFailed: boolean;
    changedAreaShare: number;
    taskRelevantAnchorsChanged: boolean;
  }): RoutingDecision {
    const { diff, verificationFailed, changedAreaShare, taskRelevantAnchorsChanged, task } = params;

    if (verificationFailed || diff.diffScore >= this.config.highDiffThreshold) {
      return { mode: "full_refresh", reason: "High diff or failed verification requires broad re-analysis." };
    }

    if (
      diff.diffScore < this.config.lowDiffThreshold &&
      !taskRelevantAnchorsChanged &&
      changedAreaShare < this.config.maxRegionShare / 4
    ) {
      return { mode: "reuse", reason: "Low diff and stable task anchors allow iconic-memory reuse." };
    }

    if (changedAreaShare < this.config.maxRegionShare && task.maxTokenBudget > 0) {
      return { mode: "regional_refresh", reason: "Localized diff triggers selective attention on changed regions." };
    }

    return { mode: "full_refresh", reason: "Diff spread or budget risk warrants full refresh." };
  }
}
