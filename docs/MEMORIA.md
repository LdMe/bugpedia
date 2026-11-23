# 🐛📖 Bugpedia — Memoria técnica

> **Bugpedia** es la enciclopedia de errores de la clase. Cuando alguien se encuentra un error de programación, lo registra como si fuera una criatura: le pone nombre ("El CORS Salvaje"), describe sus síntomas, indica lo peligroso que es y, si la conoce, deja la solución. El resto de la clase puede aportar más soluciones, votar las que le han funcionado y decir "a mí también me ha pasado". El profesor marca como **verificadas** las soluciones correctas.
>
> Es una API REST hecha con **Node.js, Express 5, MongoDB (Mongoose) y TypeScript**, pensada para durar varios cursos y para servir de backend a un frontend en React.

---

## Índice

1. [Descripción de la API](#1-descripción-de-la-api)
2. [Por qué MongoDB](#2-por-qué-mongodb)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Reglas de negocio](#4-reglas-de-negocio)
5. [Arquitectura](#5-arquitectura)
6. [Seguridad](#6-seguridad)
7. [Endpoints](#7-endpoints)
8. [Gestión de errores](#8-gestión-de-errores)
9. [Testing](#9-testing)
10. [Retos y soluciones](#10-retos-y-soluciones)
11. [Mejoras futuras](#11-mejoras-futuras)
12. [Plan de implementación](#12-plan-de-implementación)
13. [Anexo A: configuración, scripts y TypeScript](#anexo-a-configuración-scripts-y-typescript)
14. [Anexo B: correspondencia con los requisitos](#anexo-b-correspondencia-con-los-requisitos)

---

## 1. Descripción de la API

### 1.1. Qué problema resuelve

Cuando se aprende a programar, los mismos errores aparecen una y otra vez: el CORS que bloquea el `fetch`, el `undefined` que aparece de la nada, el puerto que ya está ocupado, el `git push` rechazado. Cada alumno los sufre por separado y la solución se pierde en un chat o en la memoria de alguien.

Bugpedia es un **catálogo compartido de errores con sus soluciones**:

- **Es útil:** antes de pedir ayuda, se busca el mensaje de error en la Bugpedia. Con los cursos, el catálogo crece y sirve a las siguientes promociones.
- **Es divertida:** cada error es una "criatura" con nombre propio y un nivel de peligrosidad, del 🐜 *Inofensivo* al 🐉 *Legendario*.
- **Es colaborativa:** se puede registrar un error **aunque todavía no se sepa resolver**. Esos errores quedan como "se busca" hasta que alguien aporta una solución.

### 1.2. Usuarios y roles

| Rol | Quién | Qué puede hacer |
|---|---|---|
| Anónimo | Cualquiera, sin cuenta | Consultar y buscar errores |
| `user` | Alumnos registrados | Registrar errores, aportar soluciones, votar, decir "a mí también" |
| `admin` | El profesor | Todo lo anterior, más verificar soluciones y moderar (editar o borrar cualquier contenido) |

Para registrarse hace falta un **código de registro** que el profesor da en clase. Así, aunque la API esté publicada en Internet, no se puede registrar cualquiera.

### 1.3. Entidades

| Entidad | Tipo | Descripción |
|---|---|---|
| `User` | Colección | Una persona registrada: credenciales y rol |
| `Bug` | Colección | Un error catalogado: nombre, mensaje, descripción, tecnologías, peligrosidad... |
| `Solution` | Subdocumento **embebido** en `Bug` | Una forma de resolver ese error, con sus votos y su verificación |

---

## 2. Por qué MongoDB

### 2.1. Un error es un documento

En MongoDB se guarda junto lo que se lee junto. Cuando alguien abre un error en la Bugpedia quiere ver, de una vez, el error, sus tecnologías, sus soluciones y cuánta gente lo ha sufrido. Todo eso es **un único documento**:

```json
{
  "_id": "674a1f...",
  "name": "El CORS Salvaje",
  "errorMessage": "Access to fetch at 'http://localhost:3000/api/bugs' from origin 'http://localhost:5173' has been blocked by CORS policy",
  "description": "El front no puede hablar con la API. En Postman funciona, pero en el navegador no.",
  "technologies": ["express", "react"],
  "dangerLevel": 4,
  "author": "6749c0...",
  "sightings": ["6749c1...", "6749c2...", "6749c3..."],
  "sightingsCount": 3,
  "solutions": [
    {
      "_id": "674a20...",
      "text": "Instalar el paquete cors en la API y añadir app.use(cors({ origin: 'http://localhost:5173' })).",
      "author": { "id": "6749c1...", "username": "bea" },
      "votes": ["6749c0...", "6749c2..."],
      "verified": true,
      "createdAt": "2026-11-23T10:15:00.000Z"
    }
  ],
  "createdAt": "2026-11-23T09:50:00.000Z",
  "updatedAt": "2026-11-23T10:15:00.000Z"
}
```

Se lee con una sola consulta (`findById`) y se escribe con una sola operación. Fíjate en los dos `author`: el del error es una **referencia** (solo el id; el nombre se trae con `populate`), mientras que el de la solución es una **copia embebida** del id y el nombre. Son las dos formas de relacionar datos en MongoDB, y en la [sección 3.7](#37-embebido-o-referenciado-decisiones-y-motivos) se explica por qué cada una está donde está.

### 2.2. Qué habría cambiado con SQL

El mismo modelo en una base de datos relacional necesitaría **seis tablas**:

```
users            (id, username, email, password_hash, role, created_at)
bugs             (id, author_id → users, name, error_message, description, code, danger_level, created_at)
bug_technologies (bug_id → bugs, technology)                      ← un error tiene varias tecnologías
bug_sightings    (bug_id → bugs, user_id → users)                 ← "a mí también"
solutions        (id, bug_id → bugs, author_id → users, text, code, verified, created_at)
solution_votes   (solution_id → solutions, user_id → users)       ← votos
```

Mostrar un error completo requeriría varios JOINs (o varias consultas) y recomponer el resultado en el código. En MongoDB, las listas que en SQL serían tablas intermedias (tecnologías, avistamientos, votos) son simplemente **arrays dentro del documento**.

### 2.3. Lo que SQL haría mejor (siendo honestos)

- **Integridad referencial:** en SQL no puede existir una solución cuyo autor no existe. En MongoDB no hay claves foráneas y hay que cuidarlo desde el código.
- **Consultas "de lado":** "dame todas las soluciones que ha escrito este usuario" es trivial en SQL (`SELECT * FROM solutions WHERE author_id = ?`). En MongoDB, como las soluciones están dentro de cada error, hay que buscar los errores que las contienen o usar una agregación. Para Bugpedia no es un problema, porque la consulta principal es "dame este error con sus soluciones", no al revés.

**Conclusión:** el acceso a los datos de Bugpedia se centra en el error (se lee, se busca y se muestra el error con todo lo suyo), y por eso MongoDB encaja de forma natural.

### 2.4. Conceptos de MongoDB que aparecen en el proyecto

| Concepto | Dónde se usa |
|---|---|
| Documentos con arrays | `technologies`, `sightings`, `solutions`, `votes` |
| Subdocumentos embebidos | `solutions` dentro de `Bug` |
| Referencias + `populate()` | `author` del error → `User` |
| Copia de datos (desnormalización) | `author: { id, username }` dentro de cada solución |
| Consultas sobre arrays | `{ technologies: 'react' }` encuentra los errores que incluyen `react` |
| Notación de punto | `{ 'solutions.verified': true }`: errores con alguna solución verificada |
| Existencia de posiciones | `{ 'solutions.0': { $exists: true } }`: errores con al menos una solución |
| `$addToSet` / `$pull` | Votar y "a mí también": añadir o quitar un id sin duplicados |
| Expresiones regulares | Búsqueda de texto sin distinguir mayúsculas |
| Índices | Sobre `technologies`, `author`, `createdAt` y `sightingsCount`, para filtrar y ordenar rápido |

---

## 3. Modelo de datos

### 3.1. Diagrama

```
┌─────────────────────┐          ┌──────────────────────────────────────────┐
│        User         │          │                   Bug                    │
├─────────────────────┤          ├──────────────────────────────────────────┤
│ _id                 │◄─────────┤ author: ObjectId (ref 'User')            │
│ username            │  1    N  │ name                                     │
│ email               │          │ errorMessage?                            │
│ password (hash)     │          │ description                              │
│ role                │          │ code?                                    │
│ createdAt/updatedAt │          │ technologies: [String]                   │
└─────────────────────┘          │ dangerLevel: 1–5                         │
                                 │ sightings: [ObjectId]  (ids de usuario)  │
                                 │ sightingsCount                           │
                                 │ solutions: [Solution] ◄── embebido       │
                                 │   ├ _id                                  │
                                 │   ├ author: { id, username } ◄── copia   │
                                 │   ├ text                                 │
                                 │   ├ code?                                │
                                 │   ├ votes: [ObjectId]  (ids de usuario)  │
                                 │   ├ verified                             │
                                 │   └ createdAt/updatedAt                  │
                                 │ createdAt/updatedAt                      │
                                 └──────────────────────────────────────────┘
```

La única relación "de verdad" (con `ref` y `populate`) es la del autor del error. El autor de cada solución va copiado dentro de ella, y los votos y avistamientos son simples listas de ids.

### 3.2. Constantes compartidas

Los valores permitidos se definen **una sola vez** en `src/config/constants.ts`. El mismo array sirve como `enum` de Mongoose, para validar los query params, para el endpoint `/api/meta` (que alimenta los `<select>` del frontend) y para derivar los tipos de TypeScript.

```ts
export const ROLES = ['user', 'admin'] as const;

export const TECHNOLOGIES = [
  'javascript', 'typescript', 'html', 'css', 'react',
  'node', 'express', 'mongodb', 'git', 'vite', 'other',
] as const;

export const DANGER_LEVELS = [
  { value: 1, label: 'Inofensivo', emoji: '🐜' },
  { value: 2, label: 'Molesto', emoji: '🦟' },
  { value: 3, label: 'Peligroso', emoji: '🐍' },
  { value: 4, label: 'Temible', emoji: '🦂' },
  { value: 5, label: 'Legendario', emoji: '🐉' },
] as const;

export const SORT_OPTIONS = ['recent', 'sightings', 'danger'] as const;

export const PAGINATION = { defaultLimit: 10, maxLimit: 50 } as const;

export type Role = typeof ROLES[number];             // 'user' | 'admin'
export type Technology = typeof TECHNOLOGIES[number];
export type SortOption = typeof SORT_OPTIONS[number];
```

> Añadir una tecnología nueva en un curso futuro es añadir una palabra a `TECHNOLOGIES`. El esquema, la validación de filtros y el frontend (vía `/api/meta`) se actualizan solos.

### 3.3. Esquema `User`

| Campo | Tipo | Validaciones | Notas |
|---|---|---|---|
| `username` | String | `required`, `unique`, `trim`, 3–20 caracteres | Nombre público. Es lo único que se muestra de otros usuarios |
| `email` | String | `required`, `unique`, `trim`, `lowercase`, formato email | Se usa para el login. Nunca se muestra a otros usuarios |
| `password` | String | `required`, mínimo 8 caracteres, `select: false` | Se guarda solo el **hash** de bcrypt |
| `role` | String | `enum: ROLES`, `default: 'user'` | Nunca se acepta desde el body del registro |
| `createdAt`, `updatedAt` | Date | — | `timestamps: true` |

Comportamiento del modelo:

- **Hook `pre('save')`:** si `password` ha cambiado, lo sustituye por su hash (`bcrypt.hash`, 10 rondas).
- **Método `comparePassword(candidate)`:** envuelve `bcrypt.compare`.
- **`toJSON`:** devuelve `id` en lugar de `_id`, y elimina `password` y `__v`.

### 3.4. Esquema `Bug`

| Campo | Tipo | Validaciones | Notas |
|---|---|---|---|
| `name` | String | `required`, `trim`, 3–60 caracteres | El nombre de criatura: "El CORS Salvaje" |
| `errorMessage` | String | opcional, `trim`, máx. 500 | El texto literal del error, tal cual sale en la consola. Opcional porque hay errores sin mensaje (un estilo que no se aplica) |
| `description` | String | `required`, `trim`, 10–2000 caracteres | Qué pasa, cuándo pasa, cómo se reproduce |
| `code` | String | opcional, máx. 3000 | Fragmento de código donde aparece el error |
| `technologies` | [String] | cada valor en `TECHNOLOGIES`; al menos 1, como mucho 5, sin repetidos | |
| `dangerLevel` | Number | `required`, entero, 1–5 | Lo elige quien registra el error |
| `author` | ObjectId | `required`, `ref: 'User'` | **Referencia** |
| `sightings` | [ObjectId] | `default: []` | Ids de los usuarios que han dicho "a mí también" |
| `sightingsCount` | Number | `default: 0`, mínimo 0 | Copia de `sightings.length` para poder **ordenar** por popularidad (ver [Retos](#103-ordenar-por-el-tamaño-de-un-array)) |
| `solutions` | [Solution] | `default: []` | **Embebido**. Puede estar vacío: hay errores aún sin resolver |
| `createdAt`, `updatedAt` | Date | — | `timestamps: true` |

**Opciones del esquema:**
- `timestamps: true`
- `optimisticConcurrency: true`: si dos peticiones modifican el mismo error a la vez, la segunda falla en lugar de pisar a la primera (ver [Retos](#1010-dos-personas-modificando-el-mismo-error-a-la-vez)).
- `toJSON: { virtuals: true }` y una transformación que cambia `_id` por `id` y quita `__v` (también en los subdocumentos).

**Virtuales** (no se guardan: se calculan al convertir a JSON):

| Virtual | Valor |
|---|---|
| `solutionsCount` | `solutions.length` |
| `solved` | `true` si tiene al menos una solución |
| `verified` | `true` si alguna solución está verificada |
| `dangerLabel` | La etiqueta de su peligrosidad (`"Temible"`) |

**Hook `pre('save')`:** `this.sightingsCount = this.sightings.length`, para que el contador nunca se desincronice.

**Índices:** `technologies`, `author`, `createdAt` y `sightingsCount`.

### 3.5. Subesquema `Solution`

| Campo | Tipo | Validaciones | Notas |
|---|---|---|---|
| `_id` | ObjectId | automático | Permite referirse a una solución concreta en la URL |
| `text` | String | `required`, `trim`, 10–2000 caracteres | La explicación |
| `code` | String | opcional, máx. 3000 | Código corregido |
| `author.id` | ObjectId | `required` | Id del autor. **Sin `ref`**: no se hace `populate`, solo se usa para comprobar permisos |
| `author.username` | String | `required` | **Copia** del nombre del autor en el momento de escribir la solución |
| `votes` | [ObjectId] | `default: []` | Ids de los usuarios a los que les ha funcionado |
| `verified` | Boolean | `default: false` | Solo lo cambia el admin |
| `createdAt`, `updatedAt` | Date | — | `timestamps: true` |

**Virtual:** `votesCount` = `votes.length`.

### 3.6. Ejemplo de definición (`bug.model.ts`, resumido)

```ts
import { Schema, model } from 'mongoose';
import { TECHNOLOGIES } from '../config/constants.ts';

const solutionSchema = new Schema(
  {
    text: { type: String, required: [true, 'La solución no puede estar vacía'], trim: true, minlength: 10, maxlength: 2000 },
    code: { type: String, maxlength: 3000 },
    // Copia embebida del autor: sin ref, sin populate
    author: {
      id: { type: Schema.Types.ObjectId, required: true },
      username: { type: String, required: true },
    },
    votes: { type: [Schema.Types.ObjectId], default: [] },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

solutionSchema.virtual('votesCount').get(function () {
  return this.votes.length;
});

const bugSchema = new Schema(
  {
    name: { type: String, required: [true, 'El nombre es obligatorio'], trim: true, minlength: 3, maxlength: 60 },
    errorMessage: { type: String, trim: true, maxlength: 500 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    code: { type: String, maxlength: 3000 },
    technologies: {
      type: [{ type: String, enum: [...TECHNOLOGIES] }],
      validate: {
        validator: (list: string[]) => list.length >= 1 && list.length <= 5 && new Set(list).size === list.length,
        message: 'Indica entre 1 y 5 tecnologías, sin repetir',
      },
    },
    dangerLevel: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sightings: { type: [Schema.Types.ObjectId], default: [] },
    sightingsCount: { type: Number, default: 0, min: 0, index: true },
    solutions: { type: [solutionSchema], default: [] },
  },
  { timestamps: true, optimisticConcurrency: true, toJSON: { virtuals: true } },
);

bugSchema.pre('save', function () {
  this.sightingsCount = this.sightings.length;
});

export const BugModel = model('Bug', bugSchema);
```

### 3.7. Embebido o referenciado: decisiones y motivos

| Dato | Decisión | Motivo |
|---|---|---|
| `Bug.solutions` | **Embebido** | Una solución solo tiene sentido dentro de su error, se lee siempre con él y su número es pequeño (raramente más de unas pocas por error). Embebida, el error completo se lee de una vez. |
| `Bug.author` | **Referenciado** (`ref` + `populate`) | Es la relación principal del modelo: el usuario existe por sí mismo y es el dueño del error. Se guarda solo su id y, al leer, `populate('author', 'username')` trae su nombre. |
| `Solution.author` | **Copia embebida** `{ id, username }` | El nombre del autor se muestra junto a cada solución y no cambia (la API no permite cambiar el username). Copiarlo evita hacer `populate` de cada solución. El `id` se guarda igualmente porque hace falta para los permisos: quién puede borrarla y quién no puede votarla. |
| `Bug.sightings`, `Solution.votes` | **Array de ids** | Solo importa *quién*, no ningún dato adicional, así que basta un array de ids. Como nunca se muestran nombres, no hace falta `ref` ni `populate`. Al ser ids, se garantiza "uno por usuario" con `$addToSet`. |
| `Bug.technologies` | **Array de strings** | Son valores de una lista cerrada, no entidades. En SQL sería una tabla intermedia. |
| `User.bugs` | **No existe** | La relación ya está en `Bug.author`. Guardarla también en el usuario obligaría a mantener las dos sincronizadas. "Los errores de un usuario" se obtienen con `Bug.find({ author: id })`, que es eficiente gracias al índice. |

> **Referenciar frente a copiar.** Referenciar mantiene un único dato verdadero (si el usuario cambia, todos lo ven), a cambio de una consulta extra (`populate`). Copiar evita esa consulta, a cambio de que la copia pueda quedar desactualizada. Copiar compensa cuando el dato copiado **casi nunca cambia** y se **lee muchas veces**, que es el caso del nombre del autor de una solución.

---

## 4. Reglas de negocio

### 4.1. Permisos sobre los recursos

| Acción | Anónimo | User | Autor del recurso | Admin |
|---|:-:|:-:|:-:|:-:|
| Ver y buscar errores | ✅ | ✅ | ✅ | ✅ |
| Registrar un error | ❌ 401 | ✅ | — | ✅ |
| Editar un error | ❌ 401 | ❌ 403 | ✅ (el suyo) | ✅ (todos) |
| Borrar un error | ❌ 401 | ❌ 403 | ✅ (el suyo) | ✅ (todos) |
| Añadir una solución | ❌ 401 | ✅ | ✅ (también a su propio error) | ✅ |
| Borrar una solución | ❌ 401 | ❌ 403 | ✅ (la suya) | ✅ (todas) |
| Votar una solución | ❌ 401 | ✅ | ❌ **403 (la suya no)** | ✅ (salvo las suyas) |
| "A mí también" en un error | ❌ 401 | ✅ | ❌ **403 (el suyo no)** | ✅ (salvo los suyos) |
| Verificar una solución | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |

**Matiz importante, los permisos "al revés":** normalmente, ser el dueño de un recurso **da** permisos (solo el autor puede editar su error). En los votos y en "a mí también" ocurre lo contrario: ser el autor **quita** el permiso, porque votarse a uno mismo no tiene sentido. Son dos funciones de permisos distintas y complementarias:

```ts
isOwnerOrAdmin(user, authorId)  // ¿puede editar o borrar?  → dueño o admin
isOwner(user, authorId)         // ¿es suyo?                → si lo es, NO puede votar
```

### 4.2. Errores sin solución

Se puede registrar un error **sin solución**, porque a veces quien lo encuentra todavía no sabe resolverlo. Esos errores:
- tienen `solutions: []` y `solved: false`;
- se pueden listar con `GET /api/bugs?solved=false`, y el frontend puede mostrarlos como un tablón de "Se busca" 🤠;
- reciben soluciones de cualquiera, **incluido su propio autor** cuando consigue resolverlo.

### 4.3. Soluciones: se borran, no se editan

Las soluciones **no se pueden editar**: si una tiene un error, su autor la borra y escribe otra. Así hay un endpoint menos y no se plantea qué hacer con los votos de una solución que ha cambiado (¿siguen valiendo los votos de lo que ponía antes?).

### 4.4. Votos y "a mí también"

- Cada usuario cuenta **una sola vez**. Votar dos veces no da error ni suma dos: la operación es **idempotente**. Así, si el frontend repite una petición (doble clic, reintento por red), no pasa nada.
- Se pueden deshacer: `DELETE` del mismo recurso.
- No se puede votar una solución propia ni decir "a mí también" en un error propio (**403**).

### 4.5. Verificación

- Solo el admin verifica (o desverifica) una solución.
- Un error puede tener varias soluciones verificadas (a veces hay más de una forma correcta).
- El virtual `verified` del error es `true` si al menos una solución lo está.

### 4.6. Orden de las soluciones

En el detalle de un error, las soluciones se devuelven ordenadas:
1. Primero las **verificadas**.
2. Después, de **más a menos votos**.
3. A igualdad, las **más antiguas** primero (quien llegó antes).

Lo hace la función pura `sortSolutions(solutions)`.

### 4.7. Campos que se pueden escribir

Nunca se pasa `req.body` directamente a Mongoose. Cada endpoint toma solo lo que admite:

| Endpoint | Campos aceptados | Si llega otro campo |
|---|---|---|
| `POST /auth/register` | `username`, `email`, `password`, `registrationCode` | Se ignora (en especial `role`) |
| `POST /bugs` | `name`, `errorMessage`, `description`, `code`, `technologies`, `dangerLevel` | Se ignora. `author` sale del token |
| `PATCH /bugs/:id` | Los mismos que en `POST` | **400** `NON_EDITABLE_FIELD` |
| `POST /bugs/:id/solutions` | `text`, `code` | Se ignora. `author` (`id` y `username`) sale del token. `verified` siempre empieza en `false` |
| `PATCH .../verify` | `verified` | Se ignora |

> **¿Por qué `POST` ignora y `PATCH` rechaza?** En `PATCH`, el cliente dice explícitamente "cambia esto". Si pide cambiar `author` o `solutions`, lo más útil es decirle que no se puede, en vez de responder 200 sin haberlo hecho y que crea que funcionó.

---

## 5. Arquitectura

### 5.1. Estructura de carpetas

```
bugpedia-api/
├── src/
│   ├── index.ts                    # Arranque: conecta a MongoDB y escucha en el puerto
│   ├── app.ts                      # Crea la app de Express (middlewares, rutas, errores). Sin listen
│   ├── config/
│   │   ├── env.ts                  # Lee y valida las variables de entorno
│   │   ├── db.ts                   # Conexión a MongoDB
│   │   └── constants.ts            # Roles, tecnologías, peligrosidades, paginación
│   ├── models/
│   │   ├── user.model.ts
│   │   └── bug.model.ts            # Bug + Solution (subesquema)
│   ├── repositories/
│   │   ├── user.repository.ts      # Todas las consultas de usuarios
│   │   └── bug.repository.ts       # Todas las consultas de errores
│   ├── routes/
│   │   ├── index.ts                # Monta los routers bajo /api
│   │   ├── auth.routes.ts
│   │   ├── bug.routes.ts           # Incluye las rutas de soluciones, votos y avistamientos
│   │   └── meta.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── bug.controller.ts       # CRUD de errores + avistamientos
│   │   ├── solution.controller.ts  # Soluciones, votos y verificación
│   │   └── meta.controller.ts
│   ├── middlewares/
│   │   ├── index.ts                # Exporta los middlewares ya configurados
│   │   ├── authenticate.ts         # Verifica el JWT y rellena req.user
│   │   ├── requireRole.ts          # Restringe por rol
│   │   ├── errorHandler.ts         # Manejador de errores centralizado
│   │   └── notFound.ts             # 404 para rutas inexistentes
│   ├── utils/
│   │   ├── HttpError.ts            # Error con código de estado
│   │   ├── permissions.ts          # isOwner, isOwnerOrAdmin
│   │   ├── buildBugQuery.ts        # Query params → filtro, orden y paginación de Mongo
│   │   ├── sortSolutions.ts        # Orden de las soluciones en el detalle
│   │   ├── pickFields.ts           # Listas blancas de campos
│   │   └── escapeRegex.ts          # Escapa texto para usarlo en una RegExp
│   └── types/
│       └── express.d.ts            # Añade `user` al tipo Request
├── tests/
│   ├── helpers/                    # req/res/next falsos, datos de prueba
│   └── unit/
├── scripts/
│   ├── seed-admin.ts               # Crea el primer admin
│   └── smoke.ts                    # Prueba de humo: recorre la API contra una BD real
├── postman/
│   └── Bugpedia.postman_collection.json
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── MEMORIA.md
```

Son unos **27 archivos de código**, y la mayoría tienen menos de 50 líneas.

### 5.2. Qué hace cada capa

| Capa | Responsabilidad | Qué **no** hace |
|---|---|---|
| **Rutas** | Asocian método + URL con middlewares y controlador. Leídas de arriba abajo, son el índice de la API. | Lógica |
| **Middlewares** | Se ejecutan antes del controlador (autenticación, roles) o después (errores, 404). | Saber qué es un error de programación |
| **Controladores** | Leen la petición (`params`, `query`, `body`, `user`), aplican las reglas de negocio (permisos, qué se cambia), piden y guardan datos a través de los repositorios y responden con el código de estado adecuado. | Escribir consultas a la base de datos, validar formatos (eso lo hace el esquema) |
| **Repositorios** | Son el **único sitio que habla con Mongoose**: `find`, `populate`, `select`, `countDocuments`, `save`, `deleteOne`... Ofrecen funciones con nombres del dominio: `findBugById`, `findUserByEmailWithPassword`. | Saber nada de HTTP ni de permisos |
| **Modelos** | Definen la forma de los datos, sus validaciones, virtuales y hooks. | Saber nada de HTTP |
| **Utils** | Funciones pequeñas y **puras** (sin base de datos ni Express): filtros, permisos, ordenaciones. | Efectos secundarios |

### 5.3. La capa de repositorios

Entre los controladores y los modelos hay una capa de **repositorios**: módulos que agrupan todas las consultas a la base de datos de una entidad.

```
Ruta ──► Controlador ──► Repositorio ──► Modelo (Mongoose) ──► MongoDB
         "qué hacer"     "cómo leer y guardar"
```

**Qué se gana:**
- **Cada capa tiene una sola responsabilidad.** El controlador se lee como la descripción de un caso de uso ("busca el error, comprueba que es tuyo, cámbialo, guárdalo"), sin detalles de consultas.
- **Las consultas no se repiten.** "Buscar un error con el nombre de su autor" se escribe una vez (`findBugById`) y se usa en todos los controladores que lo necesitan. Si mañana hay que añadir un campo al `populate`, se cambia en un solo sitio.
- **La base de datos queda encapsulada.** Si un día una entidad pasara a SQL (el bonus de arquitectura híbrida del enunciado), solo cambiaría su repositorio, y los controladores ni se enterarían.

**Funciones de cada repositorio:**

| `user.repository.ts` | Qué hace |
|---|---|
| `createUser({ username, email, password })` | Crea el usuario. El hash lo hace el hook del modelo |
| `findUserByEmailWithPassword(email)` | Para el login: incluye el campo `password`, oculto por defecto |
| `findUserById(id)` | Para `/auth/me` |

| `bug.repository.ts` | Qué hace |
|---|---|
| `findBugs({ filter, sort, skip, limit })` | Listado: devuelve `{ bugs, total }`, sin los campos `code` y con el autor populado (solo `username`). Lanza la consulta y el `countDocuments` a la vez (`Promise.all`) |
| `findBugById(id)` | Un error completo, con el autor populado. Devuelve `null` si no existe |
| `createBug(data)` | Crea el error y lo devuelve con el autor populado |
| `saveBug(bug)` | Guarda los cambios de un error (ejecuta validaciones y hooks) |
| `deleteBug(bug)` | Borra el error (y con él sus soluciones) |

**Una regla práctica para saber dónde va cada cosa:** el controlador decide **qué cambia** (por ejemplo, `solution.votes.addToSet(user.id)` sobre el documento que le ha dado el repositorio) y el repositorio sabe **cómo se lee y se guarda** (`saveBug(bug)`). Las comprobaciones de permisos nunca van en el repositorio, porque no son una cuestión de datos, sino de reglas.

> **¿Y la capa de servicios?** En proyectos grandes suele haber también una capa de *servicios* entre controladores y repositorios, con los casos de uso. En Bugpedia cada caso de uso son pocas líneas, así que ese papel lo hacen los propios controladores. Merecería la pena añadirla si un mismo caso de uso se llamara desde varios sitios (la API, un panel con vistas, un script).

### 5.4. `app.ts` separado de `index.ts`

- `app.ts` construye la aplicación (`createApp()`) y la devuelve **sin arrancarla**.
- `index.ts` conecta a MongoDB y llama a `listen()`.

Así se puede importar la app en scripts o en tests de integración sin abrir un puerto ni conectar a la base de datos real.

Orden de los middlewares en `app.ts`:

```ts
app.use(cors({ origin: env.FRONTEND_URL }));  // 1. Permitir al frontend
app.use(express.json());                       // 2. Leer cuerpos JSON
app.use('/api', router);                       // 3. Rutas
app.use(notFound);                             // 4. Ninguna ruta ha respondido → 404
app.use(errorHandler);                         // 5. Siempre el último
```

### 5.5. Las rutas, de un vistazo

```ts
// bug.routes.ts
bugRouter.get('/', bugController.list);                                                  // público
bugRouter.get('/:id', bugController.getById);                                            // público
bugRouter.post('/', authenticate, bugController.create);
bugRouter.patch('/:id', authenticate, bugController.update);
bugRouter.delete('/:id', authenticate, bugController.remove);

bugRouter.post('/:id/sightings', authenticate, bugController.addSighting);
bugRouter.delete('/:id/sightings', authenticate, bugController.removeSighting);

bugRouter.post('/:id/solutions', authenticate, solutionController.create);
bugRouter.delete('/:id/solutions/:solutionId', authenticate, solutionController.remove);
bugRouter.post('/:id/solutions/:solutionId/votes', authenticate, solutionController.vote);
bugRouter.delete('/:id/solutions/:solutionId/votes', authenticate, solutionController.unvote);
bugRouter.patch('/:id/solutions/:solutionId/verify', authenticate, requireRole('admin'), solutionController.verify);
```

### 5.6. Ejemplo de controlador

Así de corto es un controlador típico, en este caso votar una solución:

```ts
export async function vote(req: Request, res: Response) {
  const user = req.user!;                                         // lo garantiza `authenticate`
  const bug = await findBugOrFail(req.params.id);                 // 404 si no existe
  const solution = findSolutionOrFail(bug, req.params.solutionId); // 404 si no existe

  if (isOwner(user, solution.author.id)) {
    throw new HttpError(403, 'OWN_RESOURCE', 'No puedes votar tu propia solución');
  }

  solution.votes.addToSet(user.id);                               // qué cambia: lo decide el controlador
  await bugRepository.saveBug(bug);                               // cómo se guarda: lo sabe el repositorio
  res.json({ data: toBugDetail(bug) });
}
```

`findBugOrFail`, `findSolutionOrFail` y `toBugDetail` son pequeñas funciones auxiliares, compartidas por los controladores de errores y de soluciones:

- **`findBugOrFail(id)`:** llama a `bugRepository.findBugById(id)`. Si devuelve `null`, lanza `HttpError(404, 'BUG_NOT_FOUND')`.
- **`findSolutionOrFail(bug, id)`:** `bug.solutions.id(id)`, el método de Mongoose para buscar un subdocumento por su `_id` en un documento que ya está en memoria. Si no hay resultado, lanza `HttpError(404, 'SOLUTION_NOT_FOUND')`.
- **`toBugDetail(bug)`:** convierte el documento a JSON y ordena las soluciones con `sortSolutions`. No necesita consultar nada: el autor del error ya viene populado del repositorio y el de cada solución va copiado dentro.

### 5.7. Flujo de una petición

`POST /api/bugs/674a1f.../solutions/674a20.../votes` con `Authorization: Bearer eyJ...`

```
Cliente
  │
  ▼
cors ─► express.json ─► router /api ─► bugRouter
  │
  ▼
authenticate ─────────────────────────────► 401 si no hay token o no es válido
  │  req.user = { id, role, username }
  ▼
solutionController.vote
  │  1. findBugOrFail → bugRepository.findBugById ► 400 id mal formado · 404 si no existe
  │  2. findSolutionOrFail ──────────────────► 404 si la solución no existe
  │  3. isOwner(user, solution.author.id) ───► 403 si es suya
  │  4. solution.votes.addToSet(user.id)
  │  5. bugRepository.saveBug(bug) ──────────► 409 si otro lo modificó a la vez
  ▼
200 { data: bug con las soluciones ordenadas }

Cualquier error lanzado ──► errorHandler ──► { error: { code, message, details? } }
```

**Express 5** captura automáticamente los errores lanzados en controladores `async` y los pasa al `errorHandler`. No hace falta envolver nada en `try/catch` ni usar un `asyncHandler`.

---

## 6. Seguridad

### 6.1. Registro

1. El cliente envía `username`, `email`, `password` y `registrationCode`.
2. Si `registrationCode` no coincide con la variable de entorno `REGISTRATION_CODE` → **403** `INVALID_REGISTRATION_CODE`. Se comprueba **antes** de tocar la base de datos.
3. Se crea el usuario solo con `username`, `email` y `password`. Cualquier otro campo, **en especial `role`**, se ignora: si no fuera así, bastaría enviar `"role": "admin"` para ser administrador.
4. El hook `pre('save')` sustituye la contraseña por su hash con **bcrypt**. La contraseña en claro no se guarda nunca, en ningún sitio.
5. Si el email o el username ya existen, MongoDB lanza un error de clave duplicada (código `11000`) → **409** `DUPLICATE_KEY`.
6. Se responde **201** con el usuario (sin contraseña) y un token, para que el frontend no tenga que hacer login justo después.

> El código de registro es una medida sencilla para una API de clase: se cambia cada curso en el `.env`. No sustituye a un sistema de invitaciones de verdad (ver [Mejoras futuras](#11-mejoras-futuras)).

### 6.2. Login

1. Se comprueba que `email` y `password` son **strings**. Si no → **400**. Esto evita la **inyección NoSQL**: si alguien enviara `{ "email": { "$ne": null } }`, MongoDB lo interpretaría como "cualquier email que no sea nulo".
2. Se busca el usuario por email, pidiendo expresamente la contraseña (`.select('+password')`), porque está oculta por defecto.
3. Se compara con `comparePassword` (bcrypt).
4. Si el email no existe **o** la contraseña no coincide → **401** `INVALID_CREDENTIALS`, con el **mismo mensaje** en los dos casos. Así no se revela qué emails están registrados.
5. Si todo es correcto, se firma un **JWT** y se responde **200** con el usuario y el token.

### 6.3. El token (JWT)

```json
{ "sub": "6749c0...", "role": "user", "username": "ana", "iat": 1764000000, "exp": 1764604800 }
```

- `sub` (*subject*) es el id del usuario, `role` su rol y `username` su nombre. El nombre va en el token para poder firmar las soluciones (`author: { id, username }`) sin consultar la base de datos.
- Se firma con `JWT_SECRET` (HS256) y caduca según `JWT_EXPIRES_IN` (por defecto `7d`, una semana, cómodo para el frontend).
- El cliente lo envía en cada petición protegida: `Authorization: Bearer <token>`.
- El token **no está cifrado**, solo **firmado**: cualquiera puede leer su contenido, pero nadie puede modificarlo sin conocer el secreto. Por eso no se mete nada sensible dentro.

### 6.4. Middleware `authenticate`

```ts
export function createAuthenticate(secret: string): RequestHandler
```

Es una **factoría**: recibe el secreto y devuelve el middleware. Así se puede testear con un secreto falso, sin variables de entorno. En `middlewares/index.ts` se crea la instancia real: `export const authenticate = createAuthenticate(env.JWT_SECRET)`.

Comportamiento:
- Sin cabecera `Authorization`, o sin el prefijo `Bearer ` → **401** `TOKEN_REQUIRED`.
- Firma inválida, token caducado o payload sin `sub`, `role` o `username` válidos → **401** `INVALID_TOKEN`.
- Token válido → `req.user = { id: payload.sub, role: payload.role, username: payload.username }` y `next()`.

En caso de error **no responde directamente**: llama a `next(new HttpError(...))` y deja que el `errorHandler` dé forma a la respuesta, como en el resto de la API.

### 6.5. Middleware `requireRole`

```ts
export function requireRole(...roles: Role[]): RequestHandler
```

También es una factoría: recibe los roles permitidos.

- Sin `req.user` (se ha olvidado poner `authenticate` antes) → **401** `TOKEN_REQUIRED`.
- Rol no permitido → **403** `FORBIDDEN`.
- Rol permitido → `next()`.

Se usa en la ruta de verificación: `authenticate, requireRole('admin'), solutionController.verify`.

### 6.6. Permisos sobre recursos

Las funciones de `utils/permissions.ts` son puras y reciben el **id** del autor, como `ObjectId` o como string. Para un error se les pasa `bug.author` (o `bug.author._id` si está populado) y para una solución, `solution.author.id`:

```ts
isOwner(user: AuthUser, authorId: unknown): boolean          // user.id === id del autor
isOwnerOrAdmin(user: AuthUser, authorId: unknown): boolean   // isOwner || user.role === 'admin'
```

| Situación | Respuesta |
|---|---|
| Editar o borrar un error o una solución ajenos sin ser admin | **403** `NOT_OWNER` |
| Votar lo propio o "a mí también" en lo propio | **403** `OWN_RESOURCE` |

> **Decisión:** se responde **403** cuando el recurso existe pero no tienes permiso. La alternativa más estricta sería **404**, para no revelar que el recurso existe. En Bugpedia todo es público para lectura, así que ocultar su existencia no tiene sentido.

### 6.7. Datos que nunca salen de la API

- `password`: `select: false` en el esquema y eliminado en `toJSON`.
- `email` de otros usuarios: en el `populate` del autor del error se pide solo `username` (`populate('author', 'username')`), y en las soluciones solo se copia el `username`. El email solo aparece en las respuestas de registro, de login y de `/auth/me`, es decir, al propio usuario.

### 6.8. CORS

El navegador bloquea las peticiones de una web (`http://localhost:5173`) a una API de otro origen (`http://localhost:3000`) salvo que la API lo permita explícitamente. Se usa el paquete `cors` con el origen del frontend en la variable `FRONTEND_URL`. Las peticiones desde Postman o curl no se ven afectadas, porque CORS es una protección **del navegador**.

### 6.9. Búsqueda segura

El texto de `?search=` se usa dentro de una expresión regular. Antes se **escapa** (`escapeRegex`), para que caracteres como `(`, `.` o `*` se traten como texto literal. Sin esto, buscar `fetch(` rompería la consulta (expresión inválida), y alguien podría enviar patrones diseñados para que la búsqueda tarde muchísimo (ReDoS). Además, se limita su longitud a 100 caracteres.

---

## 7. Endpoints

**URL base:** `/api`. Todas las peticiones y respuestas son JSON.

**Formato de las respuestas:**
- **Éxito:** `{ "data": ... }`, a veces con `message`.
- **Listados:** `{ "data": [...], "pagination": { ... } }`.
- **Error:** `{ "error": { "code", "message", "details"? } }` (ver [Gestión de errores](#8-gestión-de-errores)).

### 7.1. Resumen

**Núcleo**, imprescindible:

| Método | Ruta | Acceso | Éxito | Descripción |
|---|---|---|---|---|
| GET | `/health` | Público | 200 | Comprobar que la API está viva |
| POST | `/auth/register` | Público + código | 201 | Registro |
| POST | `/auth/login` | Público | 200 | Login |
| GET | `/auth/me` | Autenticado | 200 | Usuario actual |
| GET | `/bugs` | Público | 200 | Listar, filtrar, buscar, ordenar y paginar |
| GET | `/bugs/:id` | Público | 200 | Detalle con soluciones |
| POST | `/bugs` | Autenticado | 201 | Registrar un error |
| PATCH | `/bugs/:id` | Autor o admin | 200 | Editar un error |
| DELETE | `/bugs/:id` | Autor o admin | 200 | Borrar un error |
| POST | `/bugs/:id/solutions` | Autenticado | 201 | Añadir una solución |
| DELETE | `/bugs/:id/solutions/:solutionId` | Autor de la solución o admin | 200 | Borrar una solución |
| PATCH | `/bugs/:id/solutions/:solutionId/verify` | **Admin** | 200 | Verificar o desverificar |

**Ampliaciones**, independientes entre sí:

| Método | Ruta | Acceso | Éxito | Descripción |
|---|---|---|---|---|
| POST | `/bugs/:id/sightings` | Autenticado (no el autor) | 200 | "A mí también me ha pasado" |
| DELETE | `/bugs/:id/sightings` | Autenticado | 200 | Deshacer "a mí también" |
| POST | `/bugs/:id/solutions/:solutionId/votes` | Autenticado (no el autor) | 200 | Votar una solución |
| DELETE | `/bugs/:id/solutions/:solutionId/votes` | Autenticado | 200 | Quitar el voto |
| GET | `/meta` | Público | 200 | Listas de valores para el frontend |

### 7.2. Cómo se devuelve un bug

**En el detalle** (`GET /bugs/:id` y respuestas de las acciones):

```json
{
  "data": {
    "id": "674a1f...",
    "name": "El CORS Salvaje",
    "errorMessage": "Access to fetch at ... has been blocked by CORS policy",
    "description": "El front no puede hablar con la API. En Postman funciona, pero en el navegador no.",
    "code": "fetch('http://localhost:3000/api/bugs')",
    "technologies": ["express", "react"],
    "dangerLevel": 4,
    "dangerLabel": "Temible",
    "author": { "id": "6749c0...", "username": "ana" },
    "sightings": ["6749c1...", "6749c2..."],
    "sightingsCount": 2,
    "solutions": [
      {
        "id": "674a20...",
        "text": "Instalar el paquete cors y añadir app.use(cors({ origin: 'http://localhost:5173' })).",
        "code": "app.use(cors({ origin: process.env.FRONTEND_URL }));",
        "author": { "id": "6749c1...", "username": "bea" },
        "votes": ["6749c0..."],
        "votesCount": 1,
        "verified": true,
        "createdAt": "2026-11-23T10:15:00.000Z",
        "updatedAt": "2026-11-23T11:00:00.000Z"
      }
    ],
    "solutionsCount": 1,
    "solved": true,
    "verified": true,
    "createdAt": "2026-11-23T09:50:00.000Z",
    "updatedAt": "2026-11-23T11:00:00.000Z"
  }
}
```

**En los listados** el formato es el mismo, pero **sin los campos `code`** (ni el del error ni el de las soluciones), para que las respuestas pesen menos. Para saber si ya has votado o marcado "a mí también", el frontend comprueba si su id está en `sightings` o en `votes`.

### 7.3. Auth

#### `POST /api/auth/register`

```json
// Petición
{
  "username": "ana",
  "email": "ana@ejemplo.com",
  "password": "supersecreta",
  "registrationCode": "BUGS-2026"
}

// 201 Created
{
  "data": {
    "user": { "id": "6749c0...", "username": "ana", "email": "ana@ejemplo.com", "role": "user", "createdAt": "..." },
    "token": "eyJhbGciOi..."
  }
}
```

| Error | Cuándo |
|---|---|
| 400 `VALIDATION_ERROR` | Falta algún campo, email inválido, contraseña de menos de 8 caracteres... (con `details` por campo) |
| 403 `INVALID_REGISTRATION_CODE` | El código no coincide |
| 409 `DUPLICATE_KEY` | El email o el username ya están registrados |

#### `POST /api/auth/login`

```json
// Petición
{ "email": "ana@ejemplo.com", "password": "supersecreta" }

// 200 OK
{ "data": { "user": { "id": "6749c0...", "username": "ana", "email": "ana@ejemplo.com", "role": "user" }, "token": "eyJhbGciOi..." } }
```

| Error | Cuándo |
|---|---|
| 400 `VALIDATION_ERROR` | Falta el email o la contraseña, o no son texto |
| 401 `INVALID_CREDENTIALS` | Email inexistente o contraseña incorrecta (mismo mensaje) |

#### `GET /api/auth/me`

Devuelve **200** `{ "data": { "user": {...} } }`. Sirve para que el frontend recupere la sesión al recargar la página. Errores: **401** sin token o con token inválido, y **404** si el usuario ya no existe.

### 7.4. Errores (bugs)

#### `GET /api/bugs`: listar

**Query params**, todos opcionales:

| Param | Valores | Filtro de Mongo | Ejemplo |
|---|---|---|---|
| `technology` | Una o varias de `TECHNOLOGIES`, separadas por comas | `{ technologies: { $in: [...] } }` | `?technology=react,express` |
| `minDanger` | Entero 1–5 | `{ dangerLevel: { $gte: n } }` | `?minDanger=4` |
| `solved` | `true` / `false` | `{ 'solutions.0': { $exists: true } }` / `{ solutions: { $size: 0 } }` | `?solved=false` |
| `verified` | `true` / `false` | `{ 'solutions.verified': true }` / `{ 'solutions.verified': { $ne: true } }` | `?verified=true` |
| `author` | Id de usuario | `{ author: id }` | `?author=6749c0...` ("mis errores") |
| `search` | Texto de 2 a 100 caracteres | `$or` con RegExp escapada (sin distinguir mayúsculas) sobre `name`, `errorMessage` y `description` | `?search=cors` |
| `sort` | `recent` (por defecto), `sightings`, `danger` | `{ createdAt: -1 }` / `{ sightingsCount: -1, createdAt: -1 }` / `{ dangerLevel: -1, createdAt: -1 }` | `?sort=danger` |
| `page` | Entero ≥ 1 (por defecto 1) | `skip((page - 1) * limit)` | `?page=2` |
| `limit` | Entero 1–50 (por defecto 10) | `limit(limit)` | `?limit=20` |

- Se pueden combinar todos: `?technology=react&solved=false&sort=danger&limit=5`.
- Los parámetros desconocidos se ignoran.
- Un valor no válido, o un parámetro repetido (`?sort=a&sort=b`), devuelve **400** `INVALID_QUERY`, con el parámetro problemático en el mensaje.

Toda esta traducción la hace la función pura `buildBugQuery(query)`, que devuelve `{ filter, sort, page, limit, skip }`. Es la función con más tests del proyecto.

```json
// 200 OK
{
  "data": [ { "id": "674a1f...", "name": "El CORS Salvaje", "...": "..." } ],
  "pagination": { "page": 1, "limit": 10, "total": 47, "pages": 5 }
}
```

Si `page` es mayor que el número de páginas, se devuelve `data: []` con la paginación correcta (no es un error).

#### `GET /api/bugs/:id`: detalle

**200** `{ "data": bug }` con el formato de 7.2, los autores populados y las soluciones ordenadas. Errores: **400** `INVALID_ID` si el id está mal formado y **404** `BUG_NOT_FOUND` si no existe.

#### `POST /api/bugs`: registrar un error

```json
// Petición (Authorization: Bearer ...)
{
  "name": "El Puerto Okupa",
  "errorMessage": "Error: listen EADDRINUSE: address already in use :::3000",
  "description": "Al arrancar la API dice que el puerto 3000 está ocupado, aunque no tengo nada abierto.",
  "technologies": ["node", "express"],
  "dangerLevel": 2
}

// 201 Created
{ "data": { "id": "674b00...", "name": "El Puerto Okupa", "solutions": [], "solved": false, "...": "..." } }
```

No hace falta enviar ninguna solución: el error queda como "se busca". Errores: **400** `VALIDATION_ERROR` (con `details` por campo) y **401**.

#### `PATCH /api/bugs/:id`: editar

Se envían solo los campos que cambian, de entre `name`, `errorMessage`, `description`, `code`, `technologies` y `dangerLevel`.

```json
// Petición
{ "dangerLevel": 3, "description": "Pasa cuando cierro la terminal sin parar el servidor con Ctrl+C." }

// 200 OK
{ "data": { "...": "error actualizado" } }
```

| Error | Cuándo |
|---|---|
| 400 `NON_EDITABLE_FIELD` | El body incluye otros campos (`author`, `solutions`, `sightings`...) |
| 400 `VALIDATION_ERROR` | Body vacío o algún valor no válido |
| 401 / 403 `NOT_OWNER` / 404 | Sin token / no es tuyo ni eres admin / no existe |

La edición se hace con `findBugById` → comprobar permisos → `bug.set(cambios)` → `saveBug(bug)`, para que se ejecuten las validaciones del esquema. `findByIdAndUpdate` no las ejecuta salvo que se le pida con `runValidators: true`, y además no permitiría comprobar el autor antes de modificar.

#### `DELETE /api/bugs/:id`: borrar

```json
// 200 OK
{ "message": "Error eliminado de la Bugpedia" }
```

Se borra con todas sus soluciones, porque van embebidas. Errores: **401**, **403** `NOT_OWNER` y **404**.

### 7.5. Soluciones

#### `POST /api/bugs/:id/solutions`: añadir

```json
// Petición
{
  "text": "Busca el proceso que usa el puerto y ciérralo: en Mac/Linux con lsof -i :3000 y kill <PID>.",
  "code": "lsof -i :3000\nkill -9 <PID>"
}

// 201 Created
{ "data": { "...": "el error completo, con la nueva solución incluida" } }
```

Se devuelve el **error completo** (no solo la solución), para que el frontend pueda repintar la página con una sola respuesta. Cualquier usuario autenticado puede añadir soluciones, incluido el autor del error. Errores: **400** `VALIDATION_ERROR`, **401** y **404**.

#### `DELETE /api/bugs/:id/solutions/:solutionId`: borrar

Lo puede hacer el autor **de la solución** o el admin (no el autor del error: la solución no es suya). Responde **200** con el error actualizado. Errores: **401**, **403** `NOT_OWNER` y **404** `BUG_NOT_FOUND` / `SOLUTION_NOT_FOUND`.

#### `PATCH /api/bugs/:id/solutions/:solutionId/verify`: verificar (admin)

```json
// Petición
{ "verified": true }

// 200 OK
{ "data": { "...": "error actualizado" } }
```

Con `{ "verified": false }` se quita la verificación. Errores: **400** `VALIDATION_ERROR` si `verified` no es booleano, **401**, **403** `FORBIDDEN` (no eres admin) y **404**.

### 7.6. Ampliaciones

#### `POST /api/bugs/:id/sightings` y `DELETE /api/bugs/:id/sightings`: "a mí también"

Sin body. Añaden o quitan el id del usuario en `sightings` (`addToSet` / `pull`). El hook del modelo actualiza `sightingsCount`. Son **idempotentes**: repetirlas no cambia nada. Responden **200** con el error actualizado. Errores: **401**, **403** `OWN_RESOURCE` (es tu propio error, solo en `POST`) y **404**.

#### `POST` y `DELETE /api/bugs/:id/solutions/:solutionId/votes`: votar y quitar el voto

Sin body. Funcionan igual sobre `solution.votes`. Errores: **401**, **403** `OWN_RESOURCE` (es tu propia solución, solo en `POST`) y **404**.

#### `GET /api/meta`

Da al frontend las listas para formularios y filtros, sin tener que copiarlas a mano:

```json
{
  "data": {
    "technologies": ["javascript", "typescript", "html", "css", "react", "node", "express", "mongodb", "git", "vite", "other"],
    "dangerLevels": [
      { "value": 1, "label": "Inofensivo", "emoji": "🐜" },
      { "value": 5, "label": "Legendario", "emoji": "🐉" }
    ],
    "sortOptions": ["recent", "sightings", "danger"],
    "pagination": { "defaultLimit": 10, "maxLimit": 50 }
  }
}
```

---

## 8. Gestión de errores

### 8.1. `HttpError`

```ts
export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { ... }
}
```

Los controladores y middlewares lanzan `HttpError` (o llaman a `next(new HttpError(...))`). El `errorHandler` lo convierte en la respuesta.

> Con el *type stripping* de Node no se pueden usar *parameter properties* (`constructor(public status: number)`), así que los campos se declaran y asignan explícitamente (ver [Anexo A](#a4-typescript-sin-compilar)).

### 8.2. Manejador de errores centralizado

`errorHandler` es el último middleware de `app.ts`. Recibe cualquier error y responde siempre con el mismo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Hay datos que no son válidos",
    "details": { "name": "El nombre es obligatorio", "dangerLevel": "La peligrosidad debe estar entre 1 y 5" }
  }
}
```

| Error recibido | Status | `code` |
|---|---|---|
| `HttpError` | el suyo | el suyo |
| `mongoose.Error.ValidationError` | 400 | `VALIDATION_ERROR`, con `details` por campo |
| `mongoose.Error.CastError` (id mal formado, p. ej. `/bugs/patata`) | 400 | `INVALID_ID` |
| `mongoose.Error.VersionError` | 409 | `CONFLICT` |
| Error de MongoDB con `code === 11000` | 409 | `DUPLICATE_KEY` (el mensaje dice qué campo) |
| JSON mal formado en el body (`type === 'entity.parse.failed'`) | 400 | `INVALID_JSON` |
| Cualquier otro | 500 | `INTERNAL_ERROR`, con mensaje genérico. El error real se muestra en la consola del servidor, nunca al cliente |

`details` está pensado para el frontend: permite pintar cada error debajo de su campo del formulario.

### 8.3. 404 de rutas

El middleware `notFound`, montado después de todas las rutas, lanza `HttpError(404, 'NOT_FOUND', 'No existe GET /api/loquesea')`.

### 8.4. Catálogo de códigos

| Code | Status | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Datos no válidos |
| `INVALID_ID` | 400 | Id mal formado |
| `INVALID_JSON` | 400 | El body no es JSON válido |
| `INVALID_QUERY` | 400 | Query param no válido |
| `NON_EDITABLE_FIELD` | 400 | Se intenta modificar un campo no permitido |
| `TOKEN_REQUIRED` | 401 | Falta el token |
| `INVALID_TOKEN` | 401 | Token inválido o caducado |
| `INVALID_CREDENTIALS` | 401 | Login incorrecto |
| `FORBIDDEN` | 403 | Rol insuficiente |
| `NOT_OWNER` | 403 | El recurso no es tuyo |
| `OWN_RESOURCE` | 403 | El recurso es tuyo y la acción no lo permite (votarse) |
| `INVALID_REGISTRATION_CODE` | 403 | Código de registro incorrecto |
| `NOT_FOUND` | 404 | Ruta inexistente |
| `BUG_NOT_FOUND` | 404 | Error inexistente |
| `SOLUTION_NOT_FOUND` | 404 | Solución inexistente |
| `USER_NOT_FOUND` | 404 | Usuario inexistente (`/auth/me`) |
| `DUPLICATE_KEY` | 409 | Email o username ya registrados |
| `CONFLICT` | 409 | Modificación simultánea; hay que reintentar |
| `INTERNAL_ERROR` | 500 | Error no controlado |

### 8.5. Uso de los códigos de estado

| Código | Cuándo |
|---|---|
| **200** OK | Lecturas, ediciones, borrados, votos, verificaciones |
| **201** Created | Registro, nuevo error, nueva solución |
| **400** Bad Request | El cliente ha enviado algo mal formado o no válido |
| **401** Unauthorized | No sabemos quién eres (sin token, token inválido, login incorrecto) |
| **403** Forbidden | Sabemos quién eres, pero no puedes hacer eso |
| **404** Not Found | Lo que buscas no existe |
| **409** Conflict | La petición choca con el estado actual (duplicado, modificación simultánea) |
| **500** Internal Server Error | Fallo del servidor |

> **401 frente a 403**, la confusión más habitual: el 401 es "identifícate" y el 403 es "ya sé quién eres, y no".

---

## 9. Testing

### 9.1. Herramientas

**Vitest**: ejecuta tests en TypeScript sin configuración y su API es la misma que la de Jest (`describe`, `it`, `expect`, `vi.fn`).

```bash
npm test             # modo watch
npm run test:run     # una ejecución
npm run coverage     # cobertura
```

### 9.2. Qué se prueba y por qué

Todos los tests son **unitarios y no necesitan base de datos**. Es posible porque:
- los middlewares solo dependen de `req`, `res` y `next`, que se pueden simular con objetos y `vi.fn()`;
- la lógica con decisiones (filtros, permisos, ordenación) está en funciones puras de `utils/`.

#### `requireRole` (obligatorio por enunciado)

| Caso | Esperado |
|---|---|
| Sin `req.user` | `next` llamado con `HttpError` 401 `TOKEN_REQUIRED` |
| Rol `user` en ruta de admin | `next` llamado con `HttpError` 403 `FORBIDDEN` |
| Rol `admin` en ruta de admin | `next()` sin argumentos |
| Varios roles permitidos | Deja pasar a cualquiera de ellos |
| En ningún caso | Llama a `res.status` ni a `res.json` (delega en el `errorHandler`) |

**Por qué:** es la puerta de las rutas de admin. Un fallo aquí es una brecha de seguridad.

#### `authenticate`

Se crea con `createAuthenticate('secreto-de-test')` y tokens reales firmados con `jwt.sign` en el propio test.

| Caso | Esperado |
|---|---|
| Sin cabecera | 401 `TOKEN_REQUIRED` |
| Cabecera sin `Bearer ` | 401 `TOKEN_REQUIRED` |
| Token firmado con otro secreto | 401 `INVALID_TOKEN`, sin rellenar `req.user` |
| Token caducado | 401 `INVALID_TOKEN` |
| Texto que no es un JWT | 401 `INVALID_TOKEN` |
| Token sin `role`, con un rol inexistente o sin `username` | 401 `INVALID_TOKEN` |
| Token válido | `req.user = { id, role, username }` y `next()` sin argumentos |

#### `permissions`

| Caso | `isOwner` | `isOwnerOrAdmin` |
|---|---|---|
| El autor (id como `ObjectId`) | `true` | `true` |
| El autor (id como string) | `true` | `true` |
| Otro user | `false` | `false` |
| Admin que no es el autor | `false` | `true` |
| Admin que sí es el autor | `true` | `true` |

**Por qué:** son las dos reglas que deciden quién edita y quién vota. Se prueban juntas para que se vea que son **complementarias**.

#### `buildBugQuery`

| Caso | Esperado |
|---|---|
| Sin query | Filtro `{}`, orden `recent`, página 1, límite 10, skip 0 |
| Parámetros desconocidos | Se ignoran |
| `technology=react` | `{ technologies: { $in: ['react'] } }` |
| `technology=react,node` | `$in` con las dos |
| `technology=cobol` | Error `INVALID_QUERY` |
| `minDanger=4` | `{ dangerLevel: { $gte: 4 } }` |
| `minDanger=0`, `6`, `2.5` o `alto` | Error |
| `solved=true` / `false` | `'solutions.0': { $exists: true }` / `solutions: { $size: 0 }` |
| `verified=true` / `false` | `'solutions.verified': true` / `{ $ne: true }` |
| `solved=quizas` | Error |
| `author=<id válido>` | `{ author: id }` |
| `author=patata` | Error |
| `search=cors` | `$or` con tres RegExp sin distinguir mayúsculas |
| `search=fetch(` | La RegExp trata `(` como texto (escapado) |
| `search=a` (1 carácter) o de más de 100 | Error |
| `sort=sightings` / `danger` | Orden correcto, con `createdAt` como desempate |
| `sort=random` | Error |
| `page=3&limit=20` | skip 40 |
| `limit=51`, `limit=0` o `page=0` | Error |
| Parámetro repetido (llega como array) | Error |
| Todo combinado | Todos los filtros a la vez |

**Por qué:** traduce texto del usuario a consultas de base de datos. Es donde más fácilmente se cuela un bug y donde más casos límite hay.

#### `sortSolutions`

| Caso | Esperado |
|---|---|
| Verificadas primero | Aunque tengan menos votos |
| Entre no verificadas | Más votos primero |
| Empate | La más antigua primero |
| Array vacío | Array vacío |
| No modifica el array original | Devuelve uno nuevo |

#### `pickFields` y `escapeRegex`

- `pickFields(body, allowed)` devuelve solo los campos permitidos y presentes, sin añadir `undefined`.
- `findForbiddenFields(body, allowed)` devuelve la lista de campos no permitidos (para el 400 del `PATCH`).
- `escapeRegex` escapa todos los caracteres especiales (`.*+?^${}()|[]\`).

#### `errorHandler` (recomendado)

Con `res` simulado, se comprueba la traducción de cada tipo de error: `HttpError`, `ValidationError` (con `details`), `CastError`, error `11000`, JSON inválido y error genérico (500, sin filtrar el mensaje real).

### 9.3. Prueba de humo (`npm run smoke`)

Además de los tests unitarios, `scripts/smoke.ts` arranca la API contra una base de datos real (una propia, `bugpedia_smoke`, que borra al terminar) y recorre todo el flujo:

- registro con y sin código;
- login;
- crear un error sin solución;
- añadir soluciones;
- votar (incluido el intento de votar lo propio);
- "a mí también";
- verificar como admin e intentarlo como user;
- filtros y paginación;
- editar con campos prohibidos;
- borrar.

Comprueba en cada paso el código de estado y la respuesta. No sustituye a los tests, pero confirma que todas las piezas encajan.

### 9.4. Qué no se prueba (y por qué)

- **Los repositorios y los controladores contra la base de datos:** requerirían una base de datos de test (`mongodb-memory-server`) y Supertest. Queda como [mejora futura](#11-mejoras-futuras); la prueba de humo cubre ese hueco de forma manual.
- **Las validaciones de los esquemas:** las implementa Mongoose. Se comprueban con la prueba de humo y la colección de Postman.

---

## 10. Retos y soluciones

### 10.1. Un voto por persona

**Problema:** si un voto fuera un contador (`votes: 7`), no habría forma de saber quién ha votado, y cualquiera podría votar mil veces.

**Solución:** `votes` es un **array de ids de usuario**. Se añade con `addToSet`, que no inserta si el id ya está, y se quita con `pull`. El número de votos es la longitud del array (virtual `votesCount`) y el frontend sabe si ya has votado comprobando si tu id está en el array. Lo mismo vale para `sightings`.

### 10.2. Permisos al revés

**Problema:** casi todas las reglas de permisos son del tipo "solo el dueño puede". Votar es lo contrario: "el dueño **no** puede".

**Solución:** dos funciones pequeñas y explícitas, `isOwner` e `isOwnerOrAdmin`, en lugar de una sola función con banderas. Los controladores se leen solos: `if (!isOwnerOrAdmin(...)) → 403` para editar, `if (isOwner(...)) → 403` para votar.

### 10.3. Ordenar por el tamaño de un array

**Problema:** se quiere ordenar los errores por "los que más gente ha sufrido" (`sightings.length`), pero `find().sort()` no puede ordenar por la longitud de un array. Haría falta una agregación con `$size`, que complica el listado.

**Solución:** un campo `sightingsCount` que se mantiene sincronizado en un hook `pre('save')` (`this.sightingsCount = this.sightings.length`). Así se puede indexar y ordenar con un `sort` normal. Es **desnormalizar** a propósito: guardar un dato derivado para que una consulta frecuente sea simple y rápida. Como el único sitio que lo calcula es el hook, no se puede desincronizar mientras los cambios pasen por `save()`.

### 10.4. Mostrar el autor de cada solución sin `populate`

**Problema:** el detalle de un error muestra el nombre del autor de cada solución. Con referencias habría que hacer `populate('solutions.author')`, que obliga a buscar varios usuarios en cada lectura.

**Solución:** cada solución guarda una **copia** de su autor (`{ id, username }`). El nombre viene en el token, así que al crear la solución tampoco hace falta consultar la base de datos. El riesgo de copiar es que el dato se quede desactualizado, pero aquí no existe: la API no permite cambiar el username. Si algún día se permitiera, habría que actualizar las copias (`updateMany` con `arrayFilters`), o volver a la referencia.

### 10.5. Errores que todavía no tienen solución

**Problema:** obligar a dar una solución al registrar un error haría que la gente no registrara los que no sabe resolver, que son justo los más interesantes.

**Solución:** `solutions` puede estar vacío. El filtro `?solved=false` (`{ solutions: { $size: 0 } }`) los encuentra, y cualquiera, incluido su autor, puede añadir la solución más tarde.

### 10.6. Filtros sobre arrays y subdocumentos

**Problema:** "errores con alguna solución verificada" parece pedir recorrer los arrays de soluciones.

**Solución:** MongoDB lo resuelve en la consulta con **notación de punto**: `{ 'solutions.verified': true }` encuentra los documentos en los que **algún** elemento de `solutions` tiene `verified: true`. Y `{ 'solutions.0': { $exists: true } }` comprueba que existe la primera posición, es decir, que hay al menos una solución.

### 10.7. Asignación masiva

**Problema:** `BugModel.create(req.body)` permitiría enviar `"author": "<id de otro>"` o `"solutions": [...]` con soluciones ya verificadas, y `User.create(req.body)` permitiría registrarse como admin.

**Solución:** listas blancas de campos (`pickFields`) en cada endpoint y rechazo explícito en `PATCH` (ver [4.7](#47-campos-que-se-pueden-escribir)). El `author` siempre sale del token, nunca del body.

### 10.8. Búsqueda de texto con caracteres especiales

**Problema:** buscar `fetch(` o `.map(` construye una RegExp inválida y la consulta falla con un 500.

**Solución:** `escapeRegex` antes de construir la expresión, y longitud limitada (ver [6.9](#69-búsqueda-segura)).

### 10.9. Una API pública, pero no para cualquiera

**Problema:** si la API se despliega para que la usen varias promociones, cualquiera que la encuentre podría registrarse y llenarla de basura.

**Solución:** la lectura es pública, pero registrarse requiere el `REGISTRATION_CODE`, que se cambia cada curso en el `.env`. Además, el admin puede borrar cualquier contenido.

### 10.10. Dos personas modificando el mismo error a la vez

**Problema:** dos peticiones leen el mismo documento, cada una añade algo y guarda. La segunda en guardar podría sobrescribir lo que hizo la primera (*lost update*).

**Solución:** `optimisticConcurrency: true` en el esquema. Mongoose comprueba al guardar que la versión del documento (`__v`) no ha cambiado desde que se leyó. Si ha cambiado, lanza `VersionError` y la API responde **409** `CONFLICT`, para que el cliente reintente. En una clase es raro que pase, pero cuesta una línea.

### 10.11. Que el frontend pueda hablar con la API

**Problema:** el navegador bloquea las peticiones del frontend (`localhost:5173`) a la API (`localhost:3000`) por la política de mismo origen. En Postman funciona, en el navegador no.

**Solución:** paquete `cors` con el origen del frontend en `FRONTEND_URL`. Es, por cierto, el primer error que conviene registrar en la Bugpedia 🐛.

### 10.12. TypeScript sin compilar, y una versión en JavaScript

**Problema:** se quería usar TypeScript sin configurar compiladores ni herramientas extra, y que el mismo proyecto sirviera como referencia para quien trabaje en JavaScript.

**Solución:** Node.js ejecuta archivos `.ts` directamente eliminando los tipos (*type stripping*). Se usa solo sintaxis "borrable" (anotaciones, interfaces, `import type`), así que la versión JavaScript es el mismo código sin las anotaciones (ver [Anexo A](#a4-typescript-sin-compilar)).

---

## 11. Mejoras futuras

- **Búsqueda con índice de texto** (`$text`) en lugar de RegExp: más rápida con muchos errores y ordenable por relevancia.
- **Perfiles:** "mis errores" (ya posible con `?author=`) y "mis soluciones", que requeriría una agregación (`$unwind` de `solutions` y `$match` por autor) por estar embebidas.
- **Reputación:** puntos por soluciones verificadas y votos recibidos, y un ranking de "cazadores de bugs".
- **Capturas de pantalla:** subida de imágenes a un servicio externo (p. ej. Cloudinary), guardando solo la URL.
- **Markdown** en descripciones y soluciones, renderizado en el frontend.
- **Detección de duplicados:** al registrar, sugerir errores con un `errorMessage` parecido.
- **Editar soluciones con historial**, invalidando los votos si el contenido cambia mucho.
- **Notificaciones** al autor cuando su error recibe una solución.
- **Seguridad:** limitar los intentos de login (`express-rate-limit`), cabeceras con `helmet`, *refresh tokens* y un sistema de invitaciones de un solo uso en lugar de un código compartido.
- **Tests de integración** con Supertest y `mongodb-memory-server`, aprovechando que `app.ts` está separado de `index.ts`.
- **Documentación con Swagger/OpenAPI**.
- **Panel de administración** con vistas.
- **Borrado suave** (*soft delete*): marcar como borrado en lugar de eliminar, para poder recuperar contenido moderado por error.

---

## 12. Plan de implementación

El proyecto se construye en fases. **Cada fase deja la API funcionando**, y las ampliaciones son independientes entre sí.

### Fase 0: preparación
1. `npm init`, `"type": "module"`, dependencias (ver [Anexo A](#a1-dependencias)).
2. `tsconfig.json`, `.env.example`, `.gitignore` y scripts del `package.json`.
3. `config/env.ts`, `config/db.ts` y `config/constants.ts`.
4. `app.ts` con `GET /api/health`, `notFound` y `errorHandler`; `index.ts`.

✅ *Comprobación:* `npm run dev` y `GET /api/health` → 200.

### Fase 1: usuarios y autenticación
1. `utils/HttpError.ts` y `types/express.d.ts`.
2. `models/user.model.ts` (hash, `comparePassword`, `toJSON`) y `repositories/user.repository.ts`.
3. `middlewares/authenticate.ts` y `requireRole.ts`, y `middlewares/index.ts`.
4. `auth.controller.ts` y `auth.routes.ts`: `register` (con código), `login` y `me`.
5. `scripts/seed-admin.ts`.

✅ *Comprobación:* registro, login, `/me` con y sin token; seed del admin.

### Fase 2: errores (CRUD)
1. `models/bug.model.ts` (con el subesquema de soluciones ya definido) y `repositories/bug.repository.ts`.
2. `utils/permissions.ts`, `pickFields.ts`, `escapeRegex.ts` y `buildBugQuery.ts`.
3. `bug.controller.ts` y `bug.routes.ts`: `list`, `getById`, `create`, `update` y `remove`.

✅ *Comprobación:* crear, listar con filtros, editar (propio, ajeno y como admin) y borrar.

### Fase 3: soluciones y verificación
1. `utils/sortSolutions.ts`.
2. `solution.controller.ts`: `create`, `remove` y `verify` (admin).

✅ *Comprobación:* **aquí se cumplen todos los requisitos mínimos.**

### Fase 4: tests
Tests unitarios de la [sección 9](#9-testing).

### Fase 5: documentación
`README.md`, colección de Postman y prueba de humo.

### Fase 6: ampliaciones (cualquier orden)
- **A1.** "A mí también": `addSighting` y `removeSighting`, más `sort=sightings`.
- **A2.** Votos: `vote` y `unvote`.
- **A3.** `GET /api/meta`.

> Si alguna ampliación no da tiempo, el resto del proyecto no se ve afectado: el modelo ya tiene los campos (`sightings`, `votes`) con sus valores por defecto, y solo faltan sus rutas y controladores.

---

## Anexo A: configuración, scripts y TypeScript

### A.1. Dependencias

```bash
npm install express mongoose jsonwebtoken bcrypt cors
npm install -D typescript vitest @vitest/coverage-v8 @types/node @types/express @types/jsonwebtoken @types/bcrypt @types/cors
```

| Paquete | Uso |
|---|---|
| `express` (5.x) | Servidor HTTP y rutas |
| `mongoose` (9.x) | ODM para MongoDB |
| `jsonwebtoken` | Firmar y verificar JWT |
| `bcrypt` | Hash de contraseñas (alternativa en JavaScript puro, si da problemas al instalar: `bcryptjs`) |
| `cors` | Permitir peticiones del frontend |
| `typescript` | Solo para comprobar tipos (`tsc --noEmit`) |
| `vitest` + `@vitest/coverage-v8` | Tests y cobertura |
| `@types/*` | Tipos para TypeScript |

No hace falta `dotenv`: Node carga el `.env` con `--env-file`.

**Requisito:** Node.js ≥ 22.18 (recomendado 24 LTS) y MongoDB (local, Docker o MongoDB Atlas).

> Si al ejecutar los tests aparece `Cannot find native binding` (un fallo conocido de npm con dependencias opcionales), basta con borrar `node_modules` y `package-lock.json` y volver a ejecutar `npm install`.

### A.2. Variables de entorno (`.env.example`)

```bash
# Servidor
PORT=3000
FRONTEND_URL=http://localhost:5173

# Base de datos
MONGODB_URI=mongodb://localhost:27017/bugpedia

# Autenticación
JWT_SECRET=cambia-esto-por-una-cadena-larga-y-aleatoria
JWT_EXPIRES_IN=7d

# Código que hay que dar para poder registrarse (cámbialo cada curso)
REGISTRATION_CODE=BUGS-2026

# Primer admin (npm run seed:admin)
ADMIN_USERNAME=profe
ADMIN_EMAIL=profe@bugpedia.dev
ADMIN_PASSWORD=cambia-esto-tambien
```

`config/env.ts` lee estas variables al arrancar y **falla de inmediato** con un mensaje claro si falta alguna obligatoria (`MONGODB_URI`, `JWT_SECRET`, `REGISTRATION_CODE`).

### A.3. Scripts (`package.json`)

```json
{
  "type": "module",
  "engines": { "node": ">=22.18" },
  "scripts": {
    "dev": "node --watch --env-file=.env src/index.ts",
    "start": "node --env-file=.env src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage",
    "seed:admin": "node --env-file=.env scripts/seed-admin.ts",
    "smoke": "node --env-file=.env scripts/smoke.ts"
  }
}
```

### A.4. TypeScript sin compilar

Node.js (≥ 22.18) ejecuta archivos `.ts` directamente: elimina las anotaciones de tipos y ejecuta el JavaScript que queda (*type stripping*). No hay paso de compilación. A cambio:

| Regla | Motivo | En la práctica |
|---|---|---|
| Los imports llevan extensión `.ts` | Node no adivina extensiones | `import { HttpError } from '../utils/HttpError.ts'` |
| No se usan `enum` | Generan código, no se pueden "borrar" | Arrays `as const` (ver [3.2](#32-constantes-compartidas)) |
| No se usan *parameter properties* | Generan código | Declarar los campos y asignarlos en el constructor |
| Los imports de solo tipos llevan `import type` | Para que Node sepa que puede eliminarlos | `import type { Request } from 'express'` |
| Node no comprueba los tipos | Solo los elimina | `npm run typecheck`, o confiar en el editor |

`tsconfig.json` mínimo:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests", "scripts"]
}
```

- `erasableSyntaxOnly`: el editor avisa si se usa sintaxis que Node no puede ejecutar.
- `verbatimModuleSyntax`: obliga a escribir `import type` donde corresponde.

### A.5. Versión en JavaScript

La versión JavaScript tiene **exactamente la misma estructura**. Para obtenerla:
1. Cambiar las extensiones `.ts` por `.js` (también en los imports).
2. Quitar las anotaciones de tipos, las `interface`/`type` y los `import type`.
3. Borrar `tsconfig.json`, `src/types/` y los paquetes `typescript` y `@types/*`.

Opcionalmente, se pueden conservar los tipos como comentarios **JSDoc** (`/** @param {string} id */`), que el editor entiende igualmente.

### A.6. Colección de Postman

`postman/Bugpedia.postman_collection.json` incluye todas las peticiones organizadas por carpetas, con las variables `{{baseUrl}}`, `{{token}}`, `{{adminToken}}`, `{{bugId}}` y `{{solutionId}}`. Las peticiones de login y de creación guardan automáticamente el token y los ids en esas variables, así que se pueden ejecutar en orden sin copiar nada a mano.

---

## Anexo B: correspondencia con los requisitos

| Requisito | Dónde se cumple |
|---|---|
| README con instalación, `.env.example`, arranque y tests | `README.md`, `.env.example` |
| Memoria con los puntos pedidos | Este documento |
| MongoDB + Mongoose con validaciones (`required`, `enum`, `min`/`max`...) | [3.3](#33-esquema-user), [3.4](#34-esquema-bug), [3.5](#35-subesquema-solution) |
| ≥ 3 entidades, ≥ 2 colecciones | `User` y `Bug` (colecciones), `Solution` (embebida) |
| Relación con `ObjectId` + `populate()` | `Bug.author` → `User` |
| Subdocumentos embebidos | `Bug.solutions` |
| Registro y login con bcrypt y JWT | [6.1](#61-registro) – [6.3](#63-el-token-jwt) |
| Roles `user`/`admin` guardados en el usuario | `User.role` |
| Middleware que restringe al menos una ruta a admin | `requireRole('admin')` en `PATCH .../verify` |
| Un usuario solo modifica o borra lo suyo; el admin, todo | `isOwnerOrAdmin` en `PATCH` y `DELETE` de errores y soluciones |
| ≥ 3 endpoints además de login y registro, ≥ 2 que modifican la BD | 9 en el núcleo, 6 de ellos de escritura |
| Rutas, controladores y modelos separados en carpetas | [5.1](#51-estructura-de-carpetas), más una capa de repositorios ([5.3](#53-la-capa-de-repositorios)) |
| Códigos 200, 201, 400, 401, 403, 404 y manejador centralizado | [8](#8-gestión-de-errores) |
| ≥ 4 tests unitarios sin BD (middleware de autorización + función propia) | [9.2](#92-qué-se-prueba-y-por-qué) |
| *Recomendado:* filtrado por query params | `GET /bugs?technology=&minDanger=&solved=&verified=&search=&author=` |
| *Recomendado:* JSDoc en controladores, repositorios y middlewares | En el código |
| *Recomendado:* colección de Postman | `postman/` |
| *Bonus:* paginación | `?page=&limit=` |
| *Bonus:* ordenación | `?sort=recent\|sightings\|danger` |
