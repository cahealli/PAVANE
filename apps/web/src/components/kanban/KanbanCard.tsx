"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@pavane/shared";
import { CARD_STATUS_COLORS, CARD_STATUS_LABELS, cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type Props = {
  card: Card;
  onClick: () => void;
  onRun: () => void;
};

export function KanbanCard({ card, onClick, onRun }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isRunning =
    card.status === "planning" ||
    card.status === "implementing" ||
    card.status === "reviewing" ||
    card.status === "verifying";

  const canRun =
    card.status === "backlog" || card.status === "ready" || card.status === "needs_fix";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-pavane-surface border border-pavane-border rounded-lg p-3 cursor-pointer group hover:border-pavane-accent/50 transition-colors",
        isDragging && "shadow-2xl border-pavane-accent/60"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={onClick}
      >
        <p className="text-[12px] font-medium text-pavane-text leading-tight line-clamp-2 mb-2">
          {card.title}
        </p>
        <p className="text-[10px] text-pavane-text-muted leading-tight line-clamp-2 mb-3">
          {card.objective}
        </p>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border",
              CARD_STATUS_COLORS[card.status]
            )}
          >
            {CARD_STATUS_LABELS[card.status]}
          </span>
          <span className="text-[9px] text-pavane-text-muted">
            {formatRelativeTime(card.updatedAt)}
          </span>
        </div>
      </div>
      {canRun && (
        <button
          onClick={(e) => { e.stopPropagation(); onRun(); }}
          className="mt-2 w-full text-[10px] text-pavane-accent hover:text-white hover:bg-pavane-accent/20 rounded px-2 py-1 transition-colors border border-transparent hover:border-pavane-accent/40 text-center"
        >
          Run with Pavane
        </button>
      )}
      {isRunning && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-[9px] text-yellow-400">Running...</span>
        </div>
      )}
    </div>
  );
}
