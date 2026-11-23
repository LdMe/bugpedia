import { Router } from "express";
import bugController from "../controllers/bug.controller.ts";
import solutionController from "../controllers/solution.controller.ts";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.ts";

// Documentación de estas rutas (Swagger): src/docs/bugs.yaml
const bugRouter = Router();

// Bugs: leer es público; crear, editar y borrar requiere login
bugRouter.get("/", bugController.getAll);
bugRouter.get("/:id", bugController.getById);
bugRouter.post("/", isAuthenticated, bugController.create);
bugRouter.patch("/:id", isAuthenticated, bugController.update);
bugRouter.delete("/:id", isAuthenticated, bugController.remove);

// Soluciones
bugRouter.post("/:id/solutions", isAuthenticated, solutionController.create);
bugRouter.delete("/:id/solutions/:solutionId", isAuthenticated, solutionController.remove);
bugRouter.patch("/:id/solutions/:solutionId/verify", isAuthenticated, isAdmin, solutionController.verify);

export default bugRouter;
