import "dotenv/config"; // carga el .env en process.env (no pisa las variables que ya existan)

/** Todas las variables de entorno que usa la API, ya validadas y con su tipo */
interface Env {
  NODE_ENV: "development" | "production" | "test";
  APP_PORT: number;
  FRONTEND_URL: string;
  JWT_SECRET: string;
  MONGO_HOST: string;
  MONGO_PORT: number;
  MONGO_USER: string;
  MONGO_PASSWORD: string;
  MONGO_DB: string;
  MONGO_AUTH_SOURCE: string;
}

const REQUIRED = ["JWT_SECRET", "MONGO_HOST", "MONGO_PORT", "MONGO_USER", "MONGO_PASSWORD", "MONGO_DB"];

/**
 * Lee las variables de entorno, comprueba que están las obligatorias y les da su tipo.
 *
 * Se ejecuta UNA vez, al importar este archivo. Si falta alguna variable obligatoria,
 * la aplicación no arranca y dice cuál falta (mejor que fallar más tarde con un error raro).
 *
 * @returns Las variables validadas
 * @throws {Error} Si falta alguna variable obligatoria
 */
const getEnv = (): Env => {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}. Revisa tu .env (mira .env.example)`);
  }

  return {
    NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) || "development",
    APP_PORT: Number(process.env.APP_PORT) || 3000,
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
    // El "!" es seguro aquí: acabamos de comprobar que existen
    JWT_SECRET: process.env.JWT_SECRET!,
    MONGO_HOST: process.env.MONGO_HOST!,
    MONGO_PORT: Number(process.env.MONGO_PORT),
    MONGO_USER: process.env.MONGO_USER!,
    MONGO_PASSWORD: process.env.MONGO_PASSWORD!,
    MONGO_DB: process.env.MONGO_DB!,
    MONGO_AUTH_SOURCE: process.env.MONGO_AUTH_SOURCE || "admin",
  };
};

export const env = getEnv();
