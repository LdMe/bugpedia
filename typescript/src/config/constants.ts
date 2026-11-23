// Valores permitidos, definidos UNA sola vez.
// "as const" hace que TypeScript los trate como valores fijos ("user", "admin")
// en lugar de como un string[] cualquiera.

export const ROLES = ["user", "admin"] as const;

// typeof ROLES[number] = "el tipo de cualquier elemento del array" → "user" | "admin"
export type Role = typeof ROLES[number];

export const TECHNOLOGIES = [
  "javascript", "typescript", "html", "css", "react",
  "node", "express", "mongodb", "git", "vite", "other",
] as const;

export type Technology = typeof TECHNOLOGIES[number];

/**
 * Type guard: comprueba en tiempo de ejecución si un valor es una tecnología válida.
 * Si devuelve true, TypeScript sabe a partir de ahí que `value` es de tipo Technology.
 *
 * @param value - Cualquier valor (por ejemplo, un query param)
 * @returns true si es una de las TECHNOLOGIES
 * @example
 * isTechnology("react") // true
 * isTechnology("cobol") // false
 */
export function isTechnology(value: unknown): value is Technology {
  return typeof value === "string" && TECHNOLOGIES.includes(value as Technology);
}
