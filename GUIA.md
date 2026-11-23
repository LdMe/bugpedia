# Guía de Bugpedia para tu proyecto

Bugpedia es un proyecto de ejemplo completo, y tiene **más cosas de las que necesita tu proyecto**. Esta guía te ayuda a usarlo como referencia sin agobiarte.

> Hay dos versiones idénticas: [`javascript/`](./javascript) y [`typescript/`](./typescript). Esta guía usa los nombres de la versión JavaScript (`.js`); en la de TypeScript, los mismos archivos acaban en `.ts`.

Contenido:

1. [Qué es lo mínimo y qué es extra](#1-qué-es-lo-mínimo-y-qué-es-extra)
2. [En qué orden leer el proyecto](#2-en-qué-orden-leer-el-proyecto)
3. [Cómo adaptar Bugpedia a tu proyecto](#3-cómo-adaptar-bugpedia-a-tu-proyecto)
4. [Retos para ampliar](#4-retos-para-ampliar)

---

## 1. Qué es lo mínimo y qué es extra

- **Mínimo:** lo que pide el enunciado. Con esto tu proyecto está completo.
- **Recomendado:** lo que el enunciado recomienda o lo que usamos en el curso. Suma, y no es difícil.
- **Extra:** puedes ignorarlo sin ningún problema. Está para quien quiera ir más allá.

| Pieza | Nivel | Dónde está |
|---|---|---|
| Modelos con validaciones (`required`, `min`, `max`, `enum`...) | 🟢 Mínimo | `src/models/` |
| 3 entidades: 2 colecciones + subdocumentos embebidos o `populate` | 🟢 Mínimo | `User`, `Bug` y sus `solutions` |
| Registro y login con bcrypt y JWT | 🟢 Mínimo | `src/controllers/auth.controller.js` |
| Middleware de login y de admin | 🟢 Mínimo | `src/middlewares/auth.middleware.js` |
| Solo el autor o un admin pueden editar o borrar | 🟢 Mínimo | `src/utils/permissions.js` y los controladores |
| Rutas, controladores y modelos en carpetas | 🟢 Mínimo | `src/routes/`, `src/controllers/`, `src/models/` |
| Códigos de estado correctos y manejador de errores | 🟢 Mínimo | `src/middlewares/error.middleware.js` y `src/utils/HttpError.js` |
| Al menos 4 tests (middleware de admin + una función propia) | 🟢 Mínimo | `__tests__/isAdmin.test.js` y `__tests__/permissions.test.js` |
| README, `.env.example` y memoria | 🟢 Mínimo | Raíz del proyecto |
| Capa de repositorios | 🟡 Recomendado | `src/repositories/` |
| Filtro por query params (`?technology=react`) | 🟡 Recomendado | `getAll` en `bug.controller.js` |
| JSDoc en controladores y middlewares | 🟡 Recomendado | Los comentarios `/** */` de cada función (en JavaScript, `npm run docs` genera la web) |
| Colección de Postman | 🟡 Recomendado | `postman/` |
| MongoDB con Docker Compose | 🟡 Recomendado | `docker-compose.yml` |
| CORS (para que el frontend pueda llamar a la API) | 🟡 Recomendado | `src/index.js` |
| TypeScript | ⚪ Extra | La carpeta `typescript/` (el mismo proyecto, con tipos) |
| Variables de entorno validadas en un solo archivo | ⚪ Extra | `src/config/env.js` |
| Datos iniciales (seed) | ⚪ Extra | `database/scripts/01-seed.js` |
| Mongo Express | ⚪ Extra | `docker-compose.yml` |
| Swagger | ⚪ Extra | `src/docs/` y `src/config/swagger.js` |
| Token también por cookie, y logout | ⚪ Extra | `auth.controller.js` y `auth.middleware.js` |
| Tests de `isAuthenticated`, `errorHandler` y `logout` | ⚪ Extra | `__tests__/` |

---

## 2. En qué orden leer el proyecto

No leas los archivos por orden alfabético: sigue el camino que recorre una petición. Antes de empezar, arranca el proyecto (`docker compose up --build` dentro de `javascript/` o `typescript/`) y abre http://localhost:3000/docs para ver qué hace la API.

**Primera vuelta: el camino de `GET /api/bugs`**

1. **`src/index.js`:** el punto de entrada. Monta los middlewares globales (`cors`, `express.json`), las rutas en `/api` y, al final, los errores. Conecta a Mongo y arranca.
2. **`src/routes/router.js`:** el índice de las rutas: manda `/auth` a un archivo y `/bugs` a otro.
3. **`src/routes/bug.routes.js`:** cada línea es método + URL + middlewares + controlador. Fíjate en qué rutas llevan `isAuthenticated` y cuál lleva `isAdmin`.
4. **`src/controllers/bug.controller.js`, función `getAll`:** lee el query param, lo valida, pide los bugs al repositorio y responde.
5. **`src/repositories/bug.repository.js`, función `getBugs`:** la consulta de Mongoose: `find`, `sort` y `populate`.
6. **`src/models/bug.model.js`:** la forma de un bug, sus validaciones y sus soluciones embebidas.

**Segunda vuelta: crear y editar (`POST` y `PATCH /api/bugs`)**

7. **`src/middlewares/auth.middleware.js`:** cómo se comprueba el token y se rellena `req.user`.
8. **`bug.controller.js`, funciones `create` y `update`:** el autor sale del token, solo se aceptan ciertos campos y se comprueban los permisos.
9. **`src/utils/permissions.js`:** la regla "solo el autor o un admin".
10. **`src/utils/HttpError.js` y `src/middlewares/error.middleware.js`:** qué pasa cuando algo falla: el error se lanza y un solo middleware responde.

**Tercera vuelta: usuarios y soluciones**

11. **`src/controllers/auth.controller.js`**, con `user.repository.js` y `user.model.js`: registro, login (bcrypt y JWT) y el usuario actual.
12. **`src/controllers/solution.controller.js`:** trabajar con subdocumentos: `push`, `.id()` y `deleteOne()`.
13. **`__tests__/`:** empieza por `isAdmin.test.js`, que es el más corto.

**Lo extra, cuando lo demás esté claro:** `src/config/` (variables de entorno, conexión y Swagger), `src/docs/` (Swagger), `database/scripts/` (seed) y `docker-compose.yml`.

> Para cada archivo, intenta responder: **¿qué recibe, qué hace y qué devuelve?** Si puedes explicarlo con una frase, lo has entendido.

---

## 3. Cómo adaptar Bugpedia a tu proyecto

Ejemplo: quieres hacer un **recetario**. Una receta tiene ingredientes (embebidos, como las soluciones) y un autor (referenciado, como el de los bugs).

### Paso 1: diseña antes de copiar

Responde en papel, y te servirá también para la memoria:

- ¿Cuál es el recurso principal? → `Recipe`.
- ¿Qué va **embebido** (se lee siempre junto y no tiene sentido por sí solo)? → los ingredientes.
- ¿Qué va **referenciado** (existe por sí mismo)? → el autor (`User`).
- ¿Qué campos tiene y qué validaciones? → `title` obligatorio, `minutes` entre 1 y 600, `category` en una lista...
- ¿Quién puede hacer qué? → cualquiera ve, el autor edita y borra, el admin puede con todo.

### Paso 2: lo que puedes dejar tal cual

- `src/config/` (salvo las constantes)
- `src/middlewares/`
- `src/utils/`
- `src/types/` (solo en TypeScript)
- todo lo de usuarios: `user.model.js`, `user.repository.js`, `auth.controller.js` y `auth.routes.js`
- los tests de `isAdmin`, `isAuthenticated` y `permissions`

### Paso 3: lo que hay que cambiar, en este orden

1. **Constantes** (`config/constants.js`): cambia `TECHNOLOGIES` por tus valores (`CATEGORIES = ["entrante", "principal", "postre"] as const`).
2. **Modelo:** `bug.model.js` → `recipe.model.js`. Cambia las interfaces (`IBug` → `IRecipe`, `ISolution` → `IIngredient`), los campos y las validaciones.
3. **Repositorio:** `bug.repository.js` → `recipe.repository.js`. Renombra las funciones (`getRecipes`, `getRecipeById`...) y ajusta el filtro.
4. **Controladores:** `bug.controller.js` → `recipe.controller.js`. Cambia `EDITABLE_FIELDS`, los tipos del body y los mensajes. `solution.controller.js` → `ingredient.controller.js`.
5. **Rutas:** `bug.routes.js` → `recipe.routes.js`, y en `router.js`, `router.use("/recipes", recipeRouter)`.
6. **Test del `errorHandler`:** usa `BugModel` para provocar un error de validación; cámbialo por tu modelo.
7. **Extras (si los usas):** el seed, la colección de Postman y los YAML de Swagger. Si no te da tiempo, bórralos: son extra.
8. **README y memoria.**

> **Truco:** después de cada paso, arranca la API (en JavaScript) o ejecuta `npm run type-check` (en TypeScript). Los errores te dicen exactamente qué archivo se ha quedado con el nombre antiguo.

> **Si usas IA:** pídele cambios de uno en uno ("adapta este modelo a recetas con estos campos") y lee lo que te devuelve. Tienes que poder explicar cada línea en la presentación.

---

## 4. Retos para ampliar

Para cuando tengas lo mínimo funcionando. Elige hasta dónde quieres llegar.

### 🟢 Nivel 1: pequeños cambios

| Reto | Pista |
|---|---|
| Filtrar por peligrosidad mínima: `GET /api/bugs?minDanger=4` | En `getBugs`, un filtro `{ dangerLevel: { $gte: 4 } }`. Valida que sea un número del 1 al 5 |
| Bugs sin resolver: `?solved=false` | `{ solutions: { $size: 0 } }` |
| Ordenar por peligrosidad: `?sort=danger` | `.sort({ dangerLevel: -1 })` en el repositorio |
| "Mis bugs": `?author=<id>` | `{ author: id }`. Valida que sea un id válido con `Types.ObjectId.isValid` |
| Un test nuevo para `isTechnology` | Es una función pura: `expect(isTechnology("react")).toBe(true)` |

### 🟡 Nivel 2: una funcionalidad nueva

| Reto | Pista |
|---|---|
| Paginación: `?page=2&limit=10`, devolviendo también el total | `.skip((page - 1) * limit).limit(limit)` y `countDocuments(filtro)` |
| Búsqueda: `?search=cors` en el nombre y el mensaje de error | `$or` con dos `$regex` y la opción `"i"`. Ojo: escapa los caracteres especiales del texto (`(`, `.`, `*`...) |
| Votar soluciones (una vez por usuario) | Un campo `votes: [ObjectId]` en la solución y `solution.votes.addToSet(userId)`. No se puede votar la propia: `isOwner` |
| "A mí también me ha pasado" en un bug | Como los votos, pero en el bug. Para ordenar por los más sufridos, guarda también un contador |
| Editar una solución (solo su autor) | Igual que el `update` de bugs, sobre `bug.solutions.id(...)`. ¿Debería perder la verificación si cambia? |

### 🔴 Nivel 3: para ir más allá

| Reto | Pista |
|---|---|
| Tests de integración de las rutas | Separa la creación de la app (`app.js`) del `listen` (`index.js`) y usa `supertest` con `mongodb-memory-server` |
| Búsqueda con índice de texto | `bugSchema.index({ name: "text", errorMessage: "text" })` y `{ $text: { $search: "..." } }` |
| Limitar los intentos de login | `express-rate-limit` solo en `/auth/login` |
| Registro con código de invitación | Un `REGISTRATION_CODE` en el `.env` que se pide al registrarse (403 si no coincide) |
| "Mis soluciones" | Una agregación: `$unwind` de `solutions` y `$match` por `solutions.author.id` |
| Un frontend en React | Con `fetch(url, { credentials: "include" })`, el navegador envía la cookie del token solo |
