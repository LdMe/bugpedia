import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { isOwnerOrAdmin } from "../src/utils/permissions.ts";
import { ana, bea, profe } from "./helpers.ts";

// Un bug cuyo autor es ana (en la base de datos el autor es un ObjectId)
const anaId = new Types.ObjectId(ana._id);

describe("isOwnerOrAdmin", () => {
  it("el autor puede", () => {
    expect(isOwnerOrAdmin(ana, anaId)).toBe(true);
  });

  it("otro usuario no puede", () => {
    expect(isOwnerOrAdmin(bea, anaId)).toBe(false);
  });

  it("un admin puede aunque no sea el autor", () => {
    expect(isOwnerOrAdmin(profe, anaId)).toBe(true);
  });

  it("funciona también si el id del autor llega como string", () => {
    expect(isOwnerOrAdmin(ana, ana._id)).toBe(true);
    expect(isOwnerOrAdmin(bea, ana._id)).toBe(false);
  });
});
