import { ChevronDown, X } from "lucide-react";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
export function IconButton({
  children,
  label,
  onClick,
  active,
  disabled,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""} ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function Section({
  title,
  children,
  trailing,
  initialOpen = true,
}: {
  title: string;
  children: ReactNode;
  trailing?: ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <section className="property-section">
      <div className="section-title">
        <button onClick={() => setOpen(!open)}>
          {title}
          <ChevronDown size={13} className={open ? "" : "closed"} />
        </button>
        {trailing}
      </div>
      {open && <div className="section-content">{children}</div>}
    </section>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = -8000,
  max = 8000,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  useLayoutEffect(
    () => setDraft(String(Math.round(value * 100) / 100)),
    [value],
  );
  const commit = () => {
    const next =
      draft.trim() && Number.isFinite(Number(draft))
        ? Math.min(max, Math.max(min, Number(draft)))
        : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {suffix && <em>{suffix}</em>}
    </label>
  );
}
export function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <em>
          {Math.round(value * 100) / 100}
          {suffix}
        </em>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function ColorField({
  value,
  onChange,
  label = "Color",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  const [draft, setDraft] = useState(value.toUpperCase());
  useLayoutEffect(() => setDraft(value.toUpperCase()), [value]);
  return (
    <label className="color-field">
      <input
        aria-label={label + " picker"}
        type="color"
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        aria-label={label + " hex"}
        value={draft}
        maxLength={7}
        onChange={(e) => {
          const s = e.target.value;
          setDraft(s);
          if (/^#?[0-9a-f]{6}$/i.test(s))
            onChange((s.startsWith("#") ? s : "#" + s).toLowerCase());
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(value.toUpperCase())}
        onPaste={(e) => {
          const s = e.clipboardData.getData("text").trim();
          if (/^#?[0-9a-f]{6}$/i.test(s)) {
            e.preventDefault();
            onChange(s.startsWith("#") ? s : "#" + s);
          }
        }}
      />
      <span>100%</span>
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current
      ?.querySelector<HTMLElement>("button, input, select, textarea")
      ?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            const items = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea",
              ) || [],
            );
            const first = items[0],
              last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}
