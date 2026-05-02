import { create } from "zustand";
import type { Project, Card } from "@pavane/shared";
import { api } from "@/lib/api";

type Store = {
  projects: (Project & { isGitRepo: boolean; hasPavaneConfig: boolean })[];
  cards: Card[];
  activeProjectId: string | null;

  loadProjects: () => Promise<void>;
  loadCards: (projectId: string) => Promise<void>;
  setActiveProject: (id: string) => void;
  updateCardStatus: (cardId: string, status: Card["status"]) => void;
  addCard: (card: Card) => void;
  removeCard: (cardId: string) => void;
};

export const useStore = create<Store>((set, get) => ({
  projects: [],
  cards: [],
  activeProjectId: null,

  loadProjects: async () => {
    const projects = await api.projects.list();
    set({ projects });
  },

  loadCards: async (projectId: string) => {
    const cards = await api.cards.list(projectId);
    set({ cards, activeProjectId: projectId });
  },

  setActiveProject: (id: string) => set({ activeProjectId: id }),

  updateCardStatus: (cardId: string, status: Card["status"]) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, status, updatedAt: new Date().toISOString() } : c
      ),
    }));
  },

  addCard: (card: Card) => {
    set((state) => ({ cards: [...state.cards, card] }));
  },

  removeCard: (cardId: string) => {
    set((state) => ({ cards: state.cards.filter((c) => c.id !== cardId) }));
  },
}));
