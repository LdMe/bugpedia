# 🐛📖 Bugpedia

La enciclopedia de errores de la clase. Cuando alguien se encuentra un error de programación, lo registra como si fuera una criatura ("El CORS Salvaje", "El Undefined Fantasma"), con sus síntomas y su peligrosidad. El resto de la clase aporta soluciones y el profesor verifica las buenas.

Es una API REST con **Node.js, Express 5 y MongoDB (Mongoose)**, dockerizada con MongoDB y Mongo Express, documentada con Swagger y JSDoc, y con tests. Sirve de **proyecto de ejemplo** para el backend del curso.

## Dos versiones, el mismo proyecto

| Carpeta | Para quién |
|---|---|
| [`javascript/`](./javascript) | Si haces tu proyecto en JavaScript |
| [`typescript/`](./typescript) | Si haces tu proyecto en TypeScript, o quieres ver qué añaden los tipos |

Las dos tienen **exactamente la misma estructura, el mismo comportamiento y los mismos tests**. La única diferencia son los tipos: abre el mismo archivo en las dos carpetas y compáralos.

Cada carpeta es un proyecto completo e independiente, con su `package.json`, su `docker-compose.yml` y su README. Si quieres usar una como base para tu proyecto, cópiala entera.

## Por dónde empezar

1. **[GUIA.md](./GUIA.md):** qué es imprescindible y qué es extra, en qué orden leer el código, cómo adaptarlo a tu proyecto y retos para ampliarlo. **Empieza por aquí.**
2. **El README de la versión que elijas:** cómo instalarla, arrancarla y probarla.
3. **[MEMORIA.md](./MEMORIA.md):** la memoria técnica, con todas las decisiones de diseño explicadas.

## Arranque rápido

```bash
git clone https://github.com/LdMe/bugpedia.git
cd bugpedia/javascript        # o: cd bugpedia/typescript
cp .env.example .env
docker compose up --build
```

- API: http://localhost:3000/api
- Documentación interactiva (Swagger): http://localhost:3000/docs
- Mongo Express: http://localhost:8081

> ⚠️ **Levanta solo una versión a la vez.** Las dos usan los mismos nombres de contenedor y los mismos puertos. Para cambiar de versión, `docker compose down` en una carpeta y `docker compose up --build` en la otra.

## Estructura del repositorio

```
bugpedia/
├── README.md        # Este archivo
├── GUIA.md          # Guía para usar el proyecto como referencia
├── MEMORIA.md       # Memoria técnica
├── javascript/      # La API en JavaScript
└── typescript/      # La misma API en TypeScript
```
