import type { ObservationForPlanner, ProposedDesktopAction } from "@persistence-claw/shared-types";

export interface PlannerExecutor {
  propose(observation: ObservationForPlanner): Promise<ProposedDesktopAction>;
}

export class MockPlannerExecutor implements PlannerExecutor {
  async propose(observation: ObservationForPlanner): Promise<ProposedDesktopAction> {
    if (observation.routeDecision === "reuse") {
      return { actionType: "wait", rationale: "Reuse indicates stable scene; avoid unnecessary interaction." };
    }

    return {
      actionType: "click",
      target: observation.currentScene.anchorRegions.find((anchor) => anchor.taskRelevant)?.bounds,
      rationale: `Proceeding with ${observation.routeDecision} to satisfy goal: ${observation.task.goal}`
    };
  }
}
