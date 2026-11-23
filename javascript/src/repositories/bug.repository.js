import { BugModel } from "../models/bug.model.js";

// populate("author", "username"): cambia el id del autor por { _id, username }.
// Solo pedimos el username: el email de otros usuarios nunca sale de la API.

/**
 * Lista los bugs, los más recientes primero, con el nombre de su autor.
 *
 * @param {string} [technology] - Si llega, solo los bugs que incluyen esa tecnología
 * @returns {Promise<Object[]>} La lista de bugs (vacía si no hay ninguno)
 */
const getBugs = async (technology) => {
  const filter = technology ? { technologies: technology } : {};
  return BugModel.find(filter).sort({ createdAt: -1 }).populate("author", "username");
};

/**
 * Busca un bug con el nombre de su autor, para MOSTRARLO.
 *
 * @param {string} id - El _id del bug
 * @returns {Promise<Object|null>} El bug con author = { _id, username }, o null si no existe
 */
const getBugByIdWithAuthor = async (id) => {
  return BugModel.findById(id).populate("author", "username");
};

/**
 * Busca un bug sin populate, para COMPROBAR PERMISOS y modificarlo.
 *
 * Aquí author es solo el ObjectId, que es lo que necesita isOwnerOrAdmin.
 *
 * @param {string} id - El _id del bug
 * @returns {Promise<Object|null>} El bug, o null si no existe
 */
const getBugById = async (id) => {
  return BugModel.findById(id);
};

/**
 * Crea un bug.
 *
 * @param {Object} data - Los datos del bug, con el autor ya puesto
 * @returns {Promise<Object>} El bug creado, con el nombre del autor
 */
const createBug = async (data) => {
  const bug = await BugModel.create(data);
  return bug.populate("author", "username");
};

/**
 * Guarda los cambios de un bug. save() ejecuta las validaciones del esquema.
 *
 * @param {Object} bug - El bug (documento de Mongoose) modificado en memoria
 * @returns {Promise<Object>} El bug guardado, con el nombre del autor
 */
const saveBug = async (bug) => {
  await bug.save();
  return bug.populate("author", "username");
};

/**
 * Borra un bug (y con él sus soluciones, que van dentro).
 *
 * @param {Object} bug - El bug (documento de Mongoose) a borrar
 * @returns {Promise<void>}
 */
const deleteBug = async (bug) => {
  await bug.deleteOne();
};

export { getBugs, getBugByIdWithAuthor, getBugById, createBug, saveBug, deleteBug };
