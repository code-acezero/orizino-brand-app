"use client";
import { useState, useCallback, DragEvent } from "react";

export function useDragReorder<T>(items: T[], onReorder: (items: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = useCallback((e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const onDragEnd = useCallback((e: DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const onDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  }, []);

  const onDrop = useCallback((e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIndex) || fromIndex === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorder(reordered);
    setDragIndex(null);
    setOverIndex(null);
  }, [items, onReorder, dragIndex]);

  const getDragProps = useCallback((index: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => onDragStart(e as any, index),
    onDragEnd: (e: DragEvent<HTMLElement>) => onDragEnd(e as any),
    onDragOver: (e: DragEvent<HTMLElement>) => onDragOver(e as any, index),
    onDrop: (e: DragEvent<HTMLElement>) => onDrop(e as any, index),
  }), [onDragStart, onDragEnd, onDragOver, onDrop]);

  return { dragIndex, overIndex, getDragProps };
}
