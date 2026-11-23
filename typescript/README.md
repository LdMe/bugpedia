# 🐛📖 Bugpedia API · versión TypeScript

La enciclopedia de errores de la clase. Cuando alguien se encuentra un error de programación, lo registra como si fuera una criatura ("El CORS Salvaje", "El Undefined Fantasma"), con sus síntomas y su peligrosidad. El resto de la clase aporta soluciones y el profesor verifica las buenas.

API REST hecha con **Node.js, Express 5, MongoDB (Mongoose) y TypeScript**, dockerizada junto con MongoDB y Mongo Express.

> - Hay una versión idéntica en **JavaScript** en [`../javascript`](../javascript).
> - **¿Vas a usarlo como referencia para tu proyecto?** Empieza por la [guía](../GUIA.md): qué es imprescindible y qué es extra, en qué orden leer el código, cómo adaptarlo y retos para ampliarlo.
> - El diseño completo (modelo de datos, decisiones, seguridad, tests...) está en la [memoria técnica](../MEMORIA.md).

---

## Requisitos

- **Docker Desktop** (Docker y Docker Compose), para levantar la API, MongoDB y Mongo Express.
- **Node.js 22.18 o superior** (recomendado 24 LTS), para ejecutar los tests y comprobar los tipos fuera de Docker.

```bash
node --version
docker --version
```

## Instalación

```bash
git clone https://github.com/LdMe/bugpedia.git
cd bugpedia/typescript
cp .env.example .env    # revisa los valores, sobre todo JWT_SECRET
npm install             # para los tests, el type-check y el autocompletado del editor
```

## Variables de entorno

Se definen en el `.env` (hay un ejemplo en [`.env.example`](./.env.example)). El `docker-compose.yml` las usa para nombrar los contenedores y configurar MongoDB, y la API las lee al arrancar.

| Variable | Ejemplo | Para qué sirve |
|---|---|---|
| `APP_HOST` | `bugpedia` | Nombre del contenedor de la API |
| `APP_PORT` | `3000` | Puerto de tu ordenador en el que se publica la API |
| `FRONTEND_URL` | `http://localhost:5173` | Dirección del frontend. Necesaria para que el navegador acepte la cookie del token (CORS) |
| `MONGO_HOST` | `bugpedia-mongo` | Nombre del contenedor de MongoDB. La API se conecta a Mongo por este nombre |
| `MONGO_PORT` | `27017` | Puerto de MongoDB |
| `MONGO_USER` | `user` | Usuario root de MongoDB |
| `MONGO_PASSWORD` | `1234` | Contraseña del usuario root |
| `MONGO_DB` | `bugpedia` | Base de datos de la aplicación |
| `MONGO_AUTH_SOURCE` | `admin` | Base de datos donde está registrado el usuario root |
| `MONGO_EXPRESS_HOST` | `bugpedia-mongo-express` | Nombre del contenedor de Mongo Express |
| `MONGO_EXPRESS_PORT` | `8081` | Puerto de Mongo Express |
| `MONGO_EXPRESS_USER` | `user` | Usuario para entrar en Mongo Express |
| `MONGO_EXPRESS_PASSWORD` | `1234` | Contraseña para entrar en Mongo Express |
| `JWT_SECRET` | una cadena larga | Secreto con el que se firman los tokens |

`src/config/env.ts` comprueba las variables al arrancar: si falta alguna obligatoria (`JWT_SECRET` o las de MongoDB), la API no arranca y dice cuáles faltan.

> ⚠️ `MONGO_USER` y `MONGO_PASSWORD` solo crean el usuario root **la primera vez** que arranca MongoDB con el volumen vacío. Si los cambias después, haz `docker compose down -v` (borra los datos) y vuelve a levantar.

## Arrancar el proyecto

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| API | http://localhost:3000/api |
| Documentación interactiva (Swagger) | http://localhost:3000/docs |
| Mongo Express | http://localhost:8081 (usuario y contraseña de `MONGO_EXPRESS_USER` y `MONGO_EXPRESS_PASSWORD`) |
| MongoDB (para Compass) | `mongodb://user:1234@localhost:27017/?authSource=admin` |

La API no arranca hasta que MongoDB responde (`healthcheck`) y se reinicia sola al guardar cambios en el código (`node --watch`).

Comandos útiles:

```bash
docker compose up --build -d      # en segundo plano
docker compose logs -f app        # ver los logs de la API
docker compose down               # parar (los datos se conservan)
docker compose down -v            # parar y BORRAR los datos (vuelve a cargar el seed al levantar)
```

## Datos de prueba (seed)

La primera vez que arranca MongoDB, se ejecuta [`database/scripts/01-seed.js`](./database/scripts/01-seed.js) y carga 4 usuarios y 7 bugs. Todos los usuarios tienen la contraseña **`supersecreta`**:

| Email | Rol |
|---|---|
| `profe@bugpedia.dev` | **admin** |
| `ana@ejemplo.com` | user |
| `bea@ejemplo.com` | user |
| `carlos@ejemplo.com` | user |

Para volver a cargarlo desde cero: `docker compose down -v && docker compose up --build`.

## Tests

24 tests unitarios con **Vitest**. No necesitan base de datos, ni Docker, ni `.env`: prueban los middlewares de autenticación (`isAuthenticated`, con el token en la cabecera y en la cookie, e `isAdmin`), los permisos (`isOwnerOrAdmin`), el manejador de errores y el logout. Sus variables de entorno están en `vitest.config.ts`.

```bash
npm test                 # modo watch: se repiten al guardar
npm run test:run         # una sola vez
npm run test:coverage    # con informe de cobertura
```

Dentro de Docker: `docker compose exec app npm run test:run`.

## Comprobar los tipos

Node ejecuta los archivos `.ts` directamente, pero **no comprueba los tipos**. Para eso:

```bash
npm run type-check
```

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Comprobar que la API está viva |
| POST | `/api/auth/register` | Público | Registro (siempre con rol `user`) |
| POST | `/api/auth/login` | Público | Login: devuelve el token y lo guarda en una cookie |
| POST | `/api/auth/logout` | Público | Cierra la sesión (borra la cookie) |
| GET | `/api/auth/me` | Autenticado | Usuario actual |
| GET | `/api/bugs?technology=react` | Público | Listar bugs (filtro opcional por tecnología) |
| GET | `/api/bugs/:id` | Público | Ver un bug con sus soluciones |
| POST | `/api/bugs` | Autenticado | Registrar un bug |
| PATCH | `/api/bugs/:id` | Autor o admin | Editar un bug |
| DELETE | `/api/bugs/:id` | Autor o admin | Borrar un bug |
| POST | `/api/bugs/:id/solutions` | Autenticado | Añadir una solución |
| DELETE | `/api/bugs/:id/solutions/:solutionId` | Autor de la solución o admin | Borrar una solución |
| PATCH | `/api/bugs/:id/solutions/:solutionId/verify` | **Admin** | Verificar una solución |

Las rutas protegidas necesitan el token, que se puede enviar de dos formas:

- **En la cabecera** `Authorization: Bearer <token>`, con el token que devuelve el login.
- **En la cookie** `token`, que guarda el login y el navegador envía sola. Desde un frontend: `fetch(url, { credentials: "include" })`.

Si llegan las dos, manda la cabecera. Las ventajas e inconvenientes de cada una están en la [memoria (5.4)](../MEMORIA.md#54-dos-formas-de-enviar-el-token-cabecera-o-cookie).

## Documentación

- **Swagger** (http://localhost:3000/docs): todos los endpoints, con sus parámetros, cuerpos y respuestas, y la posibilidad de probarlos desde el navegador. Para las rutas protegidas, haz login desde la propia página (el navegador guarda la cookie) o pega el token en **Authorize**. La documentación está en los archivos YAML de [`src/docs`](./src/docs).
- **Postman:** importa [`postman/Bugpedia.postman_collection.json`](./postman/Bugpedia.postman_collection.json). Tiene 40 peticiones en carpetas; ejecutadas en orden, los tokens y los ids se guardan solos.
- **JSDoc:** los controladores, repositorios, middlewares y utilidades están documentados con comentarios JSDoc (se ven al pasar el ratón por encima en el editor).
- **Memoria técnica:** [`MEMORIA.md`](../MEMORIA.md).

## Estructura del proyecto

```
src/
├── index.ts                 # Arranque: middlewares, rutas, Swagger, errores y conexión a Mongo
├── config/                  # Variables de entorno, conexión a MongoDB, Swagger y constantes
├── routes/                  # Qué URL va a qué controlador
├── docs/                    # Documentación Swagger (OpenAPI) en YAML
├── controllers/             # Leen la petición, comprueban permisos y responden
├── repositories/            # El único sitio que habla con Mongoose
├── models/                  # Esquemas de Mongoose (User, Bug con sus soluciones)
├── middlewares/             # isAuthenticated, isAdmin, notFound y errorHandler
├── utils/                   # HttpError y permisos
└── types/                   # Tipos globales (req.user)
__tests__/                   # Tests unitarios
database/scripts/            # Seed de MongoDB
postman/                     # Colección de Postman
```

## Notas sobre TypeScript

El proyecto no se compila: Node (22.18 o superior) ejecuta los `.ts` directamente quitando los tipos. Eso implica tres reglas:

- **Los imports llevan la extensión `.ts`:** `import { HttpError } from "../utils/HttpError.ts"`.
- **No se usan `enum`:** en su lugar, arrays `as const` (`const ROLES = ["user", "admin"] as const`).
- **No se usan *parameter properties*** (`constructor(public status: number)`): los campos se declaran aparte.

La versión **JavaScript** ([`../javascript`](../javascript)) tiene exactamente la misma estructura: sin los tipos, con extensión `.js` y sin `tsconfig.json` ni `src/types/`. Compara el mismo archivo en las dos carpetas para ver qué añade TypeScript.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `Cannot find native binding` al ejecutar los tests | Borrar `node_modules` y `package-lock.json` y volver a hacer `npm install` |
| La API dice `Faltan variables de entorno: ...` | Rellenar esas variables en el `.env` (copia `.env.example`) |
| Desde el frontend no se guarda la cookie del token | `FRONTEND_URL` tiene que ser la dirección exacta del frontend, y el `fetch` necesita `credentials: "include"` |
| `Authentication failed` al conectar a Mongo | Se cambiaron las credenciales después del primer arranque: `docker compose down -v` |
| No aparecen los datos del seed | El volumen ya tenía datos: `docker compose down -v` |
| He cambiado mi rol a admin y sigue dando 403 | El rol va dentro del token: vuelve a hacer login |
