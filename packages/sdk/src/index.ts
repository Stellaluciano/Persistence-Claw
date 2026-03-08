import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileSequenceCaptureProvider } from "@persistence-claw/capture";
import { PersistenceRuntime } from "@persistence-claw/core";
import { MockPlannerExecutor } from "@persistence-claw/planner-interface";
import type { TaskContext } from "@persistence-claw/shared-types";

export interface WorkflowSummary {
  steps: Array<{ frameId: string; route: string; estimatedTokens: number; reason: string }>;
  totalEstimatedTokens: number;
}

export async function runDemoWorkflow(task: TaskContext): Promise<WorkflowSummary> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const fixtureRoot = path.resolve(moduleDir, "../../../fixtures");
  const provider = new FileSequenceCaptureProvider([
    path.join(fixtureRoot, "step-0.json"),
    path.join(fixtureRoot, "step-1.json"),
    path.join(fixtureRoot, "step-2.json"),
    path.join(fixtureRoot, "step-3.json")
  ]);
  const runtime = new PersistenceRuntime(provider, new MockPlannerExecutor());

  const steps: WorkflowSummary["steps"] = [];
  for (let i = 0; i < 4; i += 1) {
    const step = await runtime.step(task, false);
    steps.push({ frameId: step.scene.snapshot.frameId, route: step.route, estimatedTokens: step.estimatedTokens, reason: step.reason });
  }

  return { steps, totalEstimatedTokens: steps.reduce((sum, step) => sum + step.estimatedTokens, 0) };
}
