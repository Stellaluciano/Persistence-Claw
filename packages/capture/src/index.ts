import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AnchorRegion, SceneSnapshot } from "@persistence-claw/shared-types";

const fixtureSchema = z.object({
  frameId: z.string(),
  imagePath: z.string(),
  capturedAt: z.string(),
  sourceWindow: z.string().optional(),
  dimensions: z.object({ width: z.number(), height: z.number() }),
  anchors: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
      taskRelevant: z.boolean()
    })
  )
});

export interface CaptureProvider {
  captureNext(): Promise<{ snapshot: SceneSnapshot; anchors: AnchorRegion[] }>;
  reset(): void;
}

export class FileSequenceCaptureProvider implements CaptureProvider {
  private cursor = 0;

  constructor(private readonly fixtureManifestPaths: string[]) {}

  async captureNext(): Promise<{ snapshot: SceneSnapshot; anchors: AnchorRegion[] }> {
    const index = Math.min(this.cursor, this.fixtureManifestPaths.length - 1);
    const manifestPath = this.fixtureManifestPaths[index];
    const parsed = fixtureSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
    this.cursor += 1;

    return {
      snapshot: {
        frameId: parsed.frameId,
        imagePath: path.resolve(path.dirname(manifestPath), parsed.imagePath),
        capturedAt: parsed.capturedAt,
        sourceWindow: parsed.sourceWindow,
        dimensions: parsed.dimensions
      },
      anchors: parsed.anchors
    };
  }

  reset(): void {
    this.cursor = 0;
  }
}
