"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { InputControl } from "./InputControl";

type PickerType = "date" | "datetime" | "time";
type Props = {
  type: PickerType;
  value: string;
  label: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};
const pad = (value: number) => String(value).padStart(2, "0");
const dateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function DateTimePicker({
  type,
  value,
  label,
  onChange,
  disabled = false,
}: Props) {
  const t = useTranslations("templateEditor");
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [view, setView] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const syncDraft = () => {
    const now = new Date();
    const datePart =
      type === "time" ? dateValue(now) : value.split("T")[0] || dateValue(now);
    const timePart =
      type === "date"
        ? `${pad(now.getHours())}:${pad(now.getMinutes())}`
        : (type === "time" ? value : value.split("T")[1]) ||
          `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const [h, m] = timePart.split(":");
    setDraftDate(datePart);
    setHour(Number(h || 0));
    setMinute(Number(m || 0));
    const d = new Date(`${datePart}T12:00:00`);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);
  const apply = () => {
    if (type === "date") onChange(draftDate);
    else if (type === "time") onChange(`${pad(hour)}:${pad(minute)}`);
    else onChange(`${draftDate}T${pad(hour)}:${pad(minute)}`);
    setOpen(false);
  };
  return (
    <div className="date-time-picker" ref={root}>
      <button
        type="button"
        className="date-picker-trigger"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onClick={() =>
          setOpen((current) => {
            const next = !current;
            if (next) syncDraft();
            return next;
          })
        }
      >
        {type === "time" ? <Clock3 size={18} /> : <CalendarDays size={18} />}
      </button>
      {open && (
        <div className="date-picker-popover" role="dialog" aria-label={label}>
          {type !== "time" && (
            <>
              <div className="date-picker-heading">
                <button
                  type="button"
                  onClick={() =>
                    setView(
                      new Date(view.getFullYear(), view.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>
                  {view.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setView(
                      new Date(view.getFullYear(), view.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="date-picker-weekdays">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={`${d}-${i}`}>{d}</span>
                ))}
              </div>
              <div className="date-picker-grid">
                {days.map((day) => {
                  const canonical = dateValue(day);
                  const selected = draftDate === canonical;
                  return (
                    <button
                      type="button"
                      key={canonical}
                      className={`${day.getMonth() !== view.getMonth() ? "outside" : ""}${selected ? " selected" : ""}`}
                      onClick={() => setDraftDate(canonical)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {type !== "date" && (
            <div className="date-picker-time">
              <label>
                HH
                <InputControl
                  inputMode="numeric"
                  min={0}
                  max={23}
                  type="number"
                  value={hour}
                  onChange={(e) =>
                    setHour(Math.max(0, Math.min(23, Number(e.target.value))))
                  }
                />
              </label>
              <span>:</span>
              <label>
                MM
                <InputControl
                  inputMode="numeric"
                  min={0}
                  max={59}
                  type="number"
                  value={minute}
                  onChange={(e) =>
                    setMinute(Math.max(0, Math.min(59, Number(e.target.value))))
                  }
                />
              </label>
            </div>
          )}
          <div className="date-picker-actions">
            <button
              type="button"
              className="btn secondary compact"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </button>
            <button type="button" className="btn compact" onClick={apply}>
              {t("done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
