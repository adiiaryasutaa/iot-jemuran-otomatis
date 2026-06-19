import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<DateRange | undefined>(value);

  useEffect(() => {
    if (!open) setInternal(value);
  }, [value, open]);

  const label =
    value?.from
      ? value.to
        ? `${format(value.from, "dd MMM yyyy")} – ${format(value.to, "dd MMM yyyy")}`
        : format(value.from, "dd MMM yyyy")
      : placeholder;

  function handleOpenChange(next: boolean) {
    if (!next) setInternal(value); // discard uncommitted selection on close
    setOpen(next);
  }

  function handleApply() {
    onChange(internal);
    setOpen(false);
  }

  function handleClear() {
    setInternal(undefined);
    onChange(undefined);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "justify-start text-left font-normal",
          !value?.from && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={internal}
          onSelect={setInternal}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
        />
        <div className="border-t p-2 flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" className="text-xs" onClick={handleClear}>
            Hapus
          </Button>
          <Button size="sm" className="text-xs" onClick={handleApply} disabled={!internal?.from}>
            Terapkan
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
