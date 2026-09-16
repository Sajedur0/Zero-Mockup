import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Copy,
  Download,
  Eye,
  FileJson,
  FilePlus2,
  FolderOpen,
  Grid2X2,
  Hand,
  History,
  Image,
  Keyboard,
  Layers,
  LayoutTemplate,
  LockKeyhole,
  Maximize,
  Minus,
  Moon,
  MoreHorizontal,
  MousePointer2,
  Palette,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Redo2,
  Save,
  Settings2,
  Shapes,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import Konva from "konva";
import JSZip from "jszip";
import {
  baseObject,
  createProject,
  defaultBackground,
  download,
  duplicatePage,
  isProject,
  makePage,
  uid,
  type DesignObject,
  type Page,
  type Project,
} from "./model";
import { useProject } from "./useProject";
import Artboard from "./Artboard";
import Inspector from "./Inspector";
import Library, { type Tool } from "./Library";
import { IconButton, Modal } from "./ui";

const tools: { id: Tool; label: string; icon: typeof LayoutTemplate }[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "frames", label: "Frames", icon: Smartphone },
  { id: "text", label: "Text", icon: Type },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "brand", label: "Brand kit", icon: Palette },
];
const noop = () => {};
export default function App() {
  const {
    project,
    update,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    index: historyIndex,
    restore,
    saveState,
  } = useProject();
  const [activeId, setActiveId] = useState(project.pages[0].id);
  const page = project.pages.find((p) => p.id === activeId) || project.pages[0];
  const [selected, setSelected] = useState<string[]>([]);
  const selectedObjects = page.objects.filter((o) => selected.includes(o.id));
  const [tool, setTool] = useState<Tool>("templates");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"tools" | "properties" | null>(
    null,
  );
  const [zoom, setZoom] = useState<number | null>(null);
  const [fit, setFit] = useState(0.22);
  const scale = zoom ?? fit;
  const [grid, setGrid] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("zero-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<
    "export" | "preview" | "shortcuts" | "new" | null
  >(null);
  const [fileMenu, setFileMenu] = useState(false);
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [pageMenu, setPageMenu] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportScope, setExportScope] = useState("all");
  const [transparent, setTransparent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [assets, setAssets] = useState<string[]>(() => [
    ...new Set(
      project.pages.flatMap((p) =>
        [p.background.src, ...p.objects.map((o) => o.src)].filter(
          (s): s is string => !!s,
        ),
      ),
    ),
  ]);
  const [dragOver, setDragOver] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const panelResize = useRef<{ x: number; width: number } | null>(null);
  const uploadTarget = useRef<"screenshot" | "background" | "image">("image");
  const stages = useRef<Map<string, Konva.Stage>>(new Map());
  const clipboard = useRef<DesignObject[]>([]);
  const gesture = useRef<{
    distance: number;
    scale: number;
    x: number;
    y: number;
    scrollX: number;
    scrollY: number;
  } | null>(null);
  const mousePan = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3400);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("zero-theme", dark ? "dark" : "light");
    } catch {
      /* The editor also works when browser storage is disabled. */
    }
  }, [dark]);
  useEffect(() => {
    if (!project.pages.some((p) => p.id === activeId))
      setActiveId(project.pages[0].id);
    setSelected((ids) =>
      ids.filter((id) => page.objects.some((o) => o.id === id)),
    );
  }, [project.pages, activeId, page.objects]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      const isSmall = window.innerWidth < 1024;
      const visible = isSmall ? 1 : Math.min(project.pages.length, 3);
      const p = project.pages[0];
      const s = Math.min(
        (width - (isSmall ? 48 : 80) - (visible - 1) * 24) /
          (visible * p.width),
        (height - 112) / p.height,
        0.32,
      );
      setFit(Math.max(0.07, s));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [project.pages.length, page.width, page.height, leftOpen, rightOpen]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((s) =>
          Math.min(
            1,
            Math.max(0.05, (s ?? fit) * (e.deltaY > 0 ? 0.94 : 1.06)),
          ),
        );
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [fit]);
  const register = useCallback((id: string, stage: Konva.Stage | null) => {
    if (stage) stages.current.set(id, stage);
    else stages.current.delete(id);
  }, []);
  const patchPage = useCallback(
    (patch: Partial<Page>, label = "Page updated") =>
      update(
        (p) => ({
          ...p,
          pages: p.pages.map((item) =>
            item.id === page.id ? { ...item, ...patch } : item,
          ),
        }),
        label,
      ),
    [update, page.id],
  );
  const patchObjects = useCallback(
    (patch: Partial<DesignObject>, label = "Object updated") =>
      patchPage(
        {
          objects: page.objects.map((o) =>
            selected.includes(o.id) ? { ...o, ...patch } : o,
          ),
        },
        label,
      ),
    [page.objects, selected, patchPage],
  );
  const selectPage = (id: string) => {
    setActiveId(id);
    setSelected([]);
  };
  const addObject = useCallback(
    (o: DesignObject) => {
      const object = {
        ...o,
        x: Math.min(o.x, page.width * 0.2),
        y: Math.min(o.y, page.height * 0.35),
      };
      patchPage({ objects: [...page.objects, object] }, "Added " + o.name);
      setSelected([o.id]);
      if (window.innerWidth < 1024) setMobilePanel(null);
    },
    [patchPage, page],
  );
  const remove = useCallback(() => {
    const removable = selectedObjects.filter((o) => !o.locked).map((o) => o.id);
    if (!removable.length) {
      notify("Unlock the layer before deleting it.");
      return;
    }
    patchPage(
      { objects: page.objects.filter((o) => !removable.includes(o.id)) },
      "Objects deleted",
    );
    setSelected([]);
  }, [selectedObjects, page, patchPage, notify]);
  const duplicate = useCallback(() => {
    const groupMap = new Map<string, string>();
    const copies = selectedObjects.map((o) => {
      if (o.groupId && !groupMap.has(o.groupId)) groupMap.set(o.groupId, uid());
      return {
        ...structuredClone(o),
        id: uid(),
        x: o.x + 35,
        y: o.y + 35,
        name: o.name + " copy",
        locked: false,
        groupId: o.groupId ? groupMap.get(o.groupId) : undefined,
      };
    });
    if (!copies.length) return;
    patchPage({ objects: [...page.objects, ...copies] }, "Objects duplicated");
    setSelected(copies.map((o) => o.id));
  }, [selectedObjects, page, patchPage]);
  const order = (where: string) => {
    let objects = [...page.objects];
    const picked = objects.filter((o) => selected.includes(o.id));
    if (where === "front")
      objects = [...objects.filter((o) => !selected.includes(o.id)), ...picked];
    else if (where === "back")
      objects = [...picked, ...objects.filter((o) => !selected.includes(o.id))];
    else if (where === "forward") {
      for (let i = objects.length - 2; i >= 0; i--)
        if (
          selected.includes(objects[i].id) &&
          !selected.includes(objects[i + 1].id)
        )
          [objects[i], objects[i + 1]] = [objects[i + 1], objects[i]];
    } else {
      for (let i = 1; i < objects.length; i++)
        if (
          selected.includes(objects[i].id) &&
          !selected.includes(objects[i - 1].id)
        )
          [objects[i], objects[i - 1]] = [objects[i - 1], objects[i]];
    }
    patchPage({ objects }, "Layer order changed");
  };
  const group = () => {
    if (selected.length > 1) {
      patchObjects({ groupId: uid() }, "Objects grouped");
      notify("Objects grouped. Select any member to move them together.");
    }
  };
  const ungroup = () =>
    patchObjects({ groupId: undefined }, "Objects ungrouped");
  const align = (axis: string) => {
    const objects = structuredClone(page.objects);
    const picked = objects.filter((o) => selected.includes(o.id) && !o.locked);
    if (axis === "horizontal" || axis === "vertical") {
      if (picked.length < 3) {
        notify("Select at least 3 objects to distribute.");
        return;
      }
      const key = axis === "horizontal" ? "x" : "y";
      const dim = axis === "horizontal" ? "width" : "height";
      picked.sort((a, b) => a[key] - b[key]);
      const start = picked[0][key],
        end = picked[picked.length - 1][key] + picked[picked.length - 1][dim];
      const gap =
        (end - start - picked.reduce((s, o) => s + o[dim], 0)) /
        (picked.length - 1);
      let cursor = start;
      picked.forEach((o) => {
        o[key] = cursor;
        cursor += o[dim] + gap;
      });
    } else
      picked.forEach((o) => {
        if (axis === "left") o.x = 0;
        if (axis === "center") o.x = (page.width - o.width) / 2;
        if (axis === "right") o.x = page.width - o.width;
        if (axis === "top") o.y = 0;
        if (axis === "middle") o.y = (page.height - o.height) / 2;
        if (axis === "bottom") o.y = page.height - o.height;
      });
    patchPage({ objects }, "Objects aligned");
  };
  const addPage = () => {
    if (project.pages.length >= 30) {
      notify("A project can contain up to 30 pages.");
      return;
    }
    const next: Page = {
      id: uid(),
      name: `Untitled page ${project.pages.length + 1}`,
      width: page.width,
      height: page.height,
      background: defaultBackground("#f1f1ef"),
      objects: [],
    };
    update((p) => ({ ...p, pages: [...p.pages, next] }), "Page added");
    selectPage(next.id);
    notify("A fresh page. Make it yours.");
  };
  const copyPage = (id: string) => {
    if (project.pages.length >= 30) {
      notify("A project can contain up to 30 pages.");
      return;
    }
    const original = project.pages.find((p) => p.id === id);
    if (!original) return;
    const copy = duplicatePage(original);
    update(
      (p) => ({
        ...p,
        pages: p.pages.flatMap((item) =>
          item.id === id ? [item, copy] : [item],
        ),
      }),
      "Page duplicated",
    );
    selectPage(copy.id);
    setPageMenu(null);
  };
  const deletePage = (id: string) => {
    if (project.pages.length === 1) {
      notify("Keep at least one page in your project.");
      return;
    }
    update(
      (p) => ({ ...p, pages: p.pages.filter((p) => p.id !== id) }),
      "Page deleted",
    );
    setPageMenu(null);
    setSelected([]);
  };
  const applyTemplate = (i: number) => {
    const fresh = makePage(i, 0);
    const existing = page.objects.find((o) => o.kind === "device" && o.src);
    if (existing)
      fresh.objects = fresh.objects.map((o) =>
        o.kind === "device" ? { ...o, src: existing.src } : o,
      );
    patchPage({ ...fresh, id: page.id }, "Template applied");
    setSelected([]);
    notify("Template applied. Every detail is yours to edit.");
    setMobilePanel(null);
  };
  const upload = (target: "screenshot" | "background" | "image") => {
    uploadTarget.current = target;
    fileInput.current?.click();
  };
  const processFile = async (file: File, target = uploadTarget.current) => {
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
        "image/gif",
      ].includes(file.type)
    ) {
      notify("Choose a PNG, JPG, WebP, GIF or SVG image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      notify("Please choose an image smaller than 15 MB.");
      return;
    }
    try {
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });
      setAssets((a) => [...new Set([src, ...a])]);
      if (target === "background")
        patchPage(
          { background: { ...page.background, type: "image", src } },
          "Background uploaded",
        );
      else if (target === "screenshot") {
        const frame =
          selectedObjects.find((o) => o.kind === "device") ||
          page.objects.find((o) => o.kind === "device");
        if (frame) {
          patchPage(
            {
              objects: page.objects.map((o) =>
                o.id === frame.id ? { ...o, src } : o,
              ),
            },
            "Screenshot uploaded",
          );
          setSelected([frame.id]);
        } else
          addObject(
            baseObject("device", {
              name: file.name,
              src,
              frame: "android",
              width: 720,
              height: 1480,
              x: 180,
              y: 600,
              radius: 85,
              shadow: 40,
              fill: "#252b27",
            }),
          );
      } else {
        const w = Math.min(image.width, page.width * 0.75);
        addObject(
          baseObject("image", {
            name: file.name,
            src,
            width: w,
            height: (w * image.height) / image.width,
          }),
        );
      }
      notify("Image uploaded. Looking good!");
    } catch {
      notify("This image could not be opened. Try another file.");
    }
  };
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) void processFile(e.target.files[0]);
    e.target.value = "";
  };
  const saveProject = () => {
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      project.name + ".zero.json",
    );
    setFileMenu(false);
    notify("Editable project downloaded.");
  };
  const loadProject = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 80 * 1024 * 1024) throw Error();
      const data = JSON.parse(await file.text());
      if (!isProject(data)) throw Error();
      update(() => data, "Project imported");
      setAssets([
        ...new Set(
          data.pages.flatMap((p) =>
            [p.background.src, ...p.objects.map((o) => o.src)].filter(
              (s): s is string => !!s,
            ),
          ),
        ),
      ]);
      selectPage(data.pages[0].id);
      notify("Project opened. Welcome back.");
    } catch {
      notify("That isn’t a valid Zero Mockup project file.");
    }
    e.target.value = "";
    setFileMenu(false);
  };
  const exportProject = async () => {
    setExporting(true);
    const pages = exportScope === "all" ? project.pages : [page];
    try {
      await document.fonts.ready;
      const zip = new JSZip();
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        setExportProgress(`Rendering page ${i + 1} of ${pages.length}…`);
        const stage = stages.current.get(p.id);
        if (!stage) throw Error("Page is not ready");
        const overlay = stage.findOne(".editor-overlay");
        const background = stage.findOne(".page-background");
        overlay?.hide();
        if (transparent && exportFormat === "png") background?.hide();
        let url = "";
        try {
          stage.draw();
          await new Promise(requestAnimationFrame);
          url = stage.toDataURL({
            mimeType: exportFormat === "png" ? "image/png" : "image/jpeg",
            quality: 1,
            pixelRatio: 1 / stage.scaleX(),
          });
        } finally {
          overlay?.show();
          background?.show();
          stage.draw();
        }
        const filename = `${String(i + 1).padStart(2, "0")}-${p.name.replace(/[^\p{L}\p{N} -]/gu, "")}.${exportFormat === "png" ? "png" : "jpg"}`;
        if (pages.length === 1) download(url, filename);
        else zip.file(filename, url.split(",")[1], { base64: true });
      }
      if (pages.length > 1) {
        setExportProgress("Packaging your screenshots…");
        download(
          await zip.generateAsync({ type: "blob" }),
          project.name + " — screenshots.zip",
        );
      }
      setModal(null);
      notify(
        `${pages.length === 1 ? "Screenshot" : pages.length + " screenshots"} exported at full resolution.`,
      );
    } catch (error) {
      console.error(error);
      notify("Export failed. Try a smaller canvas or reload your image.");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") target.blur();
        return;
      }
      if (modal) {
        if (e.key === "Escape" && !exporting) setModal(null);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape") {
        setSelected([]);
        setModal(null);
        setContext(null);
        setFileMenu(false);
        setMobilePanel(null);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selected.length) {
          e.preventDefault();
          remove();
        }
      } else if (mod && e.key.toLowerCase() === "c") {
        clipboard.current = structuredClone(selectedObjects);
        if (selected.length) notify("Copied to your project clipboard.");
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const copies = clipboard.current.map((o) => ({
          ...o,
          id: uid(),
          x: o.x + 40,
          y: o.y + 40,
          locked: false,
          groupId: undefined,
        }));
        if (copies.length) {
          patchPage(
            { objects: [...page.objects, ...copies] },
            "Objects pasted",
          );
          setSelected(copies.map((o) => o.id));
        }
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProject();
      } else if (mod && ["+", "=", "-", "0"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "0") setZoom(null);
        else
          setZoom((s) =>
            Math.min(
              1,
              Math.max(0.05, (s ?? fit) + (e.key === "-" ? -0.05 : 0.05)),
            ),
          );
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(
          page.objects.filter((o) => !o.locked && o.visible).map((o) => o.id),
        );
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTool("templates");
        setLeftOpen(true);
        setMobilePanel("tools");
        setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>(
                '[aria-label="Search templates"]',
              )
              ?.focus(),
          50,
        );
      } else if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        e.shiftKey ? ungroup() : group();
      } else if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        selected.length
      ) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        patchPage(
          {
            objects: page.objects.map((o) =>
              selected.includes(o.id) && !o.locked
                ? {
                    ...o,
                    x:
                      o.x +
                      (e.key === "ArrowLeft"
                        ? -d
                        : e.key === "ArrowRight"
                          ? d
                          : 0),
                    y:
                      o.y +
                      (e.key === "ArrowUp"
                        ? -d
                        : e.key === "ArrowDown"
                          ? d
                          : 0),
                  }
                : o,
            ),
          },
          "Objects nudged",
        );
      } else if (e.key === "?") setModal("shortcuts");
      else if (e.key.toLowerCase() === "v") setPanMode(false);
      else if (e.key.toLowerCase() === "h") setPanMode(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    const close = () => {
      setContext(null);
      setPageMenu(null);
      setFileMenu(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  const openTool = (id: Tool) => {
    setTool(id);
    setLeftOpen(true);
    setMobilePanel((p) => (p === "tools" && tool === id ? null : "tools"));
  };
  const showProperties = () => {
    setRightOpen(true);
    setMobilePanel("properties");
  };
  const leftProps = {
    tool,
    project,
    page,
    selected,
    select: setSelected,
    apply: applyTemplate,
    add: addObject,
    upload,
    patch: (id: string, p: Partial<DesignObject>) =>
      patchPage(
        {
          objects: page.objects.map((o) => (o.id === id ? { ...o, ...p } : o)),
        },
        "Layer updated",
      ),
    updateBrand: (brand: Project["brand"]) =>
      update((p) => ({ ...p, brand }), "Brand kit updated"),
    history,
    historyIndex,
    restore,
    close: () => {
      setLeftOpen(false);
      setMobilePanel(null);
    },
    assets,
  };
  const rightProps = {
    page,
    selected: selectedObjects,
    patchPage,
    patchObjects,
    upload,
    remove,
    duplicate,
    align,
    order,
    group,
    ungroup,
    close: () => {
      setRightOpen(false);
      setMobilePanel(null);
    },
  };
  return (
    <div
      className={`app ${dark ? "dark" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file)
          void processFile(
            file,
            selectedObjects.some((o) => o.kind === "device")
              ? "screenshot"
              : "image",
          );
      }}
    >
      <header className="app-header">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setFileMenu(!fileMenu);
            e.stopPropagation();
          }}
        >
          <span className="brand-mark">
            z<span>•</span>
          </span>
          <span>
            zero<span className="brand-divider">/</span>
            <span className="brand-product">mockup</span>
          </span>
        </a>
        <div className="header-divider" />
        <div className="project-control">
          <input
            aria-label="Project name"
            value={project.name}
            onChange={(e) =>
              update((p) => ({ ...p, name: e.target.value }), "Project renamed")
            }
          />
          <button
            aria-label="Project menu"
            onClick={(e) => {
              e.stopPropagation();
              setFileMenu(!fileMenu);
            }}
          >
            <ChevronDown size={15} />
          </button>
        </div>
        <div className="saved-state" title={saveState}>
          <CloudUpload size={16} />
          <span>{saveState}</span>
        </div>
        <div className="header-actions">
          <span className="local-badge">
            <span className="green-dot" />
            100% local. 100% yours.
          </span>
          <IconButton
            label="Preview design"
            onClick={() => setModal("preview")}
          >
            <Eye size={18} />
          </IconButton>
          <button
            className="primary export-button"
            onClick={() => setModal("export")}
          >
            <Download size={16} />
            <span>Export</span>
            <ChevronDown size={14} />
          </button>
          <button
            className="avatar"
            title="This is your private local workspace"
            onClick={() => notify("Your private workspace. No account needed.")}
          >
            S
          </button>
        </div>
        {fileMenu && (
          <div
            className="dropdown file-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="dropdown-label">YOUR WORKSPACE</span>
            <button
              onClick={() => {
                setModal("new");
                setFileMenu(false);
              }}
            >
              <FilePlus2 size={16} />
              New project
            </button>
            <button onClick={() => projectInput.current?.click()}>
              <FolderOpen size={16} />
              Open project<span>JSON</span>
            </button>
            <button onClick={saveProject}>
              <Save size={16} />
              Save project<span>⌘ S</span>
            </button>
            <hr />
            <button
              onClick={() => {
                setModal("preview");
                setFileMenu(false);
              }}
            >
              <Eye size={16} />
              Preview design
            </button>
            <button
              onClick={() => {
                setDark(!dark);
                setFileMenu(false);
              }}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}Switch to{" "}
              {dark ? "light" : "dark"} theme
            </button>
            <button
              onClick={() => {
                setModal("shortcuts");
                setFileMenu(false);
              }}
            >
              <Keyboard size={16} />
              Keyboard shortcuts
            </button>
          </div>
        )}
      </header>
      <div className="workspace-toolbar">
        <div className="workspace-location">
          <span className="workspace-dot" />
          <span>Workspace</span>
          <ChevronRight size={12} />
          <strong>Screenshot studio</strong>
          <span className="beta-label">BETA</span>
        </div>
        <div className="toolbar-center">
          <div className="undo-tools">
            <IconButton
              label="Undo (Ctrl+Z)"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 size={17} />
            </IconButton>
            <IconButton
              label="Redo (Ctrl+Y)"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 size={17} />
            </IconButton>
          </div>
          <span className="toolbar-divider" />
          <IconButton
            label="Select tool (V)"
            active={!panMode}
            onClick={() => setPanMode(false)}
          >
            <MousePointer2 size={17} />
          </IconButton>
          <IconButton
            label="Pan tool (H)"
            active={panMode}
            onClick={() => setPanMode(true)}
          >
            <Hand size={17} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton
            label="Toggle multi-select mode"
            active={selectMode}
            onClick={() => setSelectMode(!selectMode)}
          >
            <Copy size={16} />
          </IconButton>
        </div>
        <div className="toolbar-right">
          <IconButton
            label="Toggle tools panel"
            onClick={() => {
              setLeftOpen(!leftOpen);
              setMobilePanel((m) => (m === "tools" ? null : "tools"));
            }}
          >
            <PanelLeftClose size={17} />
          </IconButton>
          <IconButton
            label="Toggle properties panel"
            onClick={() => {
              setRightOpen(!rightOpen);
              setMobilePanel((m) => (m === "properties" ? null : "properties"));
            }}
          >
            <PanelRightClose size={17} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton
            label="Keyboard shortcuts"
            onClick={() => setModal("shortcuts")}
          >
            <CircleHelp size={17} />
          </IconButton>
        </div>
      </div>
      <div className="editor-layout">
        <nav className="tool-rail" aria-label="Design tools">
          <div className="rail-main">
            {tools.map(({ id, label, icon: I }) => (
              <button
                key={id}
                className={
                  tool === id && leftOpen ? "rail-tool active" : "rail-tool"
                }
                onClick={() => openTool(id)}
              >
                <I size={21} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="rail-bottom">
            <button
              className={`rail-tool ${tool === "layers" && leftOpen ? "active" : ""}`}
              onClick={() => openTool("layers")}
            >
              <Layers size={21} strokeWidth={1.6} />
              <span>Layers</span>
            </button>
            <IconButton
              label="Version history"
              onClick={() => openTool("history")}
              active={tool === "history"}
            >
              <History size={19} />
            </IconButton>
            <IconButton
              label={dark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </IconButton>
          </div>
        </nav>
        <div
          className={`left-panel-wrap ${!leftOpen ? "collapsed" : ""} ${mobilePanel === "tools" ? "mobile-open" : ""}`}
        >
          <nav className="mobile-tool-tabs" aria-label="Tool categories">
            {[
              ...tools,
              { id: "history" as Tool, label: "History", icon: History },
            ].map(({ id, label, icon: I }) => (
              <button
                key={id}
                className={tool === id ? "active" : ""}
                onClick={() => setTool(id)}
              >
                <I size={16} />
                {label}
              </button>
            ))}
          </nav>
          <Library {...leftProps} />
        </div>
        <main className="canvas-workspace">
          <div className="canvas-heading">
            <div>
              <h1>
                Your canvas
                <span className="page-count">{project.pages.length} pages</span>
              </h1>
              <p>A small space for a big first impression.</p>
            </div>
            <div className="canvas-heading-actions">
              <button
                className="subtle-button"
                onClick={() => setGrid(!grid)}
                title="Toggle canvas grid"
              >
                <Grid2X2 size={15} />
                <span>{grid ? "Hide grid" : "Show grid"}</span>
              </button>
              <button
                className="secondary small add-page-top"
                onClick={addPage}
              >
                <Plus size={14} />
                Add page
              </button>
            </div>
          </div>
          <div
            className={`canvas-viewport ${panMode ? "pan-mode" : ""}`}
            ref={viewport}
            onPointerDown={(e) => {
              if (panMode && e.pointerType === "mouse" && viewport.current) {
                mousePan.current = {
                  x: e.clientX,
                  y: e.clientY,
                  left: viewport.current.scrollLeft,
                  top: viewport.current.scrollTop,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }}
            onPointerMove={(e) => {
              if (mousePan.current && viewport.current) {
                viewport.current.scrollLeft =
                  mousePan.current.left - (e.clientX - mousePan.current.x);
                viewport.current.scrollTop =
                  mousePan.current.top - (e.clientY - mousePan.current.y);
              }
            }}
            onPointerUp={() => (mousePan.current = null)}
            onTouchStart={(e) => {
              if (e.touches.length === 2 && viewport.current) {
                const [a, b] = Array.from(e.touches);
                gesture.current = {
                  distance: Math.hypot(
                    a.clientX - b.clientX,
                    a.clientY - b.clientY,
                  ),
                  scale,
                  x: (a.clientX + b.clientX) / 2,
                  y: (a.clientY + b.clientY) / 2,
                  scrollX: viewport.current.scrollLeft,
                  scrollY: viewport.current.scrollTop,
                };
              }
            }}
            onTouchMove={(e) => {
              if (
                e.touches.length === 2 &&
                gesture.current &&
                viewport.current
              ) {
                const [a, b] = Array.from(e.touches);
                const g = gesture.current;
                setZoom(
                  Math.min(
                    1,
                    Math.max(
                      0.05,
                      (g.scale *
                        Math.hypot(
                          a.clientX - b.clientX,
                          a.clientY - b.clientY,
                        )) /
                        g.distance,
                    ),
                  ),
                );
                viewport.current.scrollLeft =
                  g.scrollX - ((a.clientX + b.clientX) / 2 - g.x);
                viewport.current.scrollTop =
                  g.scrollY - ((a.clientY + b.clientY) / 2 - g.y);
              }
            }}
            onTouchEnd={() => (gesture.current = null)}
          >
            <div
              className="artboards"
              style={{
                minWidth:
                  window.innerWidth >= 1024
                    ? project.pages.reduce(
                        (w, p) => w + p.width * scale + 24,
                        64,
                      )
                    : undefined,
              }}
            >
              {project.pages.map((p, i) => (
                <div
                  className={`artboard-item ${p.id === page.id ? "is-active" : ""}`}
                  key={p.id}
                  style={{ width: p.width * scale }}
                >
                  <div className="artboard-label">
                    <button onClick={() => selectPage(p.id)}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <strong>{p.name}</strong>
                    </button>
                    <div className="artboard-menu-wrap">
                      <button
                        aria-label={"Page " + (i + 1) + " options"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPageMenu(pageMenu === p.id ? null : p.id);
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {pageMenu === p.id && (
                        <div
                          className="dropdown page-dropdown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => copyPage(p.id)}>
                            <Copy size={14} />
                            Duplicate page
                          </button>
                          <button
                            onClick={() => {
                              selectPage(p.id);
                              setPageMenu(null);
                              showProperties();
                            }}
                          >
                            <Settings2 size={14} />
                            Page settings
                          </button>
                          <button
                            className="danger"
                            onClick={() => deletePage(p.id)}
                          >
                            <Trash2 size={14} />
                            Delete page
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`artboard-canvas ${p.id === page.id ? "active" : ""}`}
                    onClick={() => setActiveId(p.id)}
                  >
                    <Artboard
                      page={p}
                      scale={scale}
                      active={p.id === page.id}
                      selected={selected}
                      onSelect={(ids) => {
                        setSelected(ids);
                      }}
                      onChange={(objects) =>
                        update(
                          (pr) => ({
                            ...pr,
                            pages: pr.pages.map((item) =>
                              item.id === p.id ? { ...item, objects } : item,
                            ),
                          }),
                          "Canvas edited",
                        )
                      }
                      onActivate={() => setActiveId(p.id)}
                      onEditText={(id) => {
                        setSelected([id]);
                        showProperties();
                        setTimeout(
                          () =>
                            document
                              .querySelector<HTMLTextAreaElement>(
                                '[aria-label="Text content"]',
                              )
                              ?.focus(),
                          50,
                        );
                      }}
                      onContext={(pos) => setContext(pos)}
                      register={register}
                      grid={grid}
                      selectMode={selectMode}
                      panMode={panMode}
                    />
                  </div>
                  <div className="artboard-caption">
                    <span>
                      {p.width} × {p.height}
                    </span>
                    <span>
                      {p.id === page.id ? (
                        <>
                          <span className="green-dot" />
                          Editing
                        </>
                      ) : (
                        "Phone screenshot"
                      )}
                    </span>
                  </div>
                </div>
              ))}
              <button
                className="add-artboard"
                onClick={addPage}
                title="Add a blank page"
              >
                <Plus size={23} />
              </button>
            </div>
          </div>
          <div className="canvas-bottom">
            <div className="canvas-hint">
              <span className="keycap">⇧</span>
              <span>Hold shift to select multiple objects</span>
            </div>
            <div className="zoom-control">
              <IconButton
                label="Zoom out"
                onClick={() => setZoom(Math.max(0.05, scale - 0.05))}
              >
                <Minus size={15} />
              </IconButton>
              <button
                className="zoom-value"
                onClick={() => setZoom(null)}
                title="Reset to fit"
              >
                {Math.round(scale * 100)}%<ChevronDown size={12} />
              </button>
              <IconButton
                label="Zoom in"
                onClick={() => setZoom(Math.min(1, scale + 0.05))}
              >
                <Plus size={15} />
              </IconButton>
              <span />
              <IconButton
                label="Fit to screen (Ctrl+0)"
                onClick={() => setZoom(null)}
              >
                <Maximize size={16} />
              </IconButton>
            </div>
          </div>
          <div className="page-strip">
            <div className="page-tabs">
              {project.pages.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => selectPage(p.id)}
                  className={p.id === page.id ? "active" : ""}
                >
                  <span
                    className="page-tab-preview"
                    style={{ background: p.background.color }}
                  >
                    <span />
                  </span>
                  <span>Page {i + 1}</span>
                  {p.id === page.id && <span className="tab-dot" />}
                </button>
              ))}
              <IconButton label="Add page" onClick={addPage}>
                <Plus size={17} />
              </IconButton>
            </div>
            <span className="page-strip-note">
              Made with a little zero magic <Sparkles size={12} />
            </span>
          </div>
        </main>
        <div
          className={`right-panel-wrap ${!rightOpen ? "collapsed" : ""} ${mobilePanel === "properties" ? "mobile-open" : ""}`}
        >
          <div
            className="panel-resizer"
            role="separator"
            aria-label="Resize properties panel"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={(e) => {
              panelResize.current = {
                x: e.clientX,
                width: e.currentTarget.parentElement!.offsetWidth,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const start = panelResize.current;
              if (start)
                e.currentTarget.parentElement!.style.width =
                  Math.max(
                    226,
                    Math.min(370, start.width + start.x - e.clientX),
                  ) + "px";
            }}
            onPointerUp={() => (panelResize.current = null)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.stopPropagation();
                e.preventDefault();
                const p = e.currentTarget.parentElement!;
                p.style.width =
                  Math.max(
                    226,
                    Math.min(
                      370,
                      p.offsetWidth + (e.key === "ArrowLeft" ? 10 : -10),
                    ),
                  ) + "px";
              }
            }}
          />
          <Inspector {...rightProps} />
        </div>
      </div>
      <nav className="mobile-bottom-nav">
        <button
          className={mobilePanel === "tools" ? "active" : ""}
          onClick={() => openTool(tool)}
        >
          <LayoutTemplate size={20} />
          <span>Tools</span>
        </button>
        <button onClick={() => openTool("layers")}>
          <Layers size={20} />
          <span>Layers</span>
        </button>
        <button
          className={selectMode ? "active" : ""}
          onClick={() => setSelectMode(!selectMode)}
        >
          <MousePointer2 size={20} />
          <span>Select</span>
        </button>
        <button
          className={mobilePanel === "properties" ? "active" : ""}
          onClick={() =>
            mobilePanel === "properties"
              ? setMobilePanel(null)
              : showProperties()
          }
        >
          <Settings2 size={20} />
          <span>Properties</span>
        </button>
        <button onClick={() => setModal("export")}>
          <Download size={20} />
          <span>Export</span>
        </button>
      </nav>
      {mobilePanel && (
        <div
          className="mobile-panel-scrim"
          onClick={() => setMobilePanel(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={14} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {context && (
        <div
          className="dropdown context-menu"
          style={{
            left: Math.min(context.x, window.innerWidth - 230),
            top: Math.min(context.y, window.innerHeight - 340),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {selected.length ? (
            <>
              <button
                onClick={() => {
                  duplicate();
                  setContext(null);
                }}
              >
                <Copy size={15} />
                Duplicate<span>⌘ D</span>
              </button>
              <button
                onClick={() => {
                  patchObjects(
                    { locked: !selectedObjects.every((o) => o.locked) },
                    "Lock changed",
                  );
                  setContext(null);
                }}
              >
                <LockKeyhole size={15} />
                {selectedObjects.every((o) => o.locked)
                  ? "Unlock"
                  : "Lock"}{" "}
                layer
              </button>
              <hr />
              {[
                ["front", "Bring to front"],
                ["forward", "Bring forward"],
                ["backward", "Send backward"],
                ["back", "Send to back"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    order(value);
                    setContext(null);
                  }}
                >
                  <Layers size={15} />
                  {label}
                </button>
              ))}
              <hr />
              <button
                className="danger"
                onClick={() => {
                  remove();
                  setContext(null);
                }}
              >
                <Trash2 size={15} />
                Delete<span>⌫</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  addPage();
                  setContext(null);
                }}
              >
                <Plus size={15} />
                Add page
              </button>
              <button
                onClick={() => {
                  copyPage(page.id);
                  setContext(null);
                }}
              >
                <Copy size={15} />
                Duplicate page
              </button>
              <button
                onClick={() => {
                  setGrid(!grid);
                  setContext(null);
                }}
              >
                <Grid2X2 size={15} />
                Toggle grid
              </button>
            </>
          )}
        </div>
      )}
      {modal === "export" && (
        <Modal
          title="Ready for the spotlight?"
          onClose={() => !exporting && setModal(null)}
        >
          <p className="modal-description">
            Your next great first impression, one download away.
          </p>
          <div className="export-summary">
            <div
              className="export-preview"
              style={{ background: page.background.color }}
            >
              <Smartphone size={37} strokeWidth={1.2} />
            </div>
            <div>
              <strong>{project.name}</strong>
              <span>{project.pages.length} pages · Full-resolution export</span>
              <small>Designed by you. Ready for Google Play.</small>
            </div>
            <span className="export-summary-spark">✳</span>
          </div>
          <label className="field-label">File format</label>
          <div className="format-options">
            <button
              className={exportFormat === "png" ? "selected" : ""}
              onClick={() => setExportFormat("png")}
            >
              <FileJson size={22} />
              <strong>PNG</strong>
              <span>Lossless. Every detail.</span>
              {exportFormat === "png" && <Check size={15} />}
            </button>
            <button
              className={exportFormat === "jpeg" ? "selected" : ""}
              onClick={() => {
                setExportFormat("jpeg");
                setTransparent(false);
              }}
            >
              <Image size={22} />
              <strong>JPG</strong>
              <span>Maximum quality.</span>
              {exportFormat === "jpeg" && <Check size={15} />}
            </button>
          </div>
          <label className="field-label">Pages to export</label>
          <select
            className="full-select"
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value)}
          >
            <option value="all">
              All {project.pages.length} pages{" "}
              {project.pages.length > 1 ? "(ZIP archive)" : ""}
            </option>
            <option value="current">Current page — {page.name}</option>
          </select>
          <label
            className={`checkbox-label ${exportFormat === "jpeg" ? "disabled" : ""}`}
          >
            <input
              type="checkbox"
              checked={transparent}
              disabled={exportFormat === "jpeg"}
              onChange={(e) => setTransparent(e.target.checked)}
            />
            <span>
              Transparent background<small>Available for PNG exports</small>
            </span>
          </label>
          <div className="export-note">
            <CheckCheck size={17} />
            <span>Exact canvas dimensions. No watermark. Always free.</span>
          </div>
          <button
            className="primary full large"
            disabled={exporting}
            onClick={() => void exportProject()}
          >
            {exporting ? <span className="spinner" /> : <Download size={17} />}{" "}
            {exporting
              ? exportProgress
              : exportScope === "all" && project.pages.length > 1
                ? `Export ${project.pages.length} pages`
                : "Export screenshot"}{" "}
            {!exporting && <ArrowUpRight size={17} />}
          </button>
        </Modal>
      )}
      {modal === "preview" && (
        <div className="preview-overlay">
          <header>
            <div>
              <span className="brand-mark">
                z<span>•</span>
              </span>
              <span>Just your design.</span>
            </div>
            <div>
              <span>
                {project.pages.findIndex((p) => p.id === page.id) + 1} /{" "}
                {project.pages.length}
              </span>
              <IconButton label="Close preview" onClick={() => setModal(null)}>
                <X size={23} />
              </IconButton>
            </div>
          </header>
          <div className="preview-content">
            <IconButton
              label="Previous page"
              onClick={() =>
                selectPage(
                  project.pages[
                    (project.pages.findIndex((p) => p.id === page.id) -
                      1 +
                      project.pages.length) %
                      project.pages.length
                  ].id,
                )
              }
            >
              <ChevronLeft size={24} />
            </IconButton>
            <Artboard
              page={page}
              scale={Math.min(
                (window.innerHeight - 170) / page.height,
                (window.innerWidth - 130) / page.width,
              )}
              active={false}
              selected={[]}
              onSelect={noop}
              onChange={noop}
              onActivate={noop}
              onEditText={noop}
              onContext={noop}
              register={noop}
              grid={false}
              preview
            />
            <IconButton
              label="Next page"
              onClick={() =>
                selectPage(
                  project.pages[
                    (project.pages.findIndex((p) => p.id === page.id) + 1) %
                      project.pages.length
                  ].id,
                )
              }
            >
              <ChevronRight size={24} />
            </IconButton>
          </div>
          <footer>
            {page.name}
            <span>
              {page.width} × {page.height} px
            </span>
          </footer>
        </div>
      )}
      {modal === "shortcuts" && (
        <Modal title="A few little shortcuts" onClose={() => setModal(null)}>
          <p className="modal-description">
            Less clicking. More creating. Use ⌘ on Mac, Ctrl on Windows.
          </p>
          <div className="shortcut-list">
            {[
              ["Undo", "⌘ Z"],
              ["Redo", "⌘ ⇧ Z / Ctrl Y"],
              ["Duplicate", "⌘ D"],
              ["Copy / paste", "⌘ C / ⌘ V"],
              ["Select all", "⌘ A"],
              ["Group / ungroup", "⌘ G / ⌘ ⇧ G"],
              ["Delete selection", "Delete / Backspace"],
              ["Nudge / big nudge", "Arrow / ⇧ Arrow"],
              ["Zoom in / out", "⌘ + / ⌘ −"],
              ["Fit to screen", "⌘ 0"],
              ["Save project", "⌘ S"],
              ["Select / pan", "V / H"],
              ["Deselect / close", "Esc"],
            ].map(([label, key]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
          <p className="muted-note">
            On touchscreens, pinch to zoom and pan with two fingers. Enable
            Select mode to choose multiple objects.
          </p>
        </Modal>
      )}
      {modal === "new" && (
        <Modal title="A fresh start?" onClose={() => setModal(null)}>
          <p className="modal-description">
            Save a project file first if you’d like to keep your current design.
            Your new project will replace the browser autosave.
          </p>
          <div className="new-project-actions">
            <button className="secondary full" onClick={saveProject}>
              <Save size={17} />
              Save current project
            </button>
            <button
              className="primary full"
              onClick={() => {
                const next = createProject();
                next.name = "Untitled project";
                next.pages = [
                  {
                    id: uid(),
                    name: "Your first screenshot",
                    width: 1080,
                    height: 1920,
                    background: defaultBackground("#f1f1ef"),
                    objects: [],
                  },
                ];
                update(() => next, "New project created");
                selectPage(next.pages[0].id);
                setModal(null);
                notify("Your next big thing starts here.");
              }}
            >
              <Plus size={17} />
              Start a blank project
            </button>
          </div>
        </Modal>
      )}
      {dragOver && (
        <div className="drop-overlay" onDragLeave={() => setDragOver(false)}>
          <Upload size={50} />
          <h2>A little drop. A big possibility.</h2>
          <p>Drop your screenshot or image here</p>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        hidden
        onChange={handleFile}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => void loadProject(e)}
      />
    </div>
  );
}
