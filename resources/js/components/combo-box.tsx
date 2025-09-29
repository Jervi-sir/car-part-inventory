"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Option = { value: string; label: string };

type ComboBoxProps = {
  value: string | undefined;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  allLabel?: string;        // label for the "ALL" option (e.g. "Tous" / "Toutes")
  allValue?: string;        // your sentinel (e.g. ALL)
  disabled?: boolean;
  className?: string;       // width, etc.
};

export function ComboBox({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  emptyText = "Aucun résultat.",
  allLabel,
  allValue,
  disabled,
  className = "w-full",
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const displayText =
    (value && selected?.label) ||
    (value === allValue && allLabel) ||
    placeholder;

  const items: Option[] = React.useMemo(() => {
    if (allLabel && allValue) {
      return [{ value: allValue, label: allLabel }, ...options];
    }
    return options;
  }, [options, allLabel, allValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between", className)}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", className)}
        align="start"
      >
        <Command>
          <CommandInput placeholder="Rechercher..." className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label} // searchable by label
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
