import { BugModel, type BugDocument, type IBug } from "../models/bug.model.ts";
import type { Technology } from "../config/constants.ts";

// populate("author", "username"): cambia el id del autor por { _id, username }.
// Solo pedimos el username: el email de otros usuarios nunca sale de la API.

/**
 * Lista los bugs, los más recientes primero, con el nombre de su autor.
 *
 * @param technology - Si llega, solo los bugs que incluyen esa tecnología
 * @returns La lista de bugs (vacía si no hay ninguno)
 */
const getBugs = async (technology?: Technology): Promise<BugDocument[]> => {
  const filter = technology ? { technologies: technology } : {};
  return BugModel.find(filter).sort({ createdAt: -1 }).populate("author", "username");
};

/**
 * Busca un bug con el nombre de su autor, para MOSTRARLO.
 *
 * @param id - El _id del bug
 * @returns El bug con author = { _id, username }, o null si no existe
 */
const getBugByIdWithAuthor = async (id: string): Promise<BugDocument | null> => {
  return BugModel.findById(id).populate("author", "username");
};

/**
 * Busca un bug sin populate, para COMPROBAR PERMISOS y modificarlo.
 *
 * Aquí author es solo el ObjectId, que es lo que necesita isOwnerOrAdmin.
 *
 * @param id - El _id del bug
 * @returns El bug, o null si no existe
 */
const getBugById = async (id: string): Promise<BugDocument | null> => {
  return BugModel.findById(id);
};

/**
 * Crea un bug.
 *
 * @param data - Los datos del bug, con el autor ya puesto
 * @returns El bug creado, con el nombre del autor
 */
const createBug = async (data: IBug): Promise<BugDocument> => {
  const bug = await BugModel.create(data);
  return bug.populate("author", "username");
};

/**
 * Guarda los cambios de un bug. save() ejecuta las validaciones del esquema.
 *
 * @param bug - El bug modificado en memoria
 * @returns El bug guardado, con el nombre del autor
 */
const saveBug = async (bug: BugDocument): Promise<BugDocument> => {
  await bug.save();
  return bug.populate("author", "username");
};

/**
 * Borra un bug (y con él sus soluciones, que van dentro).
 *
 * @param bug - El bug a borrar
 */
const deleteBug = async (bug: BugDocument): Promise<void> => {
  await bug.deleteOne();
};

export { getBugs, getBugByIdWithAuthor, getBugById, createBug, saveBug, deleteBug };
