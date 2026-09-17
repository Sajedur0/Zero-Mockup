import { ChevronDown, X } from "lucide-react";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  commitFieldNumber,
  formatFieldNumber,
  liveFieldNumber,
} from "./fields";
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
  const [draft, setDraft] = useState(() => formatFieldNumber(value));
  /**
   * While the field has focus the draft is the source of truth, so a value
   * coming back from the canvas — or a clamp that has not been applied yet —
   * can never overwrite what is being typed.
   */
  const [editing, setEditing] = useState(false);
  const escapeRef = useRef(false);
  useLayoutEffect(() => {
    if (!editing) setDraft(formatFieldNumber(value));
  }, [value, editing]);
  const apply = (next: number) => {
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
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          // Live update: every keystroke and every spinner click that already
          // reads as a usable number is applied to the object straight away.
          // Out-of-range text waits for the blur so "150" can be typed into a
          // field whose minimum is 20.
          const live = liveFieldNumber(text, min, max);
          if (live !== undefined) apply(live);
        }}
        onBlur={() => {
          setEditing(false);
          if (escapeRef.current) {
            escapeRef.current = false;
            setDraft(formatFieldNumber(value));
            return;
          }
          const next = commitFieldNumber(draft, value, min, max);
          setDraft(formatFieldNumber(next));
          apply(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          // Escape leaves without committing what has not been applied yet —
          // an unfinished or out-of-range value — and shows the number the
          // object actually has.
          else if (e.key === "Escape") {
            escapeRef.current = true;
            setDraft(formatFieldNumber(value));
            e.currentTarget.blur();
          }
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
