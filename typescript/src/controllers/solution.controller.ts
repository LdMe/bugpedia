import type { Request, Response } from "express";
import { Types } from "mongoose";
import { getBugById, saveBug } from "../repositories/bug.repository.ts";
import type { ISolution } from "../models/bug.model.ts";
import { isOwnerOrAdmin } from "../utils/permissions.ts";
import { HttpError } from "../utils/HttpError.ts";

type SolutionBody = Pick<ISolution, "text" | "code">;
type BugParams = { id: string };
type SolutionParams = { id: string; solutionId: string };

/**
 * Añade una solución a un bug. POST /api/bugs/:id/solutions
 *
 * Cualquier usuario puede, también el autor del bug. El autor de la solución se copia del token.
 *
 * @param req - params.id y, en el body, text y code (opcional)
 * @param res - 201 con el bug actualizado
 * @throws {HttpError} 404 si el bug no existe
 * @throws {mongoose.Error.ValidationError} 400 si el texto está vacío o es demasiado largo
 */
const create = async (req: Request<BugParams, {}, SolutionBody>, res: Response): Promise<void> => {
  const bug = await getBugById(req.params.id);
  if (!bug) {
    throw new HttpError(404, "Ese bug no existe");
  }

  const { text, code } = req.body;
  // Cualquiera puede aportar una solución, también el autor del bug
  bug.solutions.push({
    text,
    code,
    author: { id: new Types.ObjectId(req.user!._id), username: req.user!.username }, // copia del autor
    verified: false, // siempre empieza sin verificar
  });

  const updatedBug = await saveBug(bug);
  res.status(201).json({ data: updatedBug });
};

/**
 * Borra una solución: solo su autor o un admin (no el autor del bug).
 * DELETE /api/bugs/:id/solutions/:solutionId
 *
 * @param req - params.id (bug) y params.solutionId
 * @param res - 200 con el bug actualizado
 * @throws {HttpError} 404 si no existe el bug o la solución
 * @throws {HttpError} 403 si el usuario no es el autor de la solución ni admin
 */
const remove = async (req: Request<SolutionParams>, res: Response): Promise<void> => {
  const bug = await getBugById(req.params.id);
  if (!bug) {
    throw new HttpError(404, "Ese bug no existe");
  }

  // .id() es el método de Mongoose para buscar un subdocumento por su _id
  const solution = bug.solutions.id(req.params.solutionId);
  if (!solution) {
    throw new HttpError(404, "Esa solución no existe");
  }
  // El permiso es sobre la SOLUCIÓN: su autor o un admin (no el autor del bug)
  if (!isOwnerOrAdmin(req.user!, solution.author.id)) {
    throw new HttpError(403, "Solo el autor de la solución o un admin pueden borrarla");
  }

  solution.deleteOne(); // la quita del array; se guarda con saveBug
  const updatedBug = await saveBug(bug);
  res.json({ data: updatedBug });
};

/**
 * Verifica o desverifica una solución. PATCH /api/bugs/:id/solutions/:solutionId/verify
 *
 * Solo admin: lo comprueba el middleware isAdmin en la ruta, no este controlador.
 *
 * @param req - params.id, params.solutionId y, en el body, verified (booleano)
 * @param res - 200 con el bug actualizado
 * @throws {HttpError} 400 si verified no es un booleano
 * @throws {HttpError} 404 si no existe el bug o la solución
 */
const verify = async (req: Request<SolutionParams, {}, { verified: boolean }>, res: Response): Promise<void> => {
  const { verified } = req.body;
  if (typeof verified !== "boolean") {
    throw new HttpError(400, 'Indica "verified": true o false');
  }

  const bug = await getBugById(req.params.id);
  if (!bug) {
    throw new HttpError(404, "Ese bug no existe");
  }
  const solution = bug.solutions.id(req.params.solutionId);
  if (!solution) {
    throw new HttpError(404, "Esa solución no existe");
  }

  solution.verified = verified;
  const updatedBug = await saveBug(bug);
  res.json({ data: updatedBug });
};

export default { create, remove, verify };
