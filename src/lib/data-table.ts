import { type Column } from "@tanstack/react-table"
import { cn } from "@/lib/utils"

export function getCommonPinningStyles<TData>({
  column,
  withFloatingBar = false,
}: {
  column: Column<TData>
  withFloatingBar?: boolean
}): React.CSSProperties {
  const isPinned = column.getIsPinned()
  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left")
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right")

  return {
    boxShadow: withFloatingBar
      ? undefined
      : isLastLeftPinnedColumn
        ? "-4px 0 4px -4px inset hsl(var(--border))"
        : isFirstRightPinnedColumn
          ? "4px 0 4px -4px inset hsl(var(--border))"
          : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? "sticky" : "relative",
    background: isPinned ? "hsl(var(--background))" : undefined,
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  }
}
