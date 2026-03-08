import { describe, expect, it } from "vitest";
import { AttentionRouter } from "../src/index.js";

const task = { taskId: "t1", goal: "open settings", maxTokenBudget: 1000, strictVerification: true };

describe("AttentionRouter", () => {
  it("returns reuse for tiny diffs with stable anchors", () => {
    const router = new AttentionRouter();
    const decision = router.route({
      diff: { diffScore: 0.01, changedRegions: [], comparedFrames: ["a", "b"] },
      memory: undefined,
      task,
      verificationFailed: false,
      changedAreaShare: 0.01,
      taskRelevantAnchorsChanged: false
    });
    expect(decision.mode).toBe("reuse");
  });

  it("forces full refresh on verification failure", () => {
    const router = new AttentionRouter();
    const decision = router.route({
      diff: { diffScore: 0.2, changedRegions: [], comparedFrames: ["a", "b"] },
      memory: undefined,
      task,
      verificationFailed: true,
      changedAreaShare: 0.05,
      taskRelevantAnchorsChanged: false
    });
    expect(decision.mode).toBe("full_refresh");
  });
});
