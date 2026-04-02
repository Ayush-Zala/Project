/**
 * 🛡️ Sorting Intelligence Registry
 * 
 * Centralized manifest to determine if a data-table field is physically 
 * or logically sortable via Prisma. This guard prevents the "Prisma 
 * Relation Sort" error by identifying restricted relation segments.
 */

const NON_SORTABLE_FIELDS = [
    "actions",
    "select",
    "analytics",
    "permissions",
    "userRoles", // Many-relation constraint
    "members",   // Many-relation constraint
]

// 🗺️ Sortable Aliases: Fields that are relations but mapped to scalar fields on server
const SORTABLE_RELATION_ALIASES = ["parent", "role"]

export function isFieldSortable(id: string | undefined): boolean {
    if (!id) return false

    // Explicitly forbidden UI segments
    if (NON_SORTABLE_FIELDS.includes(id)) return false

    // Explicitly allowed relational aliases
    if (SORTABLE_RELATION_ALIASES.includes(id)) return true

    // Check for "many-relation" patterns (Prisma limitation)
    const segments = id.split(".")
    if (segments.length > 2) return false

    // Specific segments known to be many-relations in this schema
    if (segments.includes("userRoles") || segments.includes("members")) {
        return false
    }

    return true
}
