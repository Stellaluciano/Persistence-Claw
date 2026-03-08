import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDemoWorkflow } from "@persistence-claw/sdk";

export interface TokenEstimatorConfig {
  fullFrameTokenCost: number;
  regionalFrameTokenCost: number;
  reuseTokenCost: number;
}

export async function runBenchmark(config: TokenEstimatorConfig = { fullFrameTokenCost: 700, regionalFrameTokenCost: 200, reuseTokenCost: 30 }) {
  const summary = await runDemoWorkflow({
    taskId: "bench-1",
    goal: "open settings panel",
    maxTokenBudget: 5000,
    strictVerification: true
  });

  const naiveCost = summary.steps.length * config.fullFrameTokenCost;
  const persistenceCost = summary.steps.reduce((acc, step) => {
    if (step.route === "full_refresh") {
      return acc + config.fullFrameTokenCost;
    }
    if (step.route === "regional_refresh") {
      return acc + config.regionalFrameTokenCost;
    }
    return acc + config.reuseTokenCost;
  }, 0);

  const fullRefreshes = summary.steps.filter((step) => step.route === "full_refresh").length;
  const regionalRefreshes = summary.steps.filter((step) => step.route === "regional_refresh").length;
  const reductionPct = ((naiveCost - persistenceCost) / naiveCost) * 100;

  const report = {
    naiveCost,
    persistenceCost,
    reductionPct,
    fullRefreshes,
    regionalRefreshes,
    avoidedFullScreenAnalyses: summary.steps.length - fullRefreshes,
    steps: summary.steps
  };

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const reportDir = path.resolve(moduleDir, "../../../docs");
  await mkdir(reportDir, { recursive: true });
  const markdown = `# Sample Benchmark Report\n\n- Naive total estimated tokens: ${naiveCost}\n- Persistence Claw total estimated tokens: ${persistenceCost}\n- Estimated reduction: ${reductionPct.toFixed(2)}%\n- Full refreshes: ${fullRefreshes}\n- Regional refreshes: ${regionalRefreshes}\n- Full-screen analyses avoided: ${summary.steps.length - fullRefreshes}\n`;
  await writeFile(path.join(reportDir, "sample-benchmark-report.md"), markdown, "utf8");

  return report;
}

if (process.argv[1]?.endsWith("index.ts")) {
  runBenchmark().then((report) => {
    // biome-ignore lint/suspicious/noConsoleLog: benchmark CLI output
    console.log(JSON.stringify(report, null, 2));
  });
}
