# Fita

Motor de visors web de mapes configurables per JSON, amb un backend Node. Un sol motor
(MapLibre GL JS) munta tres visors a partir de configuracions validades:

- **Visor públic** (`/`): productes de l'ICGC. Mapa ContextMaps, ortofoto i relleu 3D,
  cercador, fitxa de cada punt (municipi, comarca, adreça, altitud i coordenades) i enllaç
  permanent a la vista.
- **Safata interna** (`/intern`): l'equip de producció cartogràfica revisa els errors que
  reporten els usuaris, amb un mapa i una llista sincronitzats i una màquina d'estats.
- **Visor insertable** (`/embed/miradors`): un projecte extern amb la marca del client i
  les seves dades, que arriben en EPSG:25831. Es pot inserir amb un `<iframe>`.

Qualsevol persona pot reportar un error des de la fitxa d'un punt i seguir-ne l'estat amb
un codi a `/seguiment`.

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

El servidor de Vite reenvia `/api` a l'API, així que el navegador parla amb un sol origen i
no cal CORS.

Els ports i les URL es declaren a `.env.example`. Per canviar-los, copia'l a `.env`; si no
hi ha `.env`, s'usa `.env.example`.

| Pàgina                                           | Adreça                         |
| ------------------------------------------------ | ------------------------------ |
| Visor públic                                     | `/`                            |
| Consulta d'una incidència                        | `/seguiment`                   |
| Safata interna (contrasenya `local-admin-token`) | `/intern`                      |
| Visor insertable                                 | `/embed/miradors`              |
| Codi per inserir-lo                              | `/viewers/miradors/embed-code` |

Tests:

- `npm test`: comprovació de tipus (TypeScript i Svelte) i tests amb cobertura. El llindar
  del 90 % de línies i branques s'aplica a `domain`, `application` i `packages/geo`.
- `npm run lint`: ESLint i comprovació de format amb Prettier. `npm run format` aplica el
  format.

## Arquitectura

```
fita/
├── packages/
│   ├── contracts/   esquemes zod de tot el que viatja per HTTP; els tipus se'n deriven
│   └── geo/         reprojecció, punt en polígon, contorn de Catalunya, GeoJSON (RFC 7946)
├── backend/
│   ├── data/viewers/   configuracions dels visors (*.json) i dades dels clients (*.geojson)
│   └── src/
│       ├── main.ts         arrel de composició: crea els adaptadors i els injecta a mà
│       ├── http/           servidor Fastify sense efectes laterals i classificació d'errors
│       ├── shared/         SQLite (node:sqlite) i client HTTP sortint amb temps límit
│       └── features/
│           ├── viewers/     configuracions i importació de dades dels clients
│           ├── point-info/  fitxa del punt (API Territorial + Geocodificador)
│           ├── search/      cercador (Geocodificador)
│           └── reports/     incidències: creació, seguiment, safata i canvis d'estat
└── frontend/src/
    ├── design-system/   tokens CSS i components reutilitzables, sense llibreries d'UI
    ├── map/             motor de visor: crea el mapa a partir d'un ViewerConfig
    └── features/        public-viewer, reports, embedded-viewer
```

Cada funcionalitat del backend té `domain` (regles pures), `application` (casos d'ús que
reben els ports per paràmetre), `ports.ts` i `adapters` (SQLite, HTTP cap a l'ICGC i rutes).
Sense contenidor d'injecció de dependències: el rellotge i el generador de codis també
s'injecten, i així els tests són deterministes. Les dades entren validades a cada frontera:
cos i paràmetres de les peticions, respostes dels serveis externs i respostes que rep el
navegador. Una dada invàlida es rebutja, no es repara.

## Decisions

- **Sense Docker**: l'aplicació no depèn de cap servei propi que calgui contenir (SQLite és
  un fitxer) i el prototip s'executa en local.
- **Sense SvelteKit**: el backend ja és un servei a part (Fastify), així que el frontend és
  una aplicació Svelte 5 amb Vite i un enrutador propi sobre la History API.
- **`node:sqlite`**: ve amb Node i no cal compilar res a Windows. Les consultes per àrea
  usen un índex espacial R*Tree. L'R*Tree desa els límits en coma flotant de 32 bits
  arrodonits cap enfora, així que cada consulta acaba de filtrar amb les columnes exactes.
- **Concurrència optimista** en els canvis d'estat: cada incidència porta `version`, el
  canvi indica la versió que s'ha llegit i, si no coincideix, l'API respon 409.
- **Dades dels clients**: RFC 7946 va eliminar el membre `crs`, així que el sistema de
  referència es declara a la configuració del visor (`EPSG:25831` o `EPSG:4326`). En
  arrencar, el backend valida el GeoJSON, el reprojecta a WGS84, calcula el rectangle de
  cada element i el desa a SQLite. Només torna a importar si canvia el fitxer o el sistema
  declarat. Un fitxer invàlid atura l'arrencada: les dades viatgen amb el codi i un fitxer
  trencat és un defecte.

### Serveis de l'ICGC a través del backend

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

### Safata interna i contrasenya

Les rutes `/api/admin/*` exigeixen la capçalera `x-admin-token` amb la contrasenya
d'`ADMIN_TOKEN` (`local-admin-token` a `.env.example`). El servidor compara els resums
SHA-256 de tots dos valors amb `crypto.timingSafeEqual`. El navegador guarda la contrasenya a
`sessionStorage`.

**Això no és autenticació real.** És un secret compartit: no identifica qui fa cada canvi,
no caduca i no es pot revocar per persona. En producció caldria un proveïdor d'identitat
(OIDC) amb usuaris i rols, i registrar l'autor de cada canvi d'estat.

## Límits coneguts

- **Autenticació**: vegeu l'apartat anterior.
- **Historial**: una incidència guarda el seu estat i l'última nota pública, no l'historial
  de canvis ni qui els va fer.
- **Safata sense paginació**: la llista retorna totes les incidències que compleixen el
  filtre. Amb milers d'incidències caldria paginar.
- **Contorn simplificat**: vegeu «Fonts i llicències». Un punt molt a prop de la costa o de
  la frontera es pot classificar malament.
- **Inserció en webs de tercers**: en local no hi ha capçalera `Content-Security-Policy`.
  En producció caldria `frame-ancestors` amb els dominis dels clients i servir-ho per HTTPS.
- **Sense memòria cau dels serveis de l'ICGC**: cada fitxa consulta els serveis en directe.

## Fonts i llicències de dades

- **Contorn de Catalunya** (`packages/geo/src/catalonia-boundary.ts`): Institut Cartogràfic i
  Geològic de Catalunya, «Divisions administratives: Catalunya»
  (`divisions-administratives-v2r2-20260120`), col·lecció `catalunya` de l'API Territorial.
  Llicència [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ca). Es conserven
  el territori continental i Llívia (els únics polígons de més d'1 km²) i se simplifica amb
  `npx mapshaper -simplify 0.3% keep-shapes` fins a 977 vèrtexs. Respecte del contorn
  original, la mediana de l'error és de 50 m, el percentil 95 de 300 m i el màxim d'1,2 km.
- **Mapes base, ortofoto i model d'elevacions**: serveis ContextMaps de l'ICGC, amb
  l'atribució que mostra cada mapa.
- **API Territorial i Geocodificador**: serveis de l'ICGC consultats en directe. Les
  respostes gravades per als tests són a `backend/src/features/*/adapters/fixtures/`.
- **Ruta dels miradors** (`backend/data/viewers/miradors.geojson`): **dades fictícies**,
  creades per a aquest prototip. Els noms dels miradors són inventats i les coordenades,
  en EPSG:25831, s'han calculat amb PROJ a partir de punts del massís del Montseny.
