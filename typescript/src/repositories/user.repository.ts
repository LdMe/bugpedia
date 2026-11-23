import { UserModel, type IUser, type UserDocument } from "../models/user.model.ts";

// El repositorio es el ÚNICO sitio que habla con el modelo (Mongoose).
// Los controladores le piden datos con funciones de nombre claro.

/**
 * Crea un usuario.
 *
 * @param data - Los datos del usuario, con la contraseña YA cifrada
 * @returns El usuario creado
 */
const createUser = async (data: IUser): Promise<UserDocument> => {
  return UserModel.create(data);
};

/**
 * Busca un usuario por email, incluyendo la contraseña (para el login).
 *
 * La contraseña tiene select: false en el esquema, así que hay que pedirla con "+password".
 *
 * @param email - El email (se busca en minúsculas)
 * @returns El usuario con su contraseña, o null si no existe
 */
const getUserByEmail = async (email: string): Promise<UserDocument | null> => {
  return UserModel.findOne({ email: email.toLowerCase() }).select("+password");
};

/**
 * Busca un usuario por su _id (para /auth/me).
 *
 * @param id - El _id del usuario
 * @returns El usuario sin contraseña, o null si no existe
 */
const getUserById = async (id: string): Promise<UserDocument | null> => {
  return UserModel.findById(id);
};

export { createUser, getUserByEmail, getUserById };
