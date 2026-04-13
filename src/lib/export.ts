import { type Table } from "@tanstack/react-table"

export function exportToCSV<TData>(table: Table<TData>, filename: string) {
  // 1. Extract Headers (Using meta.title if available, otherwise accessorKey)
  const columns = table.getAllLeafColumns().filter(col => col.getIsVisible() && col.id !== "select" && col.id !== "actions")
  
  const headers = columns.map(col => {
    const meta = col.columnDef.meta as any
    return meta?.title ? meta.title.toUpperCase() : col.id.toUpperCase()
  })

  // 2. Extract Data Rows
  const rows = table.getFilteredRowModel().rows.map(row => {
    return columns.map(col => {
      const value = row.getValue(col.id)
      
      // Handle nested objects or dates
      if (value === null || value === undefined) return ""
      if (typeof value === "object") return JSON.stringify(value)
      if (typeof value === "boolean") return value ? "YES" : "NO"
      
      return String(value)
    })
  })

  // 3. Construct CSV String
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
  ].join("\n")

  // 4. Trigger Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
