"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useStore } from "@/store";

type Props = { open: boolean; onClose: () => void };

export function AddProjectModal({ open, onClose }: Props) {
  const { loadProjects } = useStore();
  const [name, setName] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.projects.create({ name, repoPath, defaultBranch: branch });
      await loadProjects();
      setName("");
      setRepoPath("");
      setBranch("main");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Projeto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-pavane-text-muted mb-1 block">Nome do Projeto</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meu App"
            required
            className="w-full bg-pavane-bg border border-pavane-border rounded px-3 py-2 text-sm text-pavane-text focus:outline-none focus:border-pavane-accent"
          />
        </div>
        <div>
          <label className="text-xs text-pavane-text-muted mb-1 block">Caminho do Repositório</label>
          <input
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="C:\Users\voce\projetos\meuapp"
            required
            className="w-full bg-pavane-bg border border-pavane-border rounded px-3 py-2 text-sm text-pavane-text focus:outline-none focus:border-pavane-accent font-mono"
          />
          <p className="text-[10px] text-pavane-text-muted mt-1">Caminho absoluto para o repositório git local</p>
        </div>
        <div>
          <label className="text-xs text-pavane-text-muted mb-1 block">Branch Padrão</label>
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            className="w-full bg-pavane-bg border border-pavane-border rounded px-3 py-2 text-sm text-pavane-text focus:outline-none focus:border-pavane-accent"
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={loading} type="submit">
            Adicionar Projeto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
