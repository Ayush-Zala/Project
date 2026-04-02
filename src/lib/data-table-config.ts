import { FilterOperator, FilterVariant } from "@/types/data-table"

export const dataTableConfig = {
  operators: [
    {
      label: "Contains",
      value: "contains" as FilterOperator,
      types: ["text"] as FilterVariant[],
    },
    {
      label: "Does not contain",
      value: "doesNotContain" as FilterOperator,
      types: ["text"] as FilterVariant[],
    },
    {
      label: "Is",
      value: "equals" as FilterOperator,
      types: ["text", "number", "select", "boolean"] as FilterVariant[],
    },
    {
      label: "Is not",
      value: "doesNotEqual" as FilterOperator,
      types: ["text", "number", "select", "boolean"] as FilterVariant[],
    },
    {
      label: "Starts with",
      value: "startsWith" as FilterOperator,
      types: ["text"] as FilterVariant[],
    },
    {
      label: "Ends with",
      value: "endsWith" as FilterOperator,
      types: ["text"] as FilterVariant[],
    },
    {
      label: "Is empty",
      value: "isEmpty" as FilterOperator,
      types: ["text", "number", "select", "multi-select"] as FilterVariant[],
    },
    {
      label: "Is not empty",
      value: "isNotEmpty" as FilterOperator,
      types: ["text", "number", "select", "multi-select"] as FilterVariant[],
    },
    {
      label: "Greater than",
      value: "greaterThan" as FilterOperator,
      types: ["number", "date"] as FilterVariant[],
    },
    {
      label: "Less than",
      value: "lessThan" as FilterOperator,
      types: ["number", "date"] as FilterVariant[],
    },
    {
      label: "Is between",
      value: "isBetween" as FilterOperator,
      types: ["number", "date", "date-range"] as FilterVariant[],
    },
  ],
}
