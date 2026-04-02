import type { DataTableConfig } from "@/types/data-table"

export const dataTableConfig: DataTableConfig = {
  operators: [
    { label: "Contains", value: "contains", types: ["text"] },
    { label: "Does not contain", value: "doesNotContain", types: ["text"] },
    { label: "Equals", value: "equals", types: ["text", "number", "select", "boolean", "date"] },
    { label: "Does not equal", value: "doesNotEqual", types: ["text", "number", "select", "boolean", "date"] },
    { label: "Is empty", value: "isEmpty", types: ["text", "number", "select", "date"] },
    { label: "Is not empty", value: "isNotEmpty", types: ["text", "number", "select", "date"] },
    { label: "Starts with", value: "startsWith", types: ["text"] },
    { label: "Ends with", value: "endsWith", types: ["text"] },
    { label: "Greater than", value: "greaterThan", types: ["number", "date"] },
    { label: "Less than", value: "lessThan", types: ["number", "date"] },
    { label: "Greater than or equal to", value: "greaterThanOrEqualTo", types: ["number", "date"] },
    { label: "Less than or equal to", value: "lessThanOrEqualTo", types: ["number", "date"] },
    { label: "Is between", value: "isBetween", types: ["number", "date", "date-range"] },
    { label: "Is relation", value: "isRelation", types: ["multi-select"] },
  ]
}
