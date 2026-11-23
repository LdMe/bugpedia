import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { TECHNOLOGIES, type Technology } from "../config/constants.ts";

/** Una solución: va EMBEBIDA dentro de su bug */
export interface ISolution {
  text: string;
  code?: string; // ? = opcional
  // COPIA del autor (no es una referencia): así no hace falta populate para mostrar su nombre
  author: {
    id: Types.ObjectId;
    username: string;
  };
  verified: boolean;
}

/** Un bug (error) de la Bugpedia */
export interface IBug {
  name: string;
  errorMessage?: string;
  description: string;
  code?: string;
  technologies: Technology[];
  dangerLevel: number;
  author: Types.ObjectId; // REFERENCIA a User (se rellena con populate)
  solutions: ISolution[];
}

const solutionSchema = new Schema<ISolution>(
  {
    text: {
      type: String,
      required: [true, "La solución no puede estar vacía"],
      trim: true,
      maxlength: [2000, "La solución no puede tener más de 2000 caracteres"],
    },
    code: {
      type: String,
      maxlength: [3000, "El código no puede tener más de 3000 caracteres"],
    },
    author: {
      id: { type: Schema.Types.ObjectId, required: true },
      username: { type: String, required: true },
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// En un documento de Mongoose, "solutions" no es un array normal: es un DocumentArray,
// con métodos extra como .id() (buscar una solución por su _id). Se lo indicamos a TypeScript:
type BugDocumentOverrides = {
  solutions: Types.DocumentArray<ISolution>;
};

/** Un bug "de Mongoose": los datos de IBug + _id + métodos como save() */
export type BugDocument = HydratedDocument<IBug, BugDocumentOverrides>;

// El tipo del modelo: Model<datos, consultas, métodos, virtuales, documento>
type BugModelType = Model<IBug, {}, {}, {}, BugDocument>;

const bugSchema = new Schema<IBug, BugModelType>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [60, "El nombre no puede tener más de 60 caracteres"],
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: [500, "El mensaje de error no puede tener más de 500 caracteres"],
    },
    description: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      trim: true,
      maxlength: [2000, "La descripción no puede tener más de 2000 caracteres"],
    },
    code: {
      type: String,
      maxlength: [3000, "El código no puede tener más de 3000 caracteres"],
    },
    technologies: {
      type: [{ type: String, enum: { values: TECHNOLOGIES, message: 'La tecnología "{VALUE}" no existe' } }],
      validate: {
        validator: (list: string[]) => list.length > 0,
        message: "Indica al menos una tecnología",
      },
    },
    dangerLevel: {
      type: Number,
      required: [true, "La peligrosidad es obligatoria"],
      min: [1, "La peligrosidad mínima es 1"],
      max: [5, "La peligrosidad máxima es 5"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    solutions: {
      type: [solutionSchema], // array de subdocumentos embebidos
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false }, // sin __v en las respuestas
  },
);

export const BugModel = model<IBug, BugModelType>("Bug", bugSchema);
