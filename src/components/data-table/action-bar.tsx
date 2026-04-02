"use client"

import * as React from "react"
import { type Table } from "@tanstack/react-table"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AnimatePresence, motion } from "framer-motion"

interface ActionBarProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>
  children?: React.ReactNode
}

export function ActionBar<TData>({
  table,
  children,
  className,
  ...props
}: ActionBarProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const isOpen = selectedRows.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           key="action-bar"
           initial={{ y: 50, opacity: 0, x: "-50%" }}
           animate={{ y: 0, opacity: 1, x: "-50%" }}
           exit={{ y: 50, opacity: 0, x: "-50%" }}
           transition={{ 
             type: "spring", 
             stiffness: 400, 
             damping: 30,
             opacity: { duration: 0.2 } 
           }}
           className={cn(
             "fixed bottom-8 left-1/2 z-50 flex items-center bg-popover/90 backdrop-blur-2xl border border-input shadow-2xl p-1.5 rounded-full ring-1 ring-border/20",
             className
           )}
           {...(props as any)}
        >
          <div className="flex items-center gap-2 pl-4 pr-1">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground/90 whitespace-nowrap min-w-[100px]">
              {selectedRows.length} Selected
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 p-0 hover:bg-muted/50 hover:text-foreground transition-all rounded-full outline-none"
              onClick={() => table.toggleAllRowsSelected(false)}
            >
              <XIcon className="size-3.5 opacity-60" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-4 bg-border/40 mx-1" />
          
          <div className="flex items-center gap-1.5 px-2">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
