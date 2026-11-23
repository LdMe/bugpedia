import { describe, it, expect } from "vitest";
import authController from "../src/controllers/auth.controller.js";
import { mockReq, mockRes } from "./helpers.js";

describe("logout", () => {
  it("borra la cookie del token y responde con un mensaje", () => {
    const res = mockRes();
    authController.logout(mockReq(), res);

    expect(res.clearCookie).toHaveBeenCalledWith("token", expect.objectContaining({ httpOnly: true }));
    expect(res.json).toHaveBeenCalledWith({ message: "Sesión cerrada" });
  });
});
