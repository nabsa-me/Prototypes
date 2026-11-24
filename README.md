# Prototypes

Small prototypes built for job interviews and practice.
Each folder is an independent project with its own `package.json` and dependencies.

## Prototypes

| Project | Branch | Description | Stack |
|---|---|---|---|
| [Fita](https://github.com/Noabsa/Prototypes/tree/prototype/fita/fita) | `prototype/fita` | Engine for web map viewers configured through JSON: a public viewer for ICGC products, an internal inbox to review the errors reported by users, and an embeddable viewer for an external client | TypeScript, Svelte 5, Vite, MapLibre GL JS, Fastify, SQLite (`node:sqlite`), Zod |

## Running a prototype

Each prototype lives in its own branch, `prototype/<name>`, inside a folder with the same
name. Its own README lists the requirements, any setup needed before starting it, and the
test accounts.

```bash
git clone https://github.com/Noabsa/Prototypes.git
cd Prototypes
git checkout prototype/<name>
cd <name>
npm install
npm start
```

## Downloading a single prototype

```bash
npx degit <username>/Prototypes/<prototype> <prototype>
```
