import type { ExtendedColumnFilter, FilterOperator } from "@/types/data-table"

/**
 * Translates data-table filter operators to Prisma-compatible query objects.
 */
export function getPrismaWhere(filters: ExtendedColumnFilter[]) {
  const andConditions: any[] = []

  filters.forEach((filter) => {
    let { id, value, operator } = filter
    
    // Safely construct nested relation paths (e.g., 'role.name')
    const keys = id.split(".")
    
    const buildNested = (keysArray: string[], leafCondition: any) => {
      let result = leafCondition
      for (let i = keysArray.length - 1; i >= 0; i--) {
        result = { [keysArray[i]]: result }
      }
      return result
    }
    
    let condition: any = {}

    switch (operator) {
      case "contains":
        condition = { contains: value, mode: "insensitive" }
        break
      case "doesNotContain":
        // Prisma string filters fail if 'mode' is nested inside 'not'
        // Using explicit top-level NOT query is perfectly stable
        andConditions.push({ NOT: buildNested(keys, { contains: value, mode: "insensitive" }) })
        return
      case "equals":
        condition = value
        break
      case "doesNotEqual":
        condition = { not: value }
        break
      case "startsWith":
        condition = { startsWith: value, mode: "insensitive" }
        break
      case "endsWith":
        condition = { endsWith: value, mode: "insensitive" }
        break
      case "isEmpty":
        condition = null
        break
      case "isNotEmpty":
        condition = { not: null }
        break
      case "greaterThan":
        condition = { gt: value }
        break
      case "lessThan":
        condition = { lt: value }
        break
      case "greaterThanOrEqualTo":
        condition = { gte: value }
        break
      case "lessThanOrEqualTo":
        condition = { lte: value }
        break
      case "isBetween":
        if (Array.isArray(value) && value.length === 2) {
          condition = { gte: value[0], lte: value[1] }
        }
        break
      default:
        condition = value
    }

    andConditions.push(buildNested(keys, condition))
  })

  return andConditions.length > 0 ? { AND: andConditions } : {}
}

/**
 * 🗺️ Sort Alias Manifest: Maps clean UI identifiers to actual database paths.
 * This ensures URLs remain readable (e.g., sort=parent:desc) while the 
 * backend logic resolves the correct relational field.
 */
const SORT_ALIAS_MAP: Record<string, string> = {
  parent: "parent.name",
  role: "role.name",
}

/**
 * Translates data-table sorting string (id:desc.name:asc) to Prisma-compatible orderBy array.
 */
export function getPrismaOrderBy(sort: string) {
  if (!sort) return [{ id: "desc" }]

  const parts = sort.split(".")
  const orderBy: any[] = []

  parts.forEach((part) => {
    let [id, direction] = part.split(":")
    if (!id || !direction) return

    // Resolve alias if it exists
    const resolvedId = SORT_ALIAS_MAP[id] || id
    
    const item: any = {}
    
    // Handle nested relations (e.g., 'role.name')
    const keys = resolvedId.split(".")
    let current = item
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        current[key] = current[key] || {}
        current = current[key]
    }
    
    current[keys[keys.length - 1]] = direction
    orderBy.push(item)
  })

  return orderBy.length > 0 ? orderBy : [{ id: "desc" }]
}
