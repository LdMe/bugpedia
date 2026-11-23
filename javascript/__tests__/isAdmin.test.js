import { describe, it, expect } from "vitest";
import { isAdmin } from "../src/middlewares/auth.middleware.js";
import { HttpError } from "../src/utils/HttpError.js";
import { ana, profe, mockReq, mockRes, mockNext } from "./helpers.js";

describe("isAdmin", () => {
  it("sin usuario (no ha pasado por isAuthenticated) → 401", () => {
    const next = mockNext();
    isAdmin(mockReq(), mockRes(), next);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
  });

  it("un user → 403", () => {
    const next = mockNext();
    isAdmin(mockReq({ user: ana }), mockRes(), next);
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it("un admin → next() sin error", () => {
    const next = mockNext();
    isAdmin(mockReq({ user: profe }), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("nunca responde él mismo: deja la respuesta al errorHandler", () => {
    const res = mockRes();
    isAdmin(mockReq({ user: ana }), res, mockNext());
    expect(res.status).not.toHaveBeenCalled();
  });
});
