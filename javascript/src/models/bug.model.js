import { Schema, model } from "mongoose";
import { TECHNOLOGIES } from "../config/constants.js";

/** Una solución: va EMBEBIDA dentro de su bug */
const solutionSchema = new Schema(
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
    // COPIA del autor (no es una referencia): así no hace falta populate para mostrar su nombre
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

/** Un bug (error) de la Bugpedia */
const bugSchema = new Schema(
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
        validator: (list) => list.length > 0,
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
      ref: "User", // REFERENCIA a User (se rellena con populate)
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

export const BugModel = model("Bug", bugSchema);
