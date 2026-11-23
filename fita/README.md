# Fita

Motor de visors web de mapes configurables per JSON, amb un backend Node. Un sol motor
munta tres visors: un de públic per als productes de l'ICGC, una safata interna per revisar
els errors que reporten els usuaris i un visor insertable per a un projecte extern.

## Requisits

- Node.js 24 LTS (24.15 o posterior). `npm install` falla amb una altra versió
  (`engine-strict`).

## Arrencada

```
npm install
npm start
```

`npm start` aixeca dos processos:

| Procés | Adreça                  |
| ------ | ----------------------- |
| API    | `http://127.0.0.1:4791` |
| Web    | `http://127.0.0.1:5791` |

Els ports i les URL es declaren a `.env.example`. Per canviar-los, copia'l a `.env`; si no
hi ha `.env`, s'usa `.env.example`.

Tests:

- `npm test`: comprovació de tipus (TypeScript i Svelte) i tests amb cobertura.
- `npm run lint`: ESLint i comprovació de format amb Prettier. `npm run format` aplica el
  format.

Sense Docker: l'aplicació no depèn de cap servei propi que calgui contenir (la
persistència serà un fitxer SQLite de `node:sqlite`) i el prototip s'executa en local.
