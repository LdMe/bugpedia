import type { Types } from "mongoose";
import type { AuthUser } from "../types/express.d.ts";

/**
 * ¿Es este usuario el autor del recurso?
 *
 * @param user - El usuario del token (req.user)
 * @param authorId - El id del autor, como ObjectId o como string
 * @returns true si son el mismo usuario
 * @example
 * isOwner(req.user, bug.author)          // un bug
 * isOwner(req.user, solution.author.id)  // una solución
 */
export function isOwner(user: AuthUser, authorId: Types.ObjectId | string): boolean {
  return user._id === authorId.toString();
}

/**
 * ¿Puede editar o borrar el recurso? Solo su autor o un admin.
 *
 * @param user - El usuario del token (req.user)
 * @param authorId - El id del autor, como ObjectId o como string
 * @returns true si es el autor o si es admin
 */
export function isOwnerOrAdmin(user: AuthUser, authorId: Types.ObjectId | string): boolean {
  return user.role === "admin" || isOwner(user, authorId);
}
