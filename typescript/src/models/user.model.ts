import { Schema, model, type HydratedDocument } from "mongoose";
import { ROLES, type Role } from "../config/constants.ts";

/** La forma de un usuario: lo que guardamos en la base de datos */
export interface IUser {
  username: string;
  email: string;
  password: string; // siempre el HASH de bcrypt, nunca la contraseña en claro
  role: Role;
}

// Schema<IUser>: el esquema tiene que encajar con la interfaz (si falta un campo, TypeScript avisa)
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "El nombre de usuario es obligatorio"],
      unique: true,
      trim: true,
      minlength: [3, "El nombre de usuario debe tener al menos 3 caracteres"],
      maxlength: [20, "El nombre de usuario no puede tener más de 20 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "El email no es válido"],
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      select: false, // no se devuelve en las consultas salvo que se pida con .select("+password")
    },
    role: {
      type: String,
      enum: ROLES,
      default: "user",
    },
  },
  {
    timestamps: true, // añade createdAt y updatedAt
    toJSON: {
      // Al convertir a JSON (res.json) quitamos la contraseña y __v
      transform: (_doc, ret) => {
        const { password, __v, ...user } = ret;
        return user;
      },
    },
  },
);

/** Un usuario "de Mongoose": los datos de IUser + _id + métodos como save() */
export type UserDocument = HydratedDocument<IUser>;

export const UserModel = model<IUser>("User", userSchema);
