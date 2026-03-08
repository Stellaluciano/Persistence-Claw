import type { SceneState, TaskContext, VisualMemoryEntry } from "@persistence-claw/shared-types";

export class VisualMemoryStore {
  private readonly entries: VisualMemoryEntry[] = [];

  constructor(private readonly maxEntries = 64) {}

  upsert(sceneState: SceneState, diffScoreFromPrevious?: number): VisualMemoryEntry {
    const entry: VisualMemoryEntry = {
      timestamp: sceneState.snapshot.capturedAt,
      sceneState,
      diffScoreFromPrevious
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  latest(): VisualMemoryEntry | undefined {
    return this.entries.at(-1);
  }

  recent(limit = 5): VisualMemoryEntry[] {
    return this.entries.slice(-limit);
  }

  similarScenes(task: TaskContext): VisualMemoryEntry[] {
    return this.entries
      .filter((entry) => entry.sceneState.semanticSummary.toLowerCase().includes(task.goal.toLowerCase().split(" ")[0]))
      .slice(-3);
  }
}
