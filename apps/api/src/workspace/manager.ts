import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import type { WorkerLabel } from "@pavane/shared";

export type WorktreeInfo = {
  worktreePath: string;
  branch: string;
};

export class WorkspaceManager {
  constructor(private repoPath: string) {}

  isGitRepo(): boolean {
    try {
      execSync("git rev-parse --git-dir", { cwd: this.repoPath, stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultBranch(): string {
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: this.repoPath,
        stdio: "pipe",
      })
        .toString()
        .trim();
      return branch || "main";
    } catch {
      return "main";
    }
  }

  getRecentFiles(limit = 20): string[] {
    try {
      const output = execSync(
        `git log --name-only --pretty=format: -${limit} | grep -v '^$' | sort -u | head -30`,
        { cwd: this.repoPath, stdio: "pipe" }
      )
        .toString()
        .trim();
      return output ? output.split("\n").filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  createWorktree(runId: string, label: WorkerLabel, branchPrefix = "pavane/"): WorktreeInfo {
    const worktreeBase = path.join(this.repoPath, ".pavane", "worktrees");
    fs.mkdirSync(worktreeBase, { recursive: true });

    const worktreeName = `${runId}-${label}`;
    const worktreePath = path.join(worktreeBase, worktreeName);
    const branch = `${branchPrefix}${worktreeName}`;

    if (fs.existsSync(worktreePath)) {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    }

    try {
      execSync(`git worktree add -b "${branch}" "${worktreePath}"`, {
        cwd: this.repoPath,
        stdio: "pipe",
      });
    } catch (e: any) {
      const msg = e.message ?? String(e);
      if (msg.includes("already exists")) {
        execSync(`git worktree add "${worktreePath}" HEAD`, {
          cwd: this.repoPath,
          stdio: "pipe",
        });
      } else {
        throw e;
      }
    }

    return { worktreePath, branch };
  }

  removeWorktree(worktreePath: string): void {
    try {
      execSync(`git worktree remove --force "${worktreePath}"`, {
        cwd: this.repoPath,
        stdio: "pipe",
      });
    } catch {
      if (fs.existsSync(worktreePath)) {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
    }
    try {
      execSync("git worktree prune", { cwd: this.repoPath, stdio: "pipe" });
    } catch {}
  }

  getDiff(worktreePath: string): string {
    try {
      const staged = execSync("git diff HEAD", {
        cwd: worktreePath,
        stdio: "pipe",
      }).toString();
      const unstaged = execSync("git diff", {
        cwd: worktreePath,
        stdio: "pipe",
      }).toString();
      return (staged + "\n" + unstaged).trim();
    } catch {
      return "";
    }
  }

  getGitStatus(worktreePath: string): string {
    try {
      return execSync("git status --porcelain", {
        cwd: worktreePath,
        stdio: "pipe",
      }).toString().trim();
    } catch {
      return "";
    }
  }

  stageAll(worktreePath: string): void {
    try {
      execSync("git add -A", { cwd: worktreePath, stdio: "pipe" });
    } catch {}
  }

  runCommand(
    worktreePath: string,
    cmd: string,
    timeoutMs = 120_000
  ): { output: string; exitCode: number } {
    try {
      const output = execSync(cmd, {
        cwd: worktreePath,
        stdio: "pipe",
        timeout: timeoutMs,
      }).toString();
      return { output, exitCode: 0 };
    } catch (e: any) {
      const output =
        (e.stdout?.toString() ?? "") + "\n" + (e.stderr?.toString() ?? "");
      return { output: output.trim(), exitCode: e.status ?? 1 };
    }
  }
}
