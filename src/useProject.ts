import { useCallback, useEffect, useRef, useState } from "react";
import { createProject, isProject, type Project } from "./model";
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
  const update = useCallback(
    (fn: (p: Project) => Project, label = "Design updated") => {
      const old = historyRef.current[indexRef.current].project;
      const next = fn(structuredClone(old));
      if (JSON.stringify(old) === JSON.stringify(next)) return;
      const entries = [
        ...historyRef.current.slice(0, indexRef.current + 1),
        { project: next, label },
      ].slice(-70);
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
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(project));
        setSaveState("All changes saved");
      } catch {
        setSaveState("Storage full · save project file");
      }
    }, 600);
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
