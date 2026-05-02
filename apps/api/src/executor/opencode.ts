import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import type { WorkerModel } from "@pavane/shared";

export type OpenCodeResult = {
  exitCode: number;
  output: string;
};

export type OpenCodeOptions = {
  worktreePath: string;
  model: WorkerModel;
  prompt: string;
  runId: string;
  label: string;
  logsDir: string;
  onLog?: (line: string, stream: "stdout" | "stderr") => void;
  timeoutMs?: number;
};

export async function runOpenCode(opts: OpenCodeOptions): Promise<OpenCodeResult> {
  const {
    worktreePath,
    model,
    prompt,
    runId,
    label,
    logsDir,
    onLog,
    timeoutMs = 10 * 60 * 1000,
  } = opts;

  fs.mkdirSync(logsDir, { recursive: true });
  const logsPath = path.join(logsDir, `${runId}-${label}.log`);
  const logStream = fs.createWriteStream(logsPath, { flags: "a" });

  return new Promise((resolve) => {
    const args = [
      "run",
      "--model",
      model,
      "--dangerously-skip-permissions",
      prompt,
    ];

    const proc = spawn("opencode", args, {
      cwd: worktreePath,
      env: {
        ...process.env,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const lines: string[] = [];

    proc.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      logStream.write(text);
      text.split("\n").filter(Boolean).forEach((line) => {
        lines.push(line);
        onLog?.(line, "stdout");
      });
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      logStream.write("[stderr] " + text);
      text.split("\n").filter(Boolean).forEach((line) => {
        lines.push("[stderr] " + line);
        onLog?.(line, "stderr");
      });
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      logStream.end();
      resolve({ exitCode: -1, output: lines.join("\n") + "\n[TIMEOUT]" });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      logStream.end();
      resolve({ exitCode: code ?? 1, output: lines.join("\n") });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      logStream.write(`[spawn error] ${err.message}\n`);
      logStream.end();
      resolve({ exitCode: -2, output: `Spawn error: ${err.message}` });
    });
  });
}
