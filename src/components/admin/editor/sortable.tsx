"use client";
import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export type DragHandleProps = {
  attributes: any;
  listeners: any;
};

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  strategy = "vertical",
  children,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  strategy?: "vertical" | "grid";
  children: (item: T, index: number) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={strategy === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {items.map((item, idx) => (
          <SortableItem key={item.id} id={item.id}>
            {children(item, idx)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  return <SortableRow id={id}>{children}</SortableRow>;
}

export function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <SortableHandleContext.Provider value={{ attributes, listeners }}>
        {children}
      </SortableHandleContext.Provider>
    </div>
  );
}

export const SortableHandleContext = React.createContext<DragHandleProps>({
  attributes: {},
  listeners: {},
});

export function DragHandle({ className = "" }: { className?: string }) {
  const { attributes, listeners } = React.useContext(SortableHandleContext);
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      title="Tahan untuk menyusun ulang"
      className={`cursor-grab active:cursor-grabbing touch-none p-1.5 rounded-md text-muted-foreground hover:bg-secondary/40 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );
}
