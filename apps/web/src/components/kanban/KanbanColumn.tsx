"use client";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, CardStatus } from "@pavane/shared";
import { CARD_STATUS_LABELS, CARD_STATUS_COLORS } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";

type Props = {
  status: CardStatus;
  cards: Card[];
  onCardClick: (card: Card) => void;
  onRunCard: (card: Card) => void;
};

export function KanbanColumn({ status, cards, onCardClick, onRunCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex flex-col gap-0 min-w-[220px] max-w-[220px] ${isOver ? "opacity-80" : ""}`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded border ${CARD_STATUS_COLORS[status]}`}
        >
          {CARD_STATUS_LABELS[status]}
        </span>
        <span className="text-[10px] text-pavane-text-muted bg-pavane-muted rounded-full px-1.5 py-0.5">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="kanban-col flex flex-col gap-2 bg-pavane-surface/40 border border-pavane-border rounded-lg p-2"
        style={{ minHeight: 120 }}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onRun={() => onRunCard(card)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-12 text-[11px] text-pavane-text-muted select-none">
            vazio
          </div>
        )}
      </div>
    </div>
  );
}
