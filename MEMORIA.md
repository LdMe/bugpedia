# 🐛📖 Bugpedia — Memoria técnica

> **Bugpedia** es la enciclopedia de errores de la clase. Cuando alguien se encuentra un error de programación, lo registra como si fuera una criatura: le pone nombre ("El CORS Salvaje"), describe sus síntomas, indica lo peligroso que es y, si la conoce, deja la solución. El resto de la clase puede aportar más soluciones, y el profesor marca como **verificadas** las correctas.
>
> Es una API REST hecha con **Node.js, Express 5, MongoDB (Mongoose) y TypeScript** (con una versión equivalente en JavaScript), dockerizada junto con MongoDB y Mongo Express, documentada con Swagger y JSDoc, y pensada para servir de backend a un frontend en React y para durar varios cursos.
>
> Hay dos versiones con la misma estructura y el mismo comportamiento: [`typescript/`](./typescript) y [`javascript/`](./javascript). Esta memoria describe la de **TypeScript** (nombres de archivo `.ts` y ejemplos de código tipados). La de JavaScript es idéntica salvo los tipos: lo que solo aplica a TypeScript está indicado.
>
> Para usarla como referencia en otro proyecto (qué es imprescindible, en qué orden leerla y cómo adaptarla), ver la [guía](./GUIA.md).

---

## Índice

1. [Descripción de la API](#1-descripción-de-la-api)
2. [Por qué MongoDB](#2-por-qué-mongodb)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Arquitectura](#4-arquitectura)
5. [Seguridad](#5-seguridad)
6. [Endpoints](#6-endpoints)
7. [Testing](#7-testing)
8. [Documentación de la API y del código](#8-documentación-de-la-api-y-del-código)
9. [Entorno con Docker](#9-entorno-con-docker)
10. [Retos y soluciones](#10-retos-y-soluciones)
11. [Mejoras futuras](#11-mejoras-futuras)
12. [Anexo: correspondencia con los requisitos](#12-anexo-correspondencia-con-los-requisitos)

---

## 1. Descripción de la API

### 1.1. Qué problema resuelve

Cuando se aprende a programar, los mismos errores aparecen una y otra vez: el CORS que bloquea el `fetch`, el `undefined` que aparece de la nada, el puerto que ya está ocupado, el `git push` rechazado. Cada alumno los sufre por separado y la solución se pierde en un chat.

Bugpedia es un **catálogo compartido de errores con sus soluciones**:

- **Es útil:** antes de pedir ayuda, se busca el error en la Bugpedia. Con los cursos, el catálogo crece y sirve a las siguientes promociones.
- **Es divertida:** cada error es una "criatura" con nombre propio y un nivel de peligrosidad del 1 al 5.
- **Es colaborativa:** se puede registrar un error **aunque todavía no se sepa resolver**, y cualquiera puede aportar la solución después.

### 1.2. Usuarios y roles

| Rol | Quién | Qué puede hacer |
|---|---|---|
| Anónimo | Cualquiera, sin cuenta | Consultar los bugs y sus soluciones |
| `user` | Alumnos registrados | Registrar bugs, aportar soluciones, editar y borrar lo suyo |
| `admin` | El profesor | Todo lo anterior, verificar soluciones y editar o borrar cualquier contenido |

Nadie puede registrarse como admin: el primer admin lo crea el seed de la base de datos (ver [9.3](#93-datos-iniciales-seed)).

### 1.3. Entidades

| Entidad | Tipo | Descripción |
|---|---|---|
| `User` | Colección | Una persona registrada: credenciales y rol |
| `Bug` | Colección | Un error catalogado: nombre, mensaje de error, descripción, tecnologías, peligrosidad, autor |
| `Solution` | Subdocumentos **embebidos** en `Bug` | Una forma de resolver ese error, con su autor y su verificación |

---

## 2. Por qué MongoDB

### 2.1. Un bug es un documento

En MongoDB se guarda junto lo que se lee junto. Cuando alguien abre un bug quiere ver, de una vez, el error, sus tecnologías y sus soluciones. Todo eso es **un único documento**:

```json
{
  "_id": "674a1f...",
  "name": "El CORS Salvaje",
  "errorMessage": "Access to fetch at 'http://localhost:3000/api/bugs' ... has been blocked by CORS policy",
  "description": "El front no puede hablar con la API. En Postman funciona, pero en el navegador no.",
  "technologies": ["express", "react"],
  "dangerLevel": 4,
  "author": "6749c0...",
  "solutions": [
    {
      "_id": "674a20...",
      "text": "Instalar el paquete cors en la API y añadir app.use(cors()) antes de las rutas.",
      "author": { "id": "6749c1...", "username": "bea" },
      "verified": true,
      "createdAt": "2026-11-23T10:15:00.000Z"
    }
  ],
  "createdAt": "2026-11-23T09:50:00.000Z"
}
```

Se lee con una sola consulta (`findById`) y se escribe con una sola operación, que además es **atómica**: añadir una solución y guardar el bug no puede quedarse a medias.

### 2.2. Qué habría cambiado con SQL

El mismo modelo en una base de datos relacional necesitaría **cuatro tablas**:

```
users            (id, username, email, password_hash, role, created_at)
bugs             (id, author_id → users, name, error_message, description, code, danger_level, created_at)
bug_technologies (bug_id → bugs, technology)      ← un bug tiene varias tecnologías
solutions        (id, bug_id → bugs, author_id → users, text, code, verified, created_at)
```

Mostrar un bug completo requeriría JOINs (o varias consultas) y recomponer el resultado en el código. En MongoDB, la lista de tecnologías es un array y las soluciones van dentro del bug.

### 2.3. Lo que SQL haría mejor

- **Integridad referencial:** en SQL no puede existir un bug cuyo autor no existe. En MongoDB no hay claves foráneas y hay que cuidarlo desde el código.
- **Consultas "de lado":** "todas las soluciones que ha escrito este usuario" es trivial en SQL. En MongoDB, como las soluciones están dentro de cada bug, requeriría una agregación (`$unwind` + `$match`). En Bugpedia la consulta principal es "este bug con sus soluciones", no al revés, así que el diseño encaja.

### 2.4. Conceptos de MongoDB que aparecen en el proyecto

| Concepto | Dónde se usa |
|---|---|
| Documentos con arrays | `technologies` y `solutions` |
| Subdocumentos embebidos | `solutions` dentro de `Bug` |
| Referencias + `populate()` | `author` del bug → `User` |
| Referencia extendida (copiar campos) | `author: { id, username }` en cada solución |
| Consultas sobre arrays | `{ technologies: "react" }` encuentra los bugs que incluyen `react` |
| Validaciones del esquema | `required`, `minlength`, `maxlength`, `min`, `max`, `enum`, `match` y validadores propios |
| Índices únicos | `username` y `email` |
| Proyección | `select: false` en la contraseña |

---

## 3. Modelo de datos

### 3.1. Diagrama

```
┌─────────────────────┐            ┌──────────────────────────────────────────┐
│        User         │            │                   Bug                    │
├─────────────────────┤            ├──────────────────────────────────────────┤
│ _id                 │◄───────────┤ author: ObjectId (ref "User")  ◄ referencia
│ username            │   1     N  │ name                                     │
│ email               │            │ errorMessage?                            │
│ password (hash)     │            │ description                              │
│ role                │            │ code?                                    │
│ createdAt/updatedAt │            │ technologies: [String]                   │
└─────────────────────┘            │ dangerLevel: 1–5                         │
                                   │ solutions: [Solution]          ◄ embebido│
                                   │   ├ _id                                  │
                                   │   ├ text                                 │
                                   │   ├ code?                                │
                                   │   ├ author: { id, username }   ◄ copia   │
                                   │   ├ verified                             │
                                   │   └ createdAt/updatedAt                  │
                                   │ createdAt/updatedAt                      │
                                   └──────────────────────────────────────────┘
```

### 3.2. Constantes compartidas (`src/config/constants.ts`)

Los valores permitidos se definen **una sola vez** como arrays `as const`. El mismo array sirve como `enum` del esquema de Mongoose, para validar el query param `?technology=` y para la documentación de Swagger, y de él se deriva el tipo de TypeScript:

```ts
export const ROLES = ["user", "admin"] as const;
export type Role = typeof ROLES[number]; // "user" | "admin"

export const TECHNOLOGIES = [
  "javascript", "typescript", "html", "css", "react",
  "node", "express", "mongodb", "git", "vite", "other",
] as const;
export type Technology = typeof TECHNOLOGIES[number];
```

Se usan arrays `as const` en lugar de `enum` de TypeScript porque Node ejecuta los `.ts` quitando los tipos, y un `enum` genera código que no se puede quitar (ver [10.6](#106-typescript-sin-compilar)).

### 3.3. Esquema `User` (`src/models/user.model.ts`)

| Campo | Tipo | Validaciones | Notas |
|---|---|---|---|
| `username` | String | `required`, `unique`, `trim`, 3–20 caracteres | Nombre público |
| `email` | String | `required`, `unique`, `trim`, `lowercase`, `match` (formato email) | Para el login. Nunca se muestra a otros usuarios |
| `password` | String | `required`, `select: false` | Siempre el **hash** de bcrypt |
| `role` | String | `enum: ROLES`, `default: "user"` | |
| `createdAt`, `updatedAt` | Date | — | `timestamps: true` |

- La longitud mínima de la contraseña (8 caracteres) se comprueba en el **controlador**, antes de cifrarla: el esquema solo ve el hash, que siempre mide 60.
- El `toJSON` del esquema quita `password` y `__v` de cualquier respuesta.
- `unique` no es una validación sino un **índice** de MongoDB: un duplicado lo rechaza la base de datos (error `11000`), y el `errorHandler` lo traduce a un 409.

### 3.4. Esquema `Bug` (`src/models/bug.model.ts`)

| Campo | Tipo | Validaciones | Notas |
|---|---|---|---|
| `name` | String | `required`, `trim`, 3–60 caracteres | El nombre de criatura |
| `errorMessage` | String | opcional, `trim`, máx. 500 | El texto literal del error. Opcional: hay errores sin mensaje (un estilo que no se aplica) |
| `description` | String | `required`, `trim`, máx. 2000 | Qué pasa y cuándo |
| `code` | String | opcional, máx. 3000 | Fragmento de código donde aparece |
| `technologies` | [String] | cada valor en `TECHNOLOGIES`; al menos una (validador propio) | |
| `dangerLevel` | Number | `required`, `min: 1`, `max: 5` | Lo elige quien registra el bug |
| `author` | ObjectId | `required`, `ref: "User"` | **Referencia** |
| `solutions` | [Solution] | `default: []` | **Embebido**. Puede estar vacío: hay bugs aún sin resolver |
| `createdAt`, `updatedAt` | Date | — | `timestamps: true` |

Todas las validaciones llevan un mensaje propio (`required: [true, "El nombre es obligatorio"]`), que es el que llega al cliente en los `details` de un error 400.

### 3.5. Subesquema `Solution`

| Campo | Tipo | Validaciones | Notas |
|---|---|---|---|
| `_id` | ObjectId | automático | Permite referirse a una solución concreta en la URL |
| `text` | String | `required`, `trim`, máx. 2000 | La explicación |
| `code` | String | opcional, máx. 3000 | Código corregido |
| `author.id` | ObjectId | `required` | Id del autor (sin `ref`: no se hace `populate`) |
| `author.username` | String | `required` | Copia del nombre del autor |
| `verified` | Boolean | `default: false` | Solo lo cambia el admin |
| `createdAt`, `updatedAt` | Date | — | `timestamps: true` |

### 3.6. Embebido, referenciado o copiado: decisiones y motivos

| Dato | Decisión | Motivo |
|---|---|---|
| `Bug.solutions` | **Embebido** | Una solución solo tiene sentido dentro de su bug, se lee siempre con él y su número es pequeño. Así el bug completo se lee de una vez y añadir una solución es una escritura atómica. |
| `Bug.author` | **Referenciado** (`ref` + `populate`) | El usuario existe por sí mismo y es el dueño del bug. Se guarda solo su id y, al leer, `populate("author", "username")` trae su nombre. |
| `Solution.author` | **Copia** `{ id, username }` | Es el patrón *extended reference*: se guarda el id y se duplica el campo que se muestra. El nombre aparece junto a cada solución y no cambia (la API no permite cambiar el username), así que copiarlo evita un `populate` por solución. El `id` hace falta para los permisos: quién puede borrarla. |
| `User.bugs` | **No existe** | La relación ya está en `Bug.author`. Guardarla también en el usuario obligaría a mantener las dos sincronizadas. |

> **Referenciar frente a copiar.** Referenciar mantiene un único dato verdadero, a cambio de una consulta extra (`populate`). Copiar evita esa consulta, a cambio de que la copia pueda quedar desactualizada. Copiar compensa cuando el dato casi nunca cambia y se lee muchas veces.

### 3.7. Tipado de los modelos en TypeScript (solo en `typescript/`)

Cada modelo tiene tres piezas:

1. **La interfaz** (`IUser`, `IBug`, `ISolution`): la forma de los datos.
2. **El esquema tipado** (`new Schema<IUser>(...)`): TypeScript comprueba que el esquema encaja con la interfaz.
3. **El tipo del documento** (`UserDocument = HydratedDocument<IUser>`): los datos + `_id` + métodos como `save()`. Es lo que devuelven los repositorios.

En `Bug` hay una pieza más: en un documento de Mongoose, `solutions` no es un array normal sino un `DocumentArray`, con métodos como `.id()` para buscar una solución por su `_id`. Hay que decírselo a TypeScript con un tipo de *override* (`BugDocumentOverrides`); sin él, `bug.solutions.id(...)` no compila.

---

## 4. Arquitectura

### 4.1. Estructura de carpetas

La estructura es la de `typescript/`. La de `javascript/` es igual, con archivos `.js`, sin `tsconfig.json` ni `src/types/`, y con un `jsdoc.json` para generar la documentación del código.

```
typescript/
├── src/
│   ├── index.ts                    # Arranque: middlewares, rutas, Swagger, errores y conexión a Mongo
│   ├── config/
│   │   ├── env.ts                  # Lee y valida las variables de entorno (una sola vez)
│   │   ├── constants.ts            # Roles y tecnologías (+ el type guard isTechnology)
│   │   ├── db.ts                   # Conexión a MongoDB (buildMongoUri y connectDB)
│   │   └── swagger.ts              # Configuración de Swagger
│   ├── routes/
│   │   ├── router.ts               # Índice: monta /auth y /bugs, y /health
│   │   ├── auth.routes.ts
│   │   └── bug.routes.ts           # Bugs y soluciones
│   ├── docs/                       # Documentación Swagger (OpenAPI) en YAML
│   │   ├── auth.yaml
│   │   ├── bugs.yaml
│   │   └── components.yaml         # Esquemas, parámetros y respuestas reutilizables
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── bug.controller.ts
│   │   └── solution.controller.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   └── bug.repository.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   └── bug.model.ts            # Bug + Solution (subesquema)
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # isAuthenticated e isAdmin
│   │   └── error.middleware.ts     # notFound y errorHandler
│   ├── utils/
│   │   ├── HttpError.ts            # Error con código HTTP
│   │   └── permissions.ts          # isOwner e isOwnerOrAdmin
│   └── types/
│       └── express.d.ts            # Añade `user` al tipo Request de Express
├── __tests__/                      # Tests unitarios
├── database/scripts/01-seed.js     # Datos iniciales
├── postman/                        # Colección de Postman
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── tsconfig.json
├── vitest.config.ts                # Variables de entorno para los tests
├── package.json
└── README.md

(En la raíz del repositorio: README.md, GUIA.md y esta MEMORIA.md, comunes a las dos versiones)
```

### 4.2. Qué hace cada capa

| Capa | Responsabilidad | Qué **no** hace |
|---|---|---|
| **Rutas** | Asocian método + URL con middlewares y controlador. Leídas de arriba abajo, son el índice de la API. | Lógica |
| **Middlewares** | Se ejecutan antes del controlador (autenticación, rol) o al final (404 y errores). | Saber qué es un bug |
| **Controladores** | Leen la petición, comprueban los permisos sobre el recurso, deciden qué cambia y responden con el código de estado adecuado. | Escribir consultas a la base de datos |
| **Repositorios** | Son el **único sitio que habla con Mongoose**: `find`, `populate`, `select`, `save`, `deleteOne`. Ofrecen funciones con nombre claro (`getBugById`, `getUserByEmail`). | Saber nada de HTTP ni de permisos |
| **Modelos** | Definen la forma de los datos y sus validaciones. | Saber nada de HTTP |
| **Utils** | Funciones pequeñas y puras: permisos y la clase `HttpError`. | Efectos secundarios |

**Una regla para saber dónde va cada cosa:** el controlador decide **qué** cambia (por ejemplo, `bug.solutions.push(...)` sobre el documento que le ha dado el repositorio) y el repositorio sabe **cómo** se lee y se guarda (`saveBug(bug)`). Si mañana cambiara la base de datos, solo habría que tocar los repositorios.

**¿Y la capa de servicios?** En proyectos grandes suele haber una capa de servicios entre controladores y repositorios, con los casos de uso. En Bugpedia cada caso de uso son pocas líneas, así que ese papel lo hacen los controladores. Merecería la pena añadirla si un mismo caso de uso se llamara desde varios sitios.

### 4.3. Flujo de una petición

`PATCH /api/bugs/674a1f...` con `Authorization: Bearer eyJ...` y `{ "dangerLevel": 5 }`:

```
Petición
  │
  ▼
cors ─► express.json ─► router /api ─► bugRouter
  │
  ▼
isAuthenticated ──────────────────────────► 401 si no hay token (ni en la cabecera ni en la cookie) o no es válido
  │  req.user = { _id, role, username }
  ▼
bugController.update
  │  1. getBugById(id) ───────────────────► 400 si el id está mal formado · 404 si no existe
  │  2. isOwnerOrAdmin(req.user, bug.author) ► 403 si no es suyo ni es admin
  │  3. bug.set(campo, valor) solo con los campos permitidos
  │  4. saveBug(bug) ─────────────────────► 400 si no pasa las validaciones del esquema
  ▼
200 { data: bug actualizado }

Cualquier error lanzado en el camino ──► errorHandler ──► { error: "mensaje" }
```

### 4.4. Gestión de errores centralizada

Nadie responde errores por su cuenta. Los middlewares hacen `next(new HttpError(401, "..."))` y los controladores `throw new HttpError(404, "...")`. Un único middleware al final de la aplicación, `errorHandler`, decide la respuesta.

- **`HttpError`** (`src/utils/HttpError.ts`) es una clase que hereda de `Error` y añade el `status`.
- **Express 5** captura los errores de los controladores `async` y los pasa al `errorHandler`, así que los controladores no necesitan `try/catch`.
- **El `errorHandler`** es un middleware de **cuatro** parámetros (`err, req, res, next`), que es como Express reconoce los manejadores de errores. Va el último en `index.ts`, después de `notFound`.

| Error recibido | Respuesta |
|---|---|
| `HttpError` | Su status: `{ error: mensaje }` |
| Error de validación de Mongoose | 400: `{ error, details: { campo: mensaje } }` |
| Id mal formado (`CastError`, p. ej. `/api/bugs/patata`) | 400 |
| Clave duplicada (código `11000`: email o username repetido) | 409 |
| JSON mal escrito en el body | 400 |
| Cualquier otro | 500 genérico. El error real se muestra en la consola del servidor, nunca al cliente |

---

## 5. Seguridad

### 5.1. Registro

1. El cliente envía `username`, `email`, `password` y `passwordRepeat`.
2. Se comprueba que la contraseña tiene al menos 8 caracteres y que coincide con la repetición (400 si no).
3. La contraseña se cifra con **bcrypt** (10 rondas). La contraseña en claro no se guarda nunca.
4. Se crea el usuario con `role: "user"`. Aunque el body traiga `"role": "admin"`, no se usa.
5. Si el email o el username ya existen → **409**.
6. Respuesta **201** con el usuario, sin la contraseña.

### 5.2. Login

1. Se comprueba que `email` y `password` son **texto**. Si alguien enviara `{ "email": { "$ne": null } }`, MongoDB lo interpretaría como "cualquier email que no sea nulo" (**inyección NoSQL**) → 400.
2. Se busca el usuario pidiendo también la contraseña (`select("+password")`), que está oculta por defecto.
3. Se compara con `bcrypt.compare`.
4. Si el email no existe **o** la contraseña no coincide → **401** con el **mismo mensaje**, para no revelar qué emails están registrados.
5. Si todo es correcto, se firma un **JWT** y se entrega de dos formas: en el body, junto con el usuario, y en una cookie `httpOnly` (ver [5.4](#54-dos-formas-de-enviar-el-token-cabecera-o-cookie)).

### 5.3. El token (JWT)

```json
{ "_id": "6749c0...", "role": "user", "username": "ana", "iat": 1764000000, "exp": 1764086400 }
```

- Lleva el id, el rol y el nombre. El nombre hace falta para firmar las soluciones sin consultar la base de datos.
- Se firma con `JWT_SECRET` y caduca en 24 horas.
- Está **firmado, no cifrado**: cualquiera puede leer su contenido, pero nadie puede modificarlo sin el secreto. Por eso no lleva nada sensible.
- El rol va dentro del token: si se le cambia el rol a alguien, no se nota hasta su siguiente login. Es el precio de no consultar la base de datos en cada petición.

### 5.4. Dos formas de enviar el token: cabecera o cookie

La API acepta el token de dos formas, y las dos conviven:

- **Cabecera** `Authorization: Bearer <token>`: el cliente guarda el token que devuelve el login (en memoria o en `localStorage`) y lo añade a cada petición.
- **Cookie** `token`: el login la crea con `res.cookie(...)` y el navegador la guarda y la envía sola en cada petición a la API.

| | Token en la cabecera | Token en cookie `httpOnly` |
|---|---|---|
| Dónde se guarda | Lo guarda el frontend (memoria o `localStorage`) | Lo guarda el navegador; el JavaScript de la página no puede leerlo |
| Si hay XSS (JavaScript malicioso en la web) | Pueden robar el token | No pueden leerlo |
| CSRF (otra web hace peticiones en tu nombre) | No hay riesgo: nadie añade la cabecera por ti | Hay riesgo, porque el navegador envía la cookie solo. Se mitiga con `sameSite` |
| Trabajo en el frontend | Añadir la cabecera en cada `fetch` | `fetch(url, { credentials: "include" })` |
| Cerrar sesión | El frontend olvida el token | `POST /api/auth/logout`, que borra la cookie |

Opciones de la cookie (`TOKEN_COOKIE_OPTIONS` en `auth.controller.ts`):

- `httpOnly: true`: el JavaScript del navegador no puede leerla (protección frente a XSS).
- `sameSite: "strict"`: solo se envía en peticiones desde nuestra propia web (protección frente a CSRF). `localhost:5173` y `localhost:3000` cuentan como el mismo sitio.
- `secure`: solo en producción, porque obliga a usar HTTPS y en local no lo hay.
- `maxAge`: 24 horas, lo mismo que dura el token.

### 5.5. Middlewares de autenticación (`src/middlewares/auth.middleware.ts`)

- **`isAuthenticated`:** busca el token primero en la cabecera `Authorization` y, si no está, en la cookie (`req.cookies.token`, que rellena `cookie-parser`). Sin token → 401. Con token inválido o caducado → 401: `jwt.verify` **lanza** un error, así que va dentro de un `try/catch`; si no, acabaría como un 500. Con token válido, guarda `{ _id, role, username }` en `req.user`.
- **Si llegan los dos, manda la cabecera,** porque es la que se ha puesto a propósito en esa petición. La cookie se envía siempre, sea de quien sea el último login.
- **`isAdmin`:** va siempre después de `isAuthenticated`. Sin usuario → **401** ("no sé quién eres"); con usuario sin rol de admin → **403** ("sé quién eres, y no puedes").

Ninguno de los dos responde directamente: pasan el error con `next(error)` al `errorHandler`.

### 5.6. Permisos sobre los recursos

| Acción | Anónimo | User | Autor del recurso | Admin |
|---|:-:|:-:|:-:|:-:|
| Ver bugs y soluciones | ✅ | ✅ | ✅ | ✅ |
| Registrar un bug | ❌ 401 | ✅ | — | ✅ |
| Editar o borrar un bug | ❌ 401 | ❌ 403 | ✅ (el suyo) | ✅ (todos) |
| Añadir una solución | ❌ 401 | ✅ | ✅ (también a su propio bug) | ✅ |
| Borrar una solución | ❌ 401 | ❌ 403 | ✅ (la suya) | ✅ (todas) |
| Verificar una solución | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |

Hay dos tipos de permiso, y se comprueban en sitios distintos:

- **"Tienes que ser admin"** depende solo de quién eres → se comprueba **en la ruta**, con el middleware `isAdmin`.
- **"Tiene que ser tuyo"** depende del recurso, que hay que buscar primero → se comprueba **en el controlador**, con `isOwnerOrAdmin(req.user, bug.author)`.

El permiso para borrar una solución es sobre **la solución**: puede borrarla su autor o un admin, pero no el autor del bug.

Cuando el recurso existe pero no es tuyo se responde **403** y no 404, porque en Bugpedia todo es público para lectura y no tiene sentido fingir que no existe.

### 5.7. Campos que se pueden escribir

Nunca se pasa `req.body` directamente a Mongoose. Cada endpoint toma solo lo que admite:

| Endpoint | Campos aceptados | El resto |
|---|---|---|
| `POST /auth/register` | `username`, `email`, `password`, `passwordRepeat` | Se ignora (en especial `role`) |
| `POST /bugs` | `name`, `errorMessage`, `description`, `code`, `technologies`, `dangerLevel` | Se ignora. El `author` sale del token |
| `PATCH /bugs/:id` | Los mismos, solo los que lleguen | Se ignora (`author`, `solutions`...) |
| `POST /bugs/:id/solutions` | `text`, `code` | Se ignora. El autor sale del token y `verified` empieza en `false` |
| `PATCH .../verify` | `verified` (booleano) | — |

La edición se hace con buscar → comprobar permisos → `bug.set()` → `save()`, en lugar de `findByIdAndUpdate`, por dos motivos: hay que comprobar el autor **antes** de modificar, y `save()` ejecuta las validaciones del esquema.

### 5.8. Otras medidas

- **Datos que nunca salen de la API:** la contraseña (`select: false` y `toJSON`) y el email de los demás (`populate("author", "username")` trae solo el nombre).
- **Secretos en el `.env`:** `JWT_SECRET` y las credenciales de MongoDB nunca están en el código. El `.env` está en `.gitignore` y `.dockerignore`; al repositorio solo va `.env.example`.
- **Arranque seguro:** `src/config/env.ts` lee y valida todas las variables de entorno una sola vez, al arrancar. Si falta alguna obligatoria (`JWT_SECRET` o las de MongoDB), la API no arranca y dice cuáles faltan. El resto del código usa `env.JWT_SECRET`, ya tipado como `string`, en lugar de `process.env.JWT_SECRET`, que puede ser `undefined`.
- **CORS:** `cors({ origin: FRONTEND_URL, credentials: true })` permite que el frontend (por ejemplo, React en `localhost:5173`) llame a la API **con cookies**. Con `credentials: true`, el origen tiene que ser concreto: el navegador no acepta cookies de una API que permite cualquier origen (`*`).

---

## 6. Endpoints

**URL base:** `/api`. Todas las peticiones y respuestas son JSON.

**Formato de las respuestas:**
- **Éxito:** `{ "data": ... }`. El borrado de un bug devuelve `{ "message": "..." }`.
- **Error:** `{ "error": "mensaje" }`. Los de validación añaden `details` con el error de cada campo.

### 6.1. Resumen

| Método | Ruta | Acceso | Éxito | Errores |
|---|---|---|---|---|
| GET | `/health` | Público | 200 | — |
| POST | `/auth/register` | Público | 201 | 400, 409 |
| POST | `/auth/login` | Público | 200 | 400, 401 |
| POST | `/auth/logout` | Público | 200 | — |
| GET | `/auth/me` | Autenticado | 200 | 401, 404 |
| GET | `/bugs?technology=` | Público | 200 | 400 |
| GET | `/bugs/:id` | Público | 200 | 400, 404 |
| POST | `/bugs` | Autenticado | 201 | 400, 401 |
| PATCH | `/bugs/:id` | Autor o admin | 200 | 400, 401, 403, 404 |
| DELETE | `/bugs/:id` | Autor o admin | 200 | 400, 401, 403, 404 |
| POST | `/bugs/:id/solutions` | Autenticado | 201 | 400, 401, 404 |
| DELETE | `/bugs/:id/solutions/:solutionId` | Autor de la solución o admin | 200 | 400, 401, 403, 404 |
| PATCH | `/bugs/:id/solutions/:solutionId/verify` | **Admin** | 200 | 400, 401, 403, 404 |

La documentación completa de cada endpoint (cuerpos, respuestas y ejemplos) está en Swagger: http://localhost:3000/docs.

### 6.2. Auth

**`POST /api/auth/register`**

```json
// Petición
{ "username": "carla", "email": "carla@ejemplo.com", "password": "supersecreta", "passwordRepeat": "supersecreta" }

// 201
{ "data": { "_id": "674b...", "username": "carla", "email": "carla@ejemplo.com", "role": "user", "createdAt": "...", "updatedAt": "..." } }
```

**`POST /api/auth/login`**

```json
// Petición
{ "email": "ana@ejemplo.com", "password": "supersecreta" }

// 200 (y la cabecera Set-Cookie: token=eyJhbGciOi...; Path=/; HttpOnly; SameSite=Strict)
{ "data": { "token": "eyJhbGciOi...", "user": { "_id": "6749c0...", "username": "ana", "role": "user", "...": "..." } } }
```

**`POST /api/auth/logout`** → 200 `{ "message": "Sesión cerrada" }` y borra la cookie del token.

**`GET /api/auth/me`** → 200 `{ "data": usuario }`. Sirve para que el frontend recupere la sesión al recargar.

### 6.3. Bugs

**`GET /api/bugs?technology=react`** → 200 `{ "data": [bugs] }`, los más recientes primero, con el autor populado. `technology` es opcional; un valor que no está en la lista → 400.

**`GET /api/bugs/:id`** → 200 `{ "data": bug }` con el autor populado y sus soluciones.

**`POST /api/bugs`**

```json
// Petición
{
  "name": "El Puerto Okupa",
  "errorMessage": "Error: listen EADDRINUSE: address already in use :::3000",
  "description": "Al arrancar la API dice que el puerto 3000 está ocupado.",
  "technologies": ["node", "express"],
  "dangerLevel": 2
}

// 201
{ "data": { "_id": "674b00...", "name": "El Puerto Okupa", "author": { "_id": "6749c0...", "username": "ana" }, "solutions": [], "...": "..." } }
```

**Error de validación** (por ejemplo, `{ "name": "X", "technologies": ["cobol"], "dangerLevel": 9 }`):

```json
// 400
{
  "error": "Hay datos que no son válidos",
  "details": {
    "name": "El nombre debe tener al menos 3 caracteres",
    "description": "La descripción es obligatoria",
    "technologies.0": "La tecnología \"cobol\" no existe",
    "dangerLevel": "La peligrosidad máxima es 5"
  }
}
```

**`PATCH /api/bugs/:id`** → solo cambia los campos enviados. 200 `{ "data": bug }`.

**`DELETE /api/bugs/:id`** → 200 `{ "message": "Bug eliminado de la Bugpedia" }`. Se borran también sus soluciones, porque van dentro.

### 6.4. Soluciones

**`POST /api/bugs/:id/solutions`**

```json
// Petición
{ "text": "Busca el proceso que usa el puerto con lsof -i :3000 y ciérralo con kill -9 <PID>.", "code": "lsof -i :3000" }

// 201: el bug completo, con la nueva solución
{ "data": { "_id": "674b00...", "solutions": [ { "_id": "674b10...", "text": "...", "author": { "id": "6749c1...", "username": "bea" }, "verified": false } ], "...": "..." } }
```

Se devuelve el bug completo, y no solo la solución, para que el frontend pueda repintarlo con una sola respuesta.

**`DELETE /api/bugs/:id/solutions/:solutionId`** → 200 con el bug actualizado.

**`PATCH /api/bugs/:id/solutions/:solutionId/verify`** con `{ "verified": true }` → 200 con el bug actualizado. Con `false` se quita la verificación; si no es un booleano → 400.

### 6.5. Uso de los códigos de estado

| Código | Cuándo |
|---|---|
| **200** | Lecturas, ediciones, borrados, verificaciones |
| **201** | Registro, nuevo bug, nueva solución |
| **400** | Datos no válidos, id mal formado, JSON mal escrito, tecnología que no existe |
| **401** | No sabemos quién eres: sin token, token inválido o caducado, login incorrecto |
| **403** | Sabemos quién eres, pero no puedes: el recurso no es tuyo, o la ruta es solo para admin |
| **404** | Lo que buscas no existe (bug, solución, usuario o ruta) |
| **409** | Email o username ya registrados |
| **500** | Fallo del servidor |

---

## 7. Testing

### 7.1. Qué se prueba y por qué

Hay **24 tests unitarios con Vitest** que **no necesitan base de datos**: prueban piezas que solo reciben datos y devuelven datos.

| Archivo | Qué prueba | Tests | Por qué |
|---|---|---|---|
| `isAuthenticated.test.ts` | Con la cabecera: sin token, sin `Bearer`, token de otro secreto, caducado, texto que no es un token, token válido. Con la cookie: válido, falso, y que manda la cabecera si llegan los dos | 9 | Es la puerta de toda la parte privada de la API |
| `isAdmin.test.ts` | Sin usuario (401), user (403), admin (pasa), que nunca responde él mismo | 4 | Es el middleware de autorización que pide el enunciado: un fallo aquí deja entrar a cualquiera en las rutas de admin |
| `permissions.test.ts` | El autor puede, otro no, el admin sí; con el id como `ObjectId` y como string | 4 | Es la regla que decide quién edita y borra |
| `errorHandler.test.ts` | `HttpError`, validación de Mongoose, id mal formado, duplicado, JSON mal escrito y error genérico | 6 | Todas las respuestas de error de la API pasan por aquí |
| `logout.test.ts` | Que borra la cookie del token | 1 | Es un controlador que no toca la base de datos, así que se puede probar igual que un middleware |

### 7.2. Cómo se prueba un middleware sin servidor

En `__tests__/helpers.ts`:

- `req` es un objeto con lo que necesita el middleware: `{ headers: {...}, cookies: {...}, user: ... }`.
- `res` y `next` son `vi.fn()`: funciones falsas que **recuerdan** con qué argumentos se las llamó.
- `next.mock.calls[0][0]` es el error que el middleware ha pasado a `next`.
- `expect(next).toHaveBeenCalledWith()`, sin argumentos, significa "ha dejado pasar sin error".

Los tokens de `isAuthenticated` se firman de verdad con `jwt.sign`. Las variables de entorno de los tests (el `JWT_SECRET` de prueba y unas de MongoDB que no se usan) están en `vitest.config.ts`, para que `config/env.ts` no falle aunque no haya `.env`. El error de validación del `errorHandler` se consigue con `new BugModel({...}).validate()`: Mongoose valida en memoria, sin conectar a la base de datos.

```bash
npm test                # modo watch
npm run test:run        # una vez
npm run test:coverage   # con cobertura
```

### 7.3. Qué no se prueba con tests unitarios

Los **controladores y los repositorios** dependen de la base de datos. Se prueban de forma manual con la **colección de Postman** (40 peticiones que recorren todos los casos, incluidos los errores) y con **Swagger**. Automatizarlo con tests de integración queda como [mejora futura](#11-mejoras-futuras).

---

## 8. Documentación de la API y del código

### 8.1. Swagger (OpenAPI)

La documentación interactiva está en **http://localhost:3000/docs**. Muestra todos los endpoints con sus parámetros, cuerpos, respuestas y ejemplos, y permite probarlos desde el navegador. Para las rutas protegidas basta con hacer login desde la propia página: el navegador guarda la cookie y la envía sola. También se puede copiar el token y pegarlo en **Authorize** (cabecera).

- La documentación está escrita en **YAML**, el formato propio de OpenAPI, en `src/docs/`: `auth.yaml` y `bugs.yaml` (los endpoints) y `components.yaml` (esquemas, parámetros y respuestas de error reutilizables, enlazados con `$ref`).
- Está **fuera del código** a propósito: así los archivos de rutas se leen de un vistazo. A cambio, hay que acordarse de actualizar el YAML cuando cambia una ruta.
- **`swagger-jsdoc`** junta los YAML con la configuración de `src/config/swagger.ts` en un único documento OpenAPI, y **`swagger-ui-express`** lo sirve como una web en `/docs`.
- El esquema `Technology` se genera en `swagger.ts` a partir de `TECHNOLOGIES`: la lista de tecnologías sigue escrita una sola vez.
- Por defecto todas las rutas piden token (`security: [{ bearerAuth: [] }]`); las públicas lo anulan con `security: []`.

### 8.2. JSDoc

Los controladores, repositorios, middlewares y utilidades están documentados con comentarios JSDoc: qué hace cada función, sus parámetros (`@param`), lo que devuelve (`@returns`), los errores que lanza (`@throws`) y, en algunas, un ejemplo (`@example`). El editor los muestra al pasar el ratón por encima de la función, en cualquier archivo que la use.

En TypeScript no se escriben los tipos entre llaves (`@param {string} id`), porque ya están en el código: `@param id - El _id del bug`. En la versión JavaScript sí se escriben, porque son la única información de tipos que hay.

En la versión **JavaScript**, `npm run docs` genera una web con toda la documentación del código en la carpeta `jsdoc/` (configuración en `jsdoc.json`, como en el temario). En la versión TypeScript no se genera (ver [10.10](#1010-generar-html-a-partir-del-jsdoc)).

### 8.3. Postman

`postman/Bugpedia.postman_collection.json` tiene 40 peticiones organizadas en carpetas (Auth, Bugs, Soluciones, Limpieza). Los tokens de ana, bea y el profe, y los ids del bug y la solución creados, se guardan solos en variables de la colección, así que se puede ejecutar en orden sin copiar nada a mano. Postman también guarda la cookie del login, así que hay peticiones que prueban el token por cookie y el logout; las de "sin token" tienen las cookies desactivadas.

---

## 9. Entorno con Docker

### 9.1. Servicios (`docker-compose.yml`)

| Servicio | Imagen | Para qué | Puerto |
|---|---|---|---|
| `app` | La del `Dockerfile` (`node:24-slim`) | La API, con `node --watch` | `APP_PORT` (3000) |
| `mongo` | `mongo:8` | La base de datos, con un usuario root | `MONGO_PORT` (27017) |
| `mongo-express` | `mongo-express` | Ver y editar los datos desde el navegador | `MONGO_EXPRESS_PORT` (8081) |

- **Todo sale del `.env`:** nombres de contenedor, puertos y credenciales.
- **La API se conecta a Mongo por su nombre de contenedor** (`MONGO_HOST`): dentro de la red de Docker, los contenedores se encuentran por su nombre, no por `localhost`.
- **`healthcheck` + `depends_on: condition: service_healthy`:** la API no arranca hasta que MongoDB responde.
- **Volumen `mongo_data`:** los datos sobreviven a `docker compose down`. Con `down -v` se borran.
- **El código se monta como volumen** (`.:/app`), así que los cambios se ven sin reconstruir la imagen. `/app/node_modules` se queda con el del contenedor (Linux), para que los paquetes con partes nativas, como `bcrypt`, funcionen aunque el ordenador sea Windows o Mac.
- **Node 24** en la imagen, porque ejecutar archivos `.ts` directamente requiere Node 22.18 o superior.

### 9.2. Conexión (`src/config/db.ts`)

`buildMongoUri` construye la cadena de conexión a partir de las variables `MONGO_*` (ya validadas en `env.ts`), codificando usuario y contraseña con `encodeURIComponent` por si tienen caracteres especiales. `connectDB` conecta una sola vez al arrancar (`await connectDB()` en `index.ts`, antes de `app.listen`) y, si no puede, detiene la aplicación con un mensaje claro.

### 9.3. Datos iniciales (seed)

`database/scripts/01-seed.js` se monta en `/docker-entrypoint-initdb.d`, y MongoDB lo ejecuta **solo la primera vez** que arranca con el volumen vacío. Carga:

- **4 usuarios** con la contraseña `supersecreta`: el profe (**admin**), ana, bea y carlos.
- **7 bugs** con soluciones verificadas, sin verificar y dos sin ninguna solución todavía.

El script lo ejecuta `mongosh`, que no tiene bcrypt, así que las contraseñas se guardan ya cifradas: es el hash de "supersecreta". Para volver a cargarlo: `docker compose down -v && docker compose up --build`.

---

## 10. Retos y soluciones

### 10.1. El token se firmaba con `id` y se leía `_id`

**Problema:** el login firmaba el token con `{ id, role }` y el middleware leía `payload._id`. `req.user._id` era siempre `undefined`, y ninguna comprobación de "este bug es tuyo" habría funcionado. TypeScript no lo detectó, porque `jwt.verify` devuelve un objeto sin tipo y nosotros le decíamos con `as` qué forma tenía.

**Solución:** el contenido del token es ahora del tipo `AuthUser` (`{ _id, role, username }`) tanto al firmarlo como al leerlo, y hay tests de `isAuthenticated` que comprueban que `req.user` se rellena con esos campos.

### 10.2. Un token inválido devolvía un 500

**Problema:** `jwt.verify` **lanza** un error si el token es falso o ha caducado. Sin capturarlo, Express lo trataba como un error del servidor.

**Solución:** `try/catch` alrededor de `jwt.verify` y `next(new HttpError(401, ...))` en el `catch`. Está cubierto por tres tests (otro secreto, caducado, texto que no es un token).

### 10.3. Comprobar el autor de un bug "populado"

**Problema:** con `populate`, `bug.author` deja de ser un id y pasa a ser un objeto `{ _id, username }`. Comparar ese objeto con el id del usuario no funciona.

**Solución:** dos funciones en el repositorio. `getBugByIdWithAuthor` (con `populate`) para **mostrar**, y `getBugById` (sin `populate`) para **comprobar permisos y modificar**. Tras guardar, `saveBug` rellena el autor para la respuesta.

### 10.4. Mostrar el autor de cada solución sin `populate`

**Problema:** con una referencia, mostrar un bug con 5 soluciones obligaría a buscar el nombre de cada autor.

**Solución:** cada solución guarda una copia `{ id, username }` de su autor (patrón *extended reference*). El nombre viene en el token, así que al crear la solución tampoco hace falta consultar la base de datos. La copia no se puede desactualizar porque la API no permite cambiar el username.

### 10.5. La longitud de la contraseña

**Problema:** un `minlength: 8` en el esquema no sirve de nada: el esquema solo ve el hash de bcrypt, que siempre mide 60 caracteres.

**Solución:** la longitud mínima se comprueba en el controlador, antes de cifrar.

### 10.6. TypeScript sin compilar (solo en `typescript/`)

**Problema:** se quería usar TypeScript sin configurar compiladores. La configuración inicial (`module: "CommonJS"`, compilar a `dist/`) no encajaba con un proyecto ESM (`"type": "module"`) que importa archivos `.ts`: la comprobación de tipos fallaba y el código compilado no habría funcionado. Además, la imagen de Docker usaba Node 20, que no ejecuta `.ts`.

**Solución:** Node (22.18 o superior) ejecuta los `.ts` directamente quitando los tipos, y TypeScript solo se usa para comprobarlos (`npm run type-check`, con `noEmit`). Imagen `node:24-slim`. A cambio, tres reglas que el `tsconfig` vigila (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`): imports con `.ts`, nada de `enum` y nada de *parameter properties*.

### 10.7. `bug.solutions.id()` no compilaba (solo en `typescript/`)

**Problema:** con la interfaz `IBug`, TypeScript ve `solutions` como un array normal (`ISolution[]`), sin el método `.id()` que tienen los arrays de subdocumentos de Mongoose.

**Solución:** un tipo de *override* (`BugDocumentOverrides`) que le indica a TypeScript que, en un documento, `solutions` es un `Types.DocumentArray<ISolution>`. Es el patrón que recomienda la documentación de Mongoose.

### 10.8. Las contraseñas del seed

**Problema:** el seed lo ejecuta `mongosh` dentro del contenedor de Mongo, donde no hay bcrypt.

**Solución:** se guarda directamente el hash de "supersecreta", generado una vez con `bcrypt.hash`. Se comprobó que `bcrypt.compare("supersecreta", hash)` devuelve `true` y que cada documento del seed pasa las validaciones de los esquemas.

### 10.9. Mongoose 9 y los hooks `pre`

**Problema:** el patrón habitual de cifrar la contraseña en un hook `pre("save", function (next) { ... next() })` ya no funciona en Mongoose 9, que eliminó el `next` de los hooks `pre`.

**Solución:** Bugpedia cifra la contraseña en el controlador, a la vista. Si se usara un hook, debería ser una función `async` sin `next`.

### 10.10. Generar HTML a partir del JSDoc

**Problema:** el paquete `jsdoc` no entiende la sintaxis de TypeScript, y TypeDoc (su equivalente para TypeScript) todavía no es compatible con TypeScript 7.

**Solución:** los comentarios JSDoc se mantienen completos, porque su valor principal está en el editor, y la documentación navegable de la API la da Swagger. En la versión JavaScript sí se genera el HTML con `jsdoc` (`npm run docs`).

### 10.11. La cookie de Postman se colaba en todas las peticiones

**Problema:** al añadir el token por cookie, Postman guarda la cookie del último login y la envía en todas las peticiones. Las de "sin token → 401" dejaron de dar 401, y si mandara la cookie, una petición con el token de bea en la cabecera actuaría como el último usuario que hizo login.

**Solución:** en `isAuthenticated` manda la cabecera sobre la cookie (y hay un test que lo comprueba), y en Postman las peticiones "sin token" tienen las cookies desactivadas.

---

## 11. Mejoras futuras

Muchas de estas mejoras están planteadas como ejercicios, con pistas y por niveles, en la [guía](./GUIA.md#4-retos-para-ampliar).

- **Votos en las soluciones** y **"a mí también me ha pasado"** en los bugs: arrays de ids de usuario con `$addToSet` (un voto por persona) y la regla "no puedes votar lo tuyo".
- **Búsqueda de texto** por nombre y mensaje de error, con un índice de texto (`$text`).
- **Paginación y ordenación** del listado (`?page=&limit=&sort=`).
- **Más filtros:** por peligrosidad, por autor ("mis bugs") y bugs sin resolver.
- **Registro con código de invitación**, para poder publicar la API sin que se registre cualquiera.
- **Editar soluciones**, decidiendo qué pasa con su verificación si cambian.
- **Seguridad:** limitar los intentos de login (`express-rate-limit`), cabeceras con `helmet` y comprobar en `isAuthenticated` que el usuario sigue existiendo.
- **Cookies en producción:** con el frontend y la API en dominios distintos, `sameSite: "strict"` no deja pasar la cookie. Habría que usar `sameSite: "none"` con `secure`, y entonces añadir protección CSRF (por ejemplo, un token CSRF en cada petición que modifique datos).
- **Tests de integración** con Supertest y `mongodb-memory-server`, para probar controladores y repositorios automáticamente.
- **Frontend en React** que consuma la API.

---

## 12. Anexo: correspondencia con los requisitos

| Requisito | Dónde se cumple |
|---|---|
| README con instalación, `.env.example`, arranque y tests | `README.md`, `.env.example` |
| Memoria | Este documento |
| MongoDB + Mongoose con validaciones (`required`, `enum`, `min`/`max`...) | [3.3](#33-esquema-user-srcmodelsusermodelts) – [3.5](#35-subesquema-solution) |
| ≥ 3 entidades, ≥ 2 colecciones | `User` y `Bug` (colecciones), `Solution` (embebida) |
| Relación con `ObjectId` + `populate()` y subdocumentos embebidos | `Bug.author` → `User`; `Bug.solutions` |
| Registro y login con bcrypt y JWT | [5.1](#51-registro) – [5.3](#53-el-token-jwt) |
| Roles `user` y `admin` en el usuario, y un middleware que restringe rutas a admin | `User.role`; `isAdmin` en `PATCH .../verify` |
| Un usuario solo modifica o borra lo suyo; el admin, todo | `isOwnerOrAdmin` en la edición y el borrado de bugs y soluciones |
| ≥ 3 endpoints además de login y registro, ≥ 2 que modifican la BD | 10 endpoints, 6 de escritura sobre la base de datos |
| Rutas, controladores y modelos separados en carpetas | [4.1](#41-estructura-de-carpetas), más la capa de repositorios |
| Códigos 200, 201, 400, 401, 403 y 404, y manejador de errores centralizado | [4.4](#44-gestión-de-errores-centralizada), [6.5](#65-uso-de-los-códigos-de-estado) |
| ≥ 4 tests unitarios sin BD (middleware de autorización + función propia) | 24 tests: `isAdmin`, `isAuthenticated`, `isOwnerOrAdmin`, `errorHandler` y `logout` |
| *Recomendado:* filtrado por query params | `GET /bugs?technology=` |
| *Recomendado:* JSDoc en controladores, servicios y middlewares | Controladores, repositorios, middlewares y utilidades ([8.2](#82-jsdoc)); en JavaScript, `npm run docs` genera la web |
| *Recomendado:* colección de Postman | `postman/` ([8.3](#83-postman)) |
| *Bonus:* Swagger / OpenAPI | `/docs` y `src/docs/` ([8.1](#81-swagger-openapi)) |
