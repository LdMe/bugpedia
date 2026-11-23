import { Router, type Request, type Response } from "express";
import authRouter from "./auth.routes.ts";
import bugRouter from "./bug.routes.ts";

// El índice de la API: cada grupo de rutas vive en su propio archivo
const router = Router();

router.get("/health", (req: Request, res: Response): void => {
  res.json({ message: "API en funcionamiento" });
});

router.use("/auth", authRouter);
router.use("/bugs", bugRouter);

export default router;
