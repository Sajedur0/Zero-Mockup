import { useCallback, useEffect, useRef, useState } from "react";
import { createProject, isProject, type Project } from "./model";
import { onIdle, structurallyEqual } from "./perf";
export type HistoryEntry = { project: Project; label: string };
const STORAGE = "zero-mockup-project-v1";
function initial() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (isProject(data)) return data;
  } catch {
    /* Invalid or unavailable storage should not block the editor. */
  }
  return createProject();
}

export function useProject() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    { project: initial(), label: "Project opened" },
  ]);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState("All changes saved");
  const indexRef = useRef(index),
    historyRef = useRef(history);
  indexRef.current = index;
  historyRef.current = history;
  const project = history[index].project;
  /**
   * Applying an update returns the new project. `merge` folds the change into
   * the previous history entry when it is the same kind of edit and arrives
   * right after it — a burst of arrow-key nudges should undo as one step, not
   * twenty.
   */
  const lastUpdateAt = useRef(0);
  const update = useCallback(
    (fn: (p: Project) => Project, label = "Design updated", merge = false) => {
      const old = historyRef.current[indexRef.current].project;
      // Updates are immutable (`{ ...page, objects: [...] }`), so history
      // entries share untouched branches instead of deep-cloning megabytes
      // of base64 artwork 70 times over.
      const next = fn(old);
      if (next === old || structurallyEqual(old, next)) return;
      const now = Date.now();
      const canMerge =
        merge &&
        now - lastUpdateAt.current < 600 &&
        indexRef.current === historyRef.current.length - 1 &&
        historyRef.current[indexRef.current].label === label;
      lastUpdateAt.current = now;
      const entries = (
        canMerge
          ? [
              ...historyRef.current.slice(0, indexRef.current),
              { project: next, label },
            ]
          : [
              ...historyRef.current.slice(0, indexRef.current + 1),
              { project: next, label },
            ]
      ).slice(-70);
      historyRef.current = entries;
      indexRef.current = entries.length - 1;
      setHistory(entries);
      setIndex(entries.length - 1);
    },
    [],
  );
  const undo = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const redo = useCallback(
    () => setIndex((i) => Math.min(historyRef.current.length - 1, i + 1)),
    [],
  );
  useEffect(() => {
    setSaveState("Saving…");
    const saveOnExit = () => {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(project));
      } catch {
        /* Project file export remains available when storage is full. */
      }
    };
    window.addEventListener("pagehide", saveOnExit);
    // Serialising the project blocks the main thread, so wait for a pause in
    // typing/dragging and then write while the browser is idle.
    const t = setTimeout(
      () =>
        onIdle(() => {
          try {
            localStorage.setItem(STORAGE, JSON.stringify(project));
            setSaveState("All changes saved");
          } catch {
            setSaveState("Storage full · save project file");
          }
        }),
      400,
    );
    return () => {
      clearTimeout(t);
      window.removeEventListener("pagehide", saveOnExit);
    };
  }, [project]);
  return {
    project,
    update,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    history,
    index,
    restore: setIndex,
    saveState,
  };
}
