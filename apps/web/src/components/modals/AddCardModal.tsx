"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useStore } from "@/store";

type Props = { open: boolean; onClose: () => void; projectId: string };

export function AddCardModal({ open, onClose, projectId }: Props) {
  const { addCard } = useStore();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const card = await api.cards.create({ projectId, title, objective });
      addCard(card);
      setTitle("");
      setObjective("");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Card" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-pavane-text-muted mb-1 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add user authentication"
            required
            className="w-full bg-pavane-bg border border-pavane-border rounded px-3 py-2 text-sm text-pavane-text focus:outline-none focus:border-pavane-accent"
          />
        </div>
        <div>
          <label className="text-xs text-pavane-text-muted mb-1 block">Objective</label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Describe exactly what needs to be done. Be specific about the files, behavior, and acceptance criteria..."
            required
            rows={6}
            className="w-full bg-pavane-bg border border-pavane-border rounded px-3 py-2 text-sm text-pavane-text focus:outline-none focus:border-pavane-accent resize-none"
          />
          <p className="text-[10px] text-pavane-text-muted mt-1">
            This objective will be sent to the orchestrator. Be precise.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={loading} type="submit">
            Create Card
          </Button>
        </div>
      </form>
    </Modal>
  );
}
