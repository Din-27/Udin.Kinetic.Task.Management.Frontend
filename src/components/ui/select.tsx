"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectContext = React.createContext<SelectContextType>({
  value: "",
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

export function Select({
  value,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const isControlledOpen = controlledOpen !== undefined;
  const currentOpen = isControlledOpen ? controlledOpen : uncontrolledOpen;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlled) setInternalValue(newVal);
      onValueChange?.(newVal);
    },
    [isControlled, onValueChange]
  );

  const handleOpenChange = React.useCallback(
    (action: React.SetStateAction<boolean>) => {
      const next = typeof action === "function" ? action(currentOpen) : action;
      if (!isControlledOpen) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlledOpen, currentOpen, onOpenChange]
  );

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open: currentOpen,
        setOpen: handleOpenChange,
      }}
    >
      <div className={cn("relative inline-block w-full min-w-0 max-w-full", currentOpen ? "z-50" : "z-auto")}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls="select-dropdown-content"
      disabled={disabled}
      onClick={() => !disabled && setOpen((prev) => !prev)}
      className={cn(
        "flex h-8 w-full min-w-0 max-w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground overflow-hidden text-left",
        className
      )}
      {...props}
    >
      <span className="flex-1 min-w-0 truncate text-left pr-1">{children}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1 transition-transform duration-200" />
    </button>
  );
}

export function SelectValue({
  placeholder,
  className,
  children,
}: {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { value } = React.useContext(SelectContext);
  return (
    <span className={cn("truncate block min-w-0 max-w-full", !value && !children && "text-muted-foreground", className)}>
      {children || value || placeholder}
    </span>
  );
}

export function SelectContent({
  className,
  children,
  align = "start",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }) {
  const { open, setOpen } = React.useContext(SelectContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contentRef.current && !contentRef.current.contains(target)) {
        // If clicking on the trigger button itself, let trigger onClick handle toggle
        const trigger = contentRef.current.parentElement?.querySelector('button[role="combobox"]');
        if (trigger && trigger.contains(target)) {
          return;
        }
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      id="select-dropdown-content"
      ref={contentRef}
      className={cn(
        "absolute top-full mt-1 z-50 min-w-[8rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      {...props}
    >
      <div className="max-h-60 overflow-y-auto">{children}</div>
    </div>
  );
}

export function SelectItem({
  value,
  children,
  className,
  disabled,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean }) {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  const handleSelect = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onValueChange(value);
    setOpen(false);
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={handleSelect}
      className={cn(
        "relative flex w-full min-w-0 cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-7 text-xs outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
        isSelected && "bg-accent/60 font-medium text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="truncate block min-w-0 max-w-full text-left">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center text-primary shrink-0">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}
