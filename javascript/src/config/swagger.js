import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { TECHNOLOGIES } from "./constants.js";
import { env } from "./env.js";

/*
 * Configuración de Swagger (OpenAPI).
 *
 * La documentación de los endpoints está en los archivos YAML de src/docs/, fuera del código,
 * para que las rutas queden limpias. swagger-jsdoc los junta con esta configuración en un único
 * documento OpenAPI, y swagger-ui-express lo sirve como una web interactiva en /docs (ver index.js).
 */
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bugpedia API",
      version: "1.0.0",
      description:
        "La enciclopedia de errores de la clase. Los usuarios registran bugs con nombre de criatura, " +
        "aportan soluciones y el admin verifica las buenas.\n\n" +
        "Para probar las rutas protegidas, haz login: el navegador guarda la cookie con el token y la envía sola. " +
        "También puedes copiar el token de la respuesta y pegarlo en **Authorize** (cabecera Authorization).\n\n" +
        "Usuarios de prueba (seed), todos con la contraseña `supersecreta`: " +
        "`profe@bugpedia.dev` (admin), `ana@ejemplo.com`, `bea@ejemplo.com`, `carlos@ejemplo.com`.",
    },
    servers: [{ url: `http://localhost:${env.APP_PORT}`, description: "Desarrollo" }],
    tags: [
      { name: "Auth", description: "Registro, login y usuario actual" },
      { name: "Bugs", description: "CRUD de bugs" },
      { name: "Soluciones", description: "Soluciones de un bug" },
    ],
    components: {
      securitySchemes: {
        // Dos formas de enviar el token: cabecera "Authorization: Bearer <token>" o cookie "token"
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
      },
      schemas: {
        // Generado a partir de constants.js: la lista de tecnologías está escrita una sola vez
        Technology: { type: "string", enum: [...TECHNOLOGIES], example: "react" },
      },
    },
    // Por defecto, todas las rutas piden token (por cabecera O por cookie). Las públicas lo anulan con "security: []"
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  },
  // Dónde está la documentación: auth.yaml, bugs.yaml y components.yaml
  apis: ["./src/docs/*.yaml"],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
