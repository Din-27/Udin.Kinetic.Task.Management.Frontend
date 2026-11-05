"use client";

import * as React from "react";
import { format, isToday, isBefore, startOfToday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DatePickerProps {
  date?: Date | string | null;
  onSelect?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: "start" | "end" | "center";
  showQuickPresets?: boolean;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pilih tenggat waktu",
  disabled = false,
  className,
  align = "end",
  showQuickPresets = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsedDate = React.useMemo(() => {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    return isNaN(d.getTime()) ? null : d;
  }, [date]);

  // Calendar view month & year
  const [viewDate, setViewDate] = React.useState<Date>(() => parsedDate || new Date());

  React.useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
    }
  }, [parsedDate]);

  // Close popover on outside click or Escape
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Month navigation
  const prevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate calendar days for current view
  const calendarDays = React.useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
        dayNumber: daysInPrevMonth - i,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        dayNumber: i,
      });
    }

    // Next month leading days (fill up to 35 or 42 cells)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        dayNumber: i,
      });
    }

    return days;
  }, [viewDate]);

  const handleDayClick = (dayDate: Date) => {
    if (disabled) return;
    onSelect?.(dayDate);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onSelect?.(null);
  };

  const handlePresetSelect = (daysFromNow: number) => {
    if (disabled) return;
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    target.setHours(23, 59, 59, 999);
    onSelect?.(target);
    setOpen(false);
  };

  // Format label for button
  const displayLabel = React.useMemo(() => {
    if (!parsedDate) return placeholder;
    try {
      return format(parsedDate, "d MMM yyyy", { locale: idLocale });
    } catch {
      return placeholder;
    }
  }, [parsedDate, placeholder]);

  const isOverdue = parsedDate && isBefore(parsedDate, startOfToday());
  const isDueToday = parsedDate && isToday(parsedDate);

  return (
    <div ref={containerRef} className="relative inline-block w-full min-w-0 max-w-full">
      {/* Shadcn UI Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex h-7 w-full min-w-0 max-w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono text-left transition-colors shadow-2xs hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !parsedDate && "text-muted-foreground",
          isOverdue && "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5",
          isDueToday && "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5",
          className
        )}
        title={parsedDate ? `Tenggat Waktu: ${displayLabel}` : "Pilih tenggat waktu"}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          <CalendarIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0 opacity-70",
              isOverdue && "text-rose-500 opacity-100",
              isDueToday && "text-amber-500 opacity-100"
            )}
          />
          <span className="truncate">{displayLabel}</span>
        </div>

        {parsedDate && !disabled ? (
          <span
            onClick={handleClear}
            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 ml-1 transition-colors"
            title="Hapus tenggat waktu"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-1" />
        )}
      </button>

      {/* Shadcn UI Calendar Popover */}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-1.5 z-50 w-[270px] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 select-none",
            align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          )}
        >
          {/* Quick Presets */}
          {showQuickPresets && (
            <div className="flex items-center justify-between gap-1 pb-2.5 mb-2.5 border-b border-border/70 text-[10px]">
              <button
                type="button"
                onClick={() => handlePresetSelect(0)}
                className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium flex-1 text-center"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(1)}
                className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium flex-1 text-center"
              >
                Besok
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(7)}
                className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium flex-1 text-center"
              >
                1 Minggu
              </button>
            </div>
          )}

          {/* Month & Year Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-foreground font-mono">
              {format(viewDate, "MMMM yyyy", { locale: idLocale })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={nextMonth}
                className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Bulan berikutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
              <span key={d} className="text-[10px] font-mono font-medium text-muted-foreground/70">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              const isSelected =
                parsedDate &&
                item.date.getFullYear() === parsedDate.getFullYear() &&
                item.date.getMonth() === parsedDate.getMonth() &&
                item.date.getDate() === parsedDate.getDate();

              const isCurrentDay = isToday(item.date);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(item.date)}
                  className={cn(
                    "h-7 w-7 rounded-md text-xs font-mono flex items-center justify-center transition-all",
                    !item.isCurrentMonth && "text-muted-foreground/30 hover:text-muted-foreground/70",
                    item.isCurrentMonth && "text-foreground hover:bg-muted/80",
                    isCurrentDay && !isSelected && "border border-foreground/30 font-bold",
                    isSelected && "bg-foreground text-background font-semibold hover:bg-foreground shadow-2xs"
                  )}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Clear Button Footer */}
          {parsedDate && (
            <div className="mt-2.5 pt-2 border-t border-border/70 flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground">
                Terpilih: <strong className="text-foreground">{displayLabel}</strong>
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
              >
                Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
