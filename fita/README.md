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

## Serveis de l'ICGC a través del backend

La fitxa del punt (`GET /api/point-info`) i el cercador (`GET /api/search`) consulten l'API
Territorial i el Geocodificador de l'ICGC des del backend, no des del navegador:

- Un sol endpoint agrega diverses fonts: municipi i comarca (API Territorial), adreça més
  propera (Geocodificador, cerca inversa) i coordenades en ETRS89 UTM 31N i WGS84.
- El contracte propi aïlla el frontend dels canvis dels serveis externs: si un servei
  canvia, només canvia el seu adaptador.
- Es degrada amb elegància: les fonts es consulten amb `Promise.allSettled` i la fitxa surt
  amb el que hagi respost, indicant quina font ha fallat. Un error que no és del servei
  extern (un defecte del codi) no s'amaga: la petició respon 500.

El cercador no es pot degradar: si el Geocodificador no respon, l'API respon 503; si
respon fora del seu contracte, 502. Un 4xx del servei vol dir que la petició és incorrecta
i es tracta com un defecte (500).

Cada crida té un temps límit de 4 s i cap reintent. De l'API Territorial s'usa l'endpoint
documentat `/territorial/elements/municipis/{lon},{lat}?skipgeometry=true`: una sola
petició sense geometria retorna el municipi i la seva comarca.

L'altitud no ve del backend: el navegador la llegeix del model d'elevacions de 5 m que ja
pinta el relleu 3D (`queryTerrainElevation`). És aproximada, perquè depèn del nivell de
zoom de les tessel·les carregades.

## Fonts i llicències de dades

- **Contorn de Catalunya** (`packages/geo/src/catalonia-boundary.ts`): Institut Cartogràfic i
  Geològic de Catalunya, «Divisions administratives: Catalunya»
  (`divisions-administratives-v2r2-20260120`), col·lecció `catalunya` de l'API Territorial.
  Llicència [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ca). Es conserven
  el territori continental i Llívia (els únics polígons de més d'1 km²) i se simplifica amb
  `npx mapshaper -simplify 0.3% keep-shapes` fins a 977 vèrtexs. Límit conegut: respecte
  del contorn original, la mediana de l'error és de 50 m, el percentil 95 de 300 m i el
  màxim d'1,2 km. Un punt molt a prop de la costa o de la frontera es pot classificar
  malament.
- **Mapes base, ortofoto i model d'elevacions**: serveis ContextMaps de l'ICGC, amb
  l'atribució que mostra cada mapa.
