import type { Request, Response } from "express";
import { Types } from "mongoose";
import {
  getBugs,
  getBugById,
  getBugByIdWithAuthor,
  createBug,
  saveBug,
  deleteBug,
} from "../repositories/bug.repository.ts";
import type { IBug } from "../models/bug.model.ts";
import { isTechnology } from "../config/constants.ts";
import { isOwnerOrAdmin } from "../utils/permissions.ts";
import { HttpError } from "../utils/HttpError.ts";

// Los campos que el usuario puede escribir. Nunca author ni solutions
const EDITABLE_FIELDS = ["name", "errorMessage", "description", "code", "technologies", "dangerLevel"] as const;

// Pick con los campos editables: el body de crear un bug
type BugBody = Pick<IBug, typeof EDITABLE_FIELDS[number]>;

// Los parámetros de la URL: /bugs/:id
type BugParams = { id: string };

/**
 * Lista los bugs, opcionalmente filtrados por tecnología. GET /api/bugs?technology=react
 *
 * @param req - query.technology (opcional): una de TECHNOLOGIES
 * @param res - 200 con la lista de bugs, los más recientes primero
 * @throws {HttpError} 400 si la tecnología no existe
 */
const getAll = async (req: Request, res: Response): Promise<void> => {
  const { technology } = req.query;

  if (technology !== undefined && !isTechnology(technology)) {
    throw new HttpError(400, `La tecnología "${technology}" no existe`);
  }

  // Aquí TypeScript ya sabe que technology es Technology | undefined
  const bugs = await getBugs(technology);
  res.json({ data: bugs });
};

/**
 * Devuelve un bug con el nombre de su autor y sus soluciones. GET /api/bugs/:id
 *
 * @param req - params.id: el _id del bug
 * @param res - 200 con el bug
 * @throws {HttpError} 404 si el bug no existe
 */
const getById = async (req: Request<BugParams>, res: Response): Promise<void> => {
  const bug = await getBugByIdWithAuthor(req.params.id);
  if (!bug) {
    throw new HttpError(404, "Ese bug no existe");
  }
  res.json({ data: bug });
};

/**
 * Registra un bug nuevo. POST /api/bugs
 *
 * Solo usa los campos permitidos del body. El autor sale del token y el bug nace sin soluciones.
 *
 * @param req - body: name, description, technologies, dangerLevel y, opcionales, errorMessage y code
 * @param res - 201 con el bug creado
 * @throws {mongoose.Error.ValidationError} 400 si algún campo no es válido (lo traduce el errorHandler)
 */
const create = async (req: Request<{}, {}, BugBody>, res: Response): Promise<void> => {
  // Cogemos SOLO los campos permitidos (si envían author o solutions, se ignoran)
  const { name, errorMessage, description, code, technologies, dangerLevel } = req.body;

  const bug = await createBug({
    name,
    errorMessage,
    description,
    code,
    technologies,
    dangerLevel,
    author: new Types.ObjectId(req.user!._id), // el autor sale del token, nunca del body
    solutions: [], // un bug puede nacer sin solución
  });

  res.status(201).json({ data: bug });
};

/**
 * Edita un bug: solo el autor o un admin. PATCH /api/bugs/:id
 *
 * Cambia solo los campos de EDITABLE_FIELDS que lleguen en el body; author y solutions no se tocan.
 *
 * @param req - params.id y, en el body, los campos a cambiar
 * @param res - 200 con el bug actualizado
 * @throws {HttpError} 404 si el bug no existe
 * @throws {HttpError} 403 si el usuario no es el autor ni admin
 */
const update = async (req: Request<BugParams, {}, Partial<BugBody>>, res: Response): Promise<void> => {
  const bug = await getBugById(req.params.id);
  if (!bug) {
    throw new HttpError(404, "Ese bug no existe");
  }
  if (!isOwnerOrAdmin(req.user!, bug.author)) {
    throw new HttpError(403, "Solo el autor o un admin pueden editar este bug");
  }

  // Solo cambiamos los campos permitidos que hayan llegado en el body
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      bug.set(field, req.body[field]);
    }
  }

  const updatedBug = await saveBug(bug); // save() ejecuta las validaciones del esquema
  res.json({ data: updatedBug });
};

/**
 * Borra un bug y sus soluciones: solo el autor o un admin. DELETE /api/bugs/:id
 *
 * @param req - params.id: el _id del bug
 * @param res - 200 con un mensaje de confirmación
 * @throws {HttpError} 404 si el bug no existe
 * @throws {HttpError} 403 si el usuario no es el autor ni admin
 */
const remove = async (req: Request<BugParams>, res: Response): Promise<void> => {
  const bug = await getBugById(req.params.id);
  if (!bug) {
    throw new HttpError(404, "Ese bug no existe");
  }
  if (!isOwnerOrAdmin(req.user!, bug.author)) {
    throw new HttpError(403, "Solo el autor o un admin pueden borrar este bug");
  }

  await deleteBug(bug);
  res.json({ message: "Bug eliminado de la Bugpedia" });
};

export default { getAll, getById, create, update, remove };
