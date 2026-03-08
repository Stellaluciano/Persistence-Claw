# Architecture

Persistence Claw is a layered runtime that adds visual persistence to desktop-control agents.

## Layers

1. **Capture Layer (`packages/capture`)**
   - Abstracts screenshot acquisition.
   - Current implementation is file-sequence based for reproducible tests.

2. **Perceptual Diff Layer (`native/vision-diff`, bridged via `packages/core`)**
   - Rust block-based grayscale diff.
   - Emits JSON with `diffScore` and changed regions.

3. **Visual Persistence Memory (`packages/memory`)**
   - Maintains short-term scene snapshots and structured state.
   - Supports latest, recent, and simple similar-scene retrieval.

4. **Attention / Relevance Router (`packages/router`)**
   - Task-aware policy selects `reuse`, `regional_refresh`, or `full_refresh`.

5. **Planner / Executor Interface (`packages/planner-interface`)**
   - Stable boundary for OpenClaw-compatible planner integration.

6. **Verification / Update (`packages/core`)**
   - Updates memory each step and escalates to full refresh on verification risk.

## OpenClaw integration boundary

`packages/shared-types` intentionally models OpenClaw-style observation/action contracts without binding to internal upstream APIs. This keeps Persistence Claw usable as middleware and benchmark substrate.

## Replacing mock capture with real desktop capture

Implement a new `CaptureProvider` in `packages/capture` that wraps OS-level screenshot APIs, then inject it into `PersistenceRuntime`.
