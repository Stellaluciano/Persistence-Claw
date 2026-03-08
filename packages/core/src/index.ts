import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { CaptureProvider } from "@persistence-claw/capture";
import { VisualMemoryStore } from "@persistence-claw/memory";
import type { PlannerExecutor } from "@persistence-claw/planner-interface";
import { AttentionRouter } from "@persistence-claw/router";
import type {
  AnchorRegion,
  DiffResult,
  ProposedDesktopAction,
  SceneState,
  TaskContext
} from "@persistence-claw/shared-types";

const diffSchema = z.object({
  diffScore: z.number(),
  changedRegions: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      changedPixels: z.number(),
      normalizedChange: z.number()
    })
  ),
  comparedFrames: z.tuple([z.string(), z.string()])
});

export interface RuntimeStepResult {
  scene: SceneState;
  route: "reuse" | "regional_refresh" | "full_refresh";
  reason: string;
  action: ProposedDesktopAction;
  estimatedTokens: number;
}

export interface DiffBridgeOptions {
  binaryPath?: string;
}

export async function runRustDiff(previousImagePath: string, currentImagePath: string, options: DiffBridgeOptions = {}): Promise<DiffResult> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultBinaryPath = path.resolve(moduleDir, "../../../native/vision-diff/target/debug/vision-diff");
  const binaryPath = options.binaryPath ?? process.env.PERSISTENCE_CLAW_DIFF_BIN ?? defaultBinaryPath;

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [previousImagePath, currentImagePath], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(new Error(`Unable to execute diff binary (${binaryPath}): ${error.message}`)));

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Diff binary failed with code ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        resolve(diffSchema.parse(JSON.parse(stdout)));
      } catch (error) {
        reject(new Error(`Invalid diff output: ${error instanceof Error ? error.message : String(error)}. Raw: ${stdout}`));
      }
    });
  });
}

function inferChangedAreaShare(diff: DiffResult, dimensions: { width: number; height: number }): number {
  const total = dimensions.width * dimensions.height;
  const changedArea = diff.changedRegions.reduce((acc, region) => acc + region.width * region.height, 0);
  return total === 0 ? 0 : Math.min(1, changedArea / total);
}

function anchorsChanged(anchors: AnchorRegion[], changedAreaShare: number): boolean {
  return anchors.some((anchor) => anchor.taskRelevant) && changedAreaShare > 0.05;
}

export class PersistenceRuntime {
  private readonly memory = new VisualMemoryStore();
  private readonly router = new AttentionRouter();
  private previousScene: SceneState | undefined;

  constructor(
    private readonly capture: CaptureProvider,
    private readonly planner: PlannerExecutor,
    private readonly diffOptions: DiffBridgeOptions = {}
  ) {}

  async step(task: TaskContext, verificationFailed = false): Promise<RuntimeStepResult> {
    const { snapshot, anchors } = await this.capture.captureNext();
    const semanticSummary = anchors.length > 0 ? anchors.map((anchor) => anchor.label).join(", ") : "unknown-desktop-state";

    const scene: SceneState = {
      sceneId: snapshot.frameId,
      snapshot,
      anchorRegions: anchors,
      semanticSummary
    };

    const diff = this.previousScene
      ? await runRustDiff(this.previousScene.snapshot.imagePath, scene.snapshot.imagePath, this.diffOptions)
      : { diffScore: 1, changedRegions: [], comparedFrames: [scene.snapshot.imagePath, scene.snapshot.imagePath] };

    const changedAreaShare = inferChangedAreaShare(diff, scene.snapshot.dimensions);
    const decision = this.router.route({
      diff,
      memory: this.memory.latest(),
      task,
      verificationFailed,
      changedAreaShare,
      taskRelevantAnchorsChanged: anchorsChanged(anchors, changedAreaShare)
    });

    this.memory.upsert(scene, diff.diffScore);
    const action = await this.planner.propose({ task, currentScene: scene, routeDecision: decision.mode });
    this.previousScene = scene;

    const estimatedTokens = decision.mode === "full_refresh" ? 700 : decision.mode === "regional_refresh" ? 200 : 30;
    return { scene, route: decision.mode, reason: decision.reason, action, estimatedTokens };
  }
}
