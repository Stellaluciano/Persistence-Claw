import { runDemoWorkflow } from "@persistence-claw/sdk";

async function main() {
  const summary = await runDemoWorkflow({
    taskId: "demo-1",
    goal: "open settings panel",
    maxTokenBudget: 4096,
    strictVerification: true
  });

  // biome-ignore lint/suspicious/noConsoleLog: demo CLI output
  console.log("Persistence Claw demo routing decisions:");
  for (const step of summary.steps) {
    // biome-ignore lint/suspicious/noConsoleLog: demo CLI output
    console.log(`- ${step.frameId}: ${step.route} (${step.estimatedTokens} tokens) :: ${step.reason}`);
  }
  // biome-ignore lint/suspicious/noConsoleLog: demo CLI output
  console.log(`Total estimated tokens: ${summary.totalEstimatedTokens}`);
}

main();
