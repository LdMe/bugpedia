import { describe, it, expect, vi } from "vitest";
import mongoose from "mongoose";
import { errorHandler } from "../src/middlewares/error.middleware.js";
import { HttpError } from "../src/utils/HttpError.js";
import { BugModel } from "../src/models/bug.model.js";
import { mockReq, mockRes, mockNext } from "./helpers.js";

/** Pasa un error por el errorHandler y devuelve el status y el body de la respuesta */
function handle(error) {
  const res = mockRes();
  errorHandler(error, mockReq(), res, mockNext());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe("errorHandler", () => {
  it("HttpError → su código y su mensaje", () => {
    const { status, body } = handle(new HttpError(403, "No tienes permiso"));
    expect(status).toBe(403);
    expect(body).toEqual({ error: "No tienes permiso" });
  });

  it("error de validación de Mongoose → 400 con el error de cada campo", async () => {
    // Un bug sin nada: validate() falla (no hace falta base de datos)
    const error = await new BugModel({ dangerLevel: 9 }).validate().catch((e) => e);
    const { status, body } = handle(error);
    expect(status).toBe(400);
    expect(body.details.name).toBe("El nombre es obligatorio");
    expect(body.details.dangerLevel).toBe("La peligrosidad máxima es 5");
  });

  it("id mal formado (CastError) → 400", () => {
    const { status } = handle(new mongoose.Error.CastError("ObjectId", "patata", "_id"));
    expect(status).toBe(400);
  });

  it("email repetido (code 11000) → 409 diciendo qué campo", () => {
    const error = Object.assign(new Error("duplicate key"), { code: 11000, keyValue: { email: "ana@ejemplo.com" } });
    const { status, body } = handle(error);
    expect(status).toBe(409);
    expect(body.error).toContain("email");
  });

  it("JSON mal escrito → 400", () => {
    const error = Object.assign(new SyntaxError("Unexpected token"), { type: "entity.parse.failed" });
    expect(handle(error).status).toBe(400);
  });

  it("cualquier otro error → 500 sin dar detalles al cliente", () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // que no ensucie la salida del test
    const { status, body } = handle(new Error("contraseña de la base de datos: 1234"));
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Error interno del servidor" });
  });
});
