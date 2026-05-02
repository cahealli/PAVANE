"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store";
import { api } from "@/lib/api";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { RunPanel } from "@/components/run/RunPanel";
import { Button } from "@/components/ui/Button";
import type { Card } from "@pavane/shared";

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { cards, loadCards, updateCardStatus } = useStore();

  const [project, setProject] = useState<any>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runningCard, setRunningCard] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    api.projects.get(projectId).then(setProject);
    loadCards(projectId);
  }, [projectId]);

  async function handleRunCard(card: Card) {
    setRunningCard(card.id);
    try {
      const run = await api.runs.create(card.id);
      updateCardStatus(card.id, "planning");
      setActiveRunId(run.id);
    } catch (err: any) {
      alert(`Failed to start run: ${err.message}`);
    } finally {
      setRunningCard(null);
    }
  }

  function handleCardClick(card: Card) {
    setSelectedCard(card);
  }

  return (
    <div className="min-h-screen bg-pavane-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-pavane-border px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-pavane-text-muted hover:text-pavane-text text-sm transition-colors"
        >
          ← Projects
        </button>
        <div className="w-px h-4 bg-pavane-border" />
        <div className="flex items-center gap-2">
          {project && (
            <>
              <div className="w-5 h-5 bg-pavane-accent/20 rounded flex items-center justify-center text-pavane-accent text-[10px] font-bold">
                {project.name[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-pavane-text">{project.name}</span>
              {project.isGitRepo && (
                <span className="text-[9px] text-green-400 bg-green-900/30 border border-green-900 px-1.5 py-0.5 rounded">
                  git / {project.defaultBranch}
                </span>
              )}
              {project.hasPavaneConfig && (
                <span className="text-[9px] text-indigo-400 bg-indigo-900/30 border border-indigo-900 px-1.5 py-0.5 rounded">
                  PAVANE.md
                </span>
              )}
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-pavane-text-muted">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </span>
          <Button size="sm" onClick={() => setShowAddCard(true)}>
            + New Card
          </Button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-auto p-6 transition-all ${activeRunId ? "pr-0" : ""}`}>
          <KanbanBoard
            cards={cards}
            onCardClick={handleCardClick}
            onRunCard={handleRunCard}
          />
        </div>

        {/* Run panel */}
        {activeRunId && (
          <div className="w-[480px] border-l border-pavane-border flex flex-col bg-pavane-surface shrink-0">
            <RunPanel
              runId={activeRunId}
              onClose={() => setActiveRunId(null)}
            />
          </div>
        )}
      </div>

      {/* Card detail panel */}
      {selectedCard && !activeRunId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedCard(null)}
          />
          <div className="relative z-50 bg-pavane-surface border border-pavane-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-pavane-text">{selectedCard.title}</h2>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-pavane-text-muted hover:text-pavane-text text-xl"
              >
                ×
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs text-pavane-text-muted mb-1 uppercase tracking-wider">Objective</p>
              <p className="text-sm text-pavane-text whitespace-pre-wrap bg-pavane-bg border border-pavane-border rounded-lg p-4">
                {selectedCard.objective}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-pavane-text-muted mb-4">
              <span>Status: {selectedCard.status}</span>
              <span>·</span>
              <span>Created: {new Date(selectedCard.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedCard(null)}>
                Close
              </Button>
              {(selectedCard.status === "backlog" || selectedCard.status === "ready" || selectedCard.status === "needs_fix") && (
                <Button
                  size="sm"
                  loading={runningCard === selectedCard.id}
                  onClick={async () => {
                    await handleRunCard(selectedCard);
                    setSelectedCard(null);
                  }}
                >
                  Run with Pavane
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <AddCardModal
        open={showAddCard}
        onClose={() => setShowAddCard(false)}
        projectId={projectId}
      />
    </div>
  );
}
