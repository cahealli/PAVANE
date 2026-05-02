"use client";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Card, CardStatus } from "@pavane/shared";
import { KANBAN_COLUMNS } from "@/lib/utils";
import { KanbanColumn } from "./KanbanColumn";
import { useStore } from "@/store";
import { api } from "@/lib/api";

type Props = {
  cards: Card[];
  onCardClick: (card: Card) => void;
  onRunCard: (card: Card) => void;
};

export function KanbanBoard({ cards, onCardClick, onRunCard }: Props) {
  const { updateCardStatus } = useStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const newStatus = over.id as CardStatus;

    if (KANBAN_COLUMNS.includes(newStatus)) {
      updateCardStatus(cardId, newStatus);
      api.cards.update(cardId, { status: newStatus }).catch(console.error);
    }
  }

  const byStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col] = cards.filter((c) => c.status === col);
    return acc;
  }, {} as Record<CardStatus, Card[]>);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-1">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            status={col}
            cards={byStatus[col]}
            onCardClick={onCardClick}
            onRunCard={onRunCard}
          />
        ))}
      </div>
    </DndContext>
  );
}
