"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full h-full relative", className)}
      classNames={{
        months: "w-full h-full flex flex-col",
        month: "w-full h-full flex flex-col relative",
        month_caption: "flex justify-center py-12 items-center w-full",
        caption_label: "hidden",
        caption_dropdowns: "flex justify-center gap-2 items-center w-full relative z-20",
        dropdown: "text-lg font-medium bg-transparent border border-border/40 rounded-md px-3 py-1 hover:bg-accent cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground",
        nav: "absolute top-[54px] left-0 flex items-center justify-between w-full px-8 z-10 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-14 w-14 p-0 flex items-center justify-center opacity-50 hover:opacity-100 transition-all rounded-full pointer-events-auto"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-14 w-14 p-0 flex items-center justify-center opacity-50 hover:opacity-100 transition-all rounded-full pointer-events-auto"
        ),
        month_grid: "w-full flex-1 flex flex-col",
        weekdays: "grid grid-cols-7 w-full border-b border-border/10 pb-6 mb-0",
        weekday: "text-muted-foreground/60 font-black text-[12px] uppercase tracking-[0.5em] flex items-center justify-center w-full",
        weeks: "flex-1 flex flex-col w-full gap-3",
        week: "grid grid-cols-7 w-full flex-1 gap-3",
        day: "p-0 flex items-center justify-center w-full h-full",
        day_button: "w-full h-full border-2 border-border bg-card shadow-sm rounded-xl hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all text-lg font-medium text-foreground",
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected: "[&>button]:border-primary [&>button]:bg-accent [&>button]:text-foreground [&>button]:shadow-md",
        today: "[&>button]:text-primary [&>button]:border-primary",
        outside: "opacity-40 grayscale pointer-events-none",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="size-8 stroke-[3px]" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

export function CalendarDayButton({ day, modifiers, children, className, ...props }: any) {
  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6
  const isSelected = !!modifiers.selected
  const isToday = !!modifiers.today
  const isOutside = !!modifiers.outside

  return (
    <button
      {...props}
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-4 transition-all duration-500 relative overflow-hidden group",
        isSelected 
            ? "bg-primary text-primary-foreground" 
            : "bg-transparent hover:bg-primary/5",
        isToday && !isSelected && "bg-primary/5 text-primary",
        isOutside && "opacity-40 grayscale pointer-events-none",
        className
      )}
    >
        <span className={cn(
            "text-4xl font-black tracking-tighter leading-none transition-transform duration-500 group-hover:scale-110",
            isSelected ? "text-primary-foreground" : "text-foreground"
        )}>
            {children}
        </span>
        {!isOutside && (
            <div className={cn(
                "flex flex-col items-center gap-2 transition-all duration-300",
                isSelected ? "opacity-100" : "opacity-30 group-hover:opacity-100"
            )}>
                <span className={cn(
                    "text-[12px] font-black uppercase tracking-[0.3em] leading-none",
                    isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                    {isWeekend ? "$120" : "$100"}
                </span>
                {isToday && !isSelected && (
                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                )}
            </div>
        )}
        {isSelected && (
             <div className="absolute top-0 right-0 p-4">
                 <div className="size-2 bg-primary-foreground/40 rounded-full animate-pulse" />
             </div>
        )}
    </button>
  )
}
