// Datos iniciales de Bugpedia.
// Mongo ejecuta este script automáticamente SOLO la primera vez que arranca con el volumen vacío
// (carpeta /docker-entrypoint-initdb.d). Para volver a ejecutarlo: docker compose down -v && docker compose up
//
// Se ejecuta con mongosh dentro del contenedor: "db" es la base de MONGO_INITDB_DATABASE (bugpedia).
//
// Todos los usuarios tienen la contraseña "supersecreta".
// Aquí no hay bcrypt, así que guardamos directamente su hash (generado con bcrypt.hash("supersecreta", 10)).
const PASSWORD_HASH = "$2b$10$ji280zdAqkxuv5tjkCmq0uKZ3Xp.eAUOGKoB7kCJ3IGtvsh434HZK";

const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

// ─── Usuarios ────────────────────────────────────────────────────────────────

const profe = { _id: new ObjectId(), username: "profe", email: "profe@bugpedia.dev", role: "admin" };
const ana = { _id: new ObjectId(), username: "ana", email: "ana@ejemplo.com", role: "user" };
const bea = { _id: new ObjectId(), username: "bea", email: "bea@ejemplo.com", role: "user" };
const carlos = { _id: new ObjectId(), username: "carlos", email: "carlos@ejemplo.com", role: "user" };

db.users.insertMany(
  [profe, ana, bea, carlos].map((user) => ({
    ...user,
    password: PASSWORD_HASH,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    __v: 0,
  })),
);

// ─── Bugs ────────────────────────────────────────────────────────────────────

/** Una solución embebida: el autor va COPIADO ({ id, username }), igual que en la API */
const solution = (author, text, { code, verified = false, days = 1 } = {}) => ({
  _id: new ObjectId(),
  text,
  ...(code ? { code } : {}),
  author: { id: author._id, username: author.username },
  verified,
  createdAt: daysAgo(days),
  updatedAt: daysAgo(days),
});

/** Un bug: el autor va REFERENCIADO (solo su _id) */
const bug = (author, data, solutions = [], days = 7) => ({
  ...data,
  author: author._id,
  solutions,
  createdAt: daysAgo(days),
  updatedAt: daysAgo(days),
  __v: 0,
});

db.bugs.insertMany([
  bug(
    ana,
    {
      name: "El CORS Salvaje",
      errorMessage:
        "Access to fetch at 'http://localhost:3000/api/bugs' from origin 'http://localhost:5173' has been blocked by CORS policy",
      description: "El front no puede hablar con la API. En Postman funciona, pero en el navegador no.",
      code: "fetch('http://localhost:3000/api/bugs')",
      technologies: ["express", "react"],
      dangerLevel: 4,
    },
    [
      solution(bea, "Instalar el paquete cors en la API y añadir app.use(cors()) antes de las rutas.", {
        code: 'import cors from "cors";\napp.use(cors());',
        verified: true,
        days: 6,
      }),
    ],
    7,
  ),
  bug(
    ana,
    {
      name: "El Puerto Okupa",
      errorMessage: "Error: listen EADDRINUSE: address already in use :::3000",
      description: "Al arrancar la API dice que el puerto 3000 está ocupado, aunque no tengo nada abierto.",
      technologies: ["node", "express"],
      dangerLevel: 2,
    },
    [
      solution(carlos, "Hay otro proceso usando el puerto. En Mac o Linux: lsof -i :3000 para ver el PID y kill -9 <PID>.", {
        code: "lsof -i :3000\nkill -9 <PID>",
        days: 5,
      }),
      solution(ana, "Si no lo encuentras, cambia el puerto de la API en el .env y en el docker-compose.", { days: 4 }),
    ],
    6,
  ),
  bug(
    bea,
    {
      name: "El Undefined Fantasma",
      errorMessage: "TypeError: Cannot read properties of undefined (reading 'map')",
      description: "La página se rompe al cargar. Pasa en el primer render, antes de que llegue la respuesta de la API.",
      code: "const [bugs, setBugs] = useState();\n...\n{bugs.map((bug) => <BugCard bug={bug} />)}",
      technologies: ["react", "javascript"],
      dangerLevel: 3,
    },
    [
      solution(ana, "Inicializa el estado con un array vacío: useState([]). En el primer render todavía no hay datos.", {
        code: "const [bugs, setBugs] = useState([]);",
        verified: true,
        days: 3,
      }),
    ],
    5,
  ),
  bug(
    carlos,
    {
      name: "El Await Olvidado",
      errorMessage: "Promise { <pending> }",
      description: "Al hacer console.log del resultado de la consulta sale una promesa en vez de los datos.",
      code: "const bugs = BugModel.find();\nconsole.log(bugs);",
      technologies: ["javascript", "node", "mongodb"],
      dangerLevel: 3,
    },
    [solution(bea, "Falta el await: const bugs = await BugModel.find(); (y la función tiene que ser async).", { days: 2 })],
    4,
  ),
  bug(
    bea,
    {
      name: "El Push Rechazado",
      errorMessage: "! [rejected] main -> main (fetch first)",
      description: "No me deja hacer git push: dice que el remoto tiene cambios que yo no tengo.",
      technologies: ["git"],
      dangerLevel: 2,
    },
    [
      solution(profe, "Trae primero los cambios del remoto con git pull --rebase, resuelve los conflictos si los hay y vuelve a hacer push.", {
        code: "git pull --rebase\ngit push",
        verified: true,
        days: 1,
      }),
    ],
    3,
  ),
  bug(
    carlos,
    {
      name: "El Mongo Inalcanzable",
      errorMessage: "MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017",
      description: "La API arranca dentro de Docker pero no conecta con Mongo, y eso que el contenedor de Mongo está levantado.",
      technologies: ["mongodb", "node"],
      dangerLevel: 4,
    },
    [], // sin solución todavía: "se busca"
    2,
  ),
  bug(
    ana,
    {
      name: "El Estilo Invisible",
      description: "He añadido una clase en el CSS pero no se aplica, y en las herramientas del navegador aparece tachada.",
      technologies: ["css", "html"],
      dangerLevel: 1,
    },
    [], // sin mensaje de error y sin solución
    1,
  ),
]);

print("✅ Bugpedia: datos iniciales cargados (4 usuarios y 7 bugs)");
