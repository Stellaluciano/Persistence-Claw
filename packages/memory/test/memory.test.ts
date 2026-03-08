import { describe, expect, it } from "vitest";
import { VisualMemoryStore } from "../src/index.js";

describe("VisualMemoryStore", () => {
  it("retains bounded history and returns latest", () => {
    const store = new VisualMemoryStore(2);
    store.upsert(
      {
        sceneId: "s1",
        semanticSummary: "login form",
        snapshot: { frameId: "f1", imagePath: "a", capturedAt: "t1", dimensions: { width: 10, height: 10 } },
        anchorRegions: []
      },
      0.1
    );
    store.upsert(
      {
        sceneId: "s2",
        semanticSummary: "dashboard",
        snapshot: { frameId: "f2", imagePath: "b", capturedAt: "t2", dimensions: { width: 10, height: 10 } },
        anchorRegions: []
      },
      0.2
    );
    store.upsert(
      {
        sceneId: "s3",
        semanticSummary: "dashboard details",
        snapshot: { frameId: "f3", imagePath: "c", capturedAt: "t3", dimensions: { width: 10, height: 10 } },
        anchorRegions: []
      },
      0.3
    );

    expect(store.recent(10)).toHaveLength(2);
    expect(store.latest()?.sceneState.sceneId).toBe("s3");
  });
});
