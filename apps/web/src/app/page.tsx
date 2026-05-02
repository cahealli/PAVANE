"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { AddProjectModal } from "@/components/modals/AddProjectModal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { Project } from "@pavane/shared";

type ProjectWithMeta = Project & { isGitRepo: boolean; hasPavaneConfig: boolean };

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loadProjects } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? Cards and runs will also be deleted.")) return;
    setDeleting(id);
    await api.projects.delete(id).catch(console.error);
    await loadProjects();
    setDeleting(null);
  }

  return (
    <div className="min-h-screen bg-pavane-bg">
      {/* Navbar */}
      <header className="border-b border-pavane-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-pavane-accent rounded-sm flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <span className="text-sm font-semibold text-pavane-text tracking-wide">Pavane</span>
          <span className="text-[10px] text-pavane-text-muted bg-pavane-muted px-2 py-0.5 rounded">
            mvp 0.1
          </span>
        </div>
        <div className="text-[10px] text-pavane-text-muted">
          Codex thinks. DeepSeek builds. Pavane verifies. Human approves.
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-pavane-text mb-1">Projects</h1>
            <p className="text-sm text-pavane-text-muted">
              Each project is a local git repository managed by Pavane.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)}>+ Add Project</Button>
        </div>

        {projects.length === 0 && (
          <div className="border border-dashed border-pavane-border rounded-xl p-16 text-center">
            <div className="text-4xl mb-4">🎼</div>
            <h2 className="text-lg font-medium text-pavane-text mb-2">No projects yet</h2>
            <p className="text-sm text-pavane-text-muted mb-6">
              Add a local git repository to start orchestrating with Pavane.
            </p>
            <Button onClick={() => setShowAdd(true)}>Add your first project</Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as ProjectWithMeta[]).map((p) => (
            <div
              key={p.id}
              className="bg-pavane-surface border border-pavane-border rounded-xl p-5 hover:border-pavane-accent/50 transition-colors cursor-pointer group"
              onClick={() => router.push(`/board/${p.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-pavane-accent/20 rounded-lg flex items-center justify-center text-pavane-accent font-bold text-sm">
                  {p.name[0]?.toUpperCase()}
                </div>
                <div className="flex gap-1">
                  {p.isGitRepo ? (
                    <span className="text-[9px] text-green-400 bg-green-900/30 border border-green-900 px-1.5 py-0.5 rounded">
                      git
                    </span>
                  ) : (
                    <span className="text-[9px] text-red-400 bg-red-900/30 border border-red-900 px-1.5 py-0.5 rounded">
                      no git
                    </span>
                  )}
                  {p.hasPavaneConfig && (
                    <span className="text-[9px] text-indigo-400 bg-indigo-900/30 border border-indigo-900 px-1.5 py-0.5 rounded">
                      PAVANE.md
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-pavane-text mb-1 group-hover:text-pavane-accent transition-colors">
                {p.name}
              </h3>
              <p className="text-[10px] text-pavane-text-muted font-mono truncate mb-3">
                {p.repoPath}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-pavane-text-muted">
                  branch: {p.defaultBranch}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
                  disabled={deleting === p.id}
                  className="text-[10px] text-pavane-text-muted hover:text-red-400 transition-colors"
                >
                  {deleting === p.id ? "..." : "delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <AddProjectModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
