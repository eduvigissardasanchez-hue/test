# Del Pla al Seguiment · COMPLET_V1

Novel·la visual en català per treballar el procés, els rols i les decisions de MideNet. Seguim la Delegació del Govern a França, el Pla de Treball 2027 i la missió institucional a París de juny.

Obre **joc.html** en un navegador. És un HTML independent amb totes les imatges i el motor incrustats; no necessita instal·lació ni connexió per jugar. També es pot servir com una pàgina web. A GitHub, descarrega el fitxer amb **Download raw file**: la pàgina de codi de GitHub no executa el joc.

Hi ha nou capítols i nou decisions: quatre de Planificació i cinc de Seguiment. Les respostes incorrectes tenen una conseqüència explicada i continuen la història. Els reptes combinen tres opcions, comparació de dues propostes, selecció múltiple i ordenació. La durada objectiu és d’uns cinc minuts; és una estimació pendent de contrastar amb participants.

El joc adapta la composició a ordinador i mòbil. El menú agrupa els capítols per itinerari i permet tornar als que ja s’han assolit. La capçalera identifica l’itinerari, el capítol i el pas actual.

La partida es desa automàticament en el mateix navegador. **Continuar la partida** reprèn l’escena i les seleccions parcials. **Nova partida** demana confirmació dins del joc i substitueix el progrés. El desat depèn de l’emmagatzematge del navegador: esborrar-lo, canviar d’origen o de navegador no trasllada la partida. Si l’emmagatzematge està bloquejat, es pot jugar i la capçalera avisa que no s’ha pogut desar. No s’envien resultats a cap plataforma.

## Regenerar el joc

Només cal Python 3.10 o posterior; el generador utilitza la biblioteca estàndard.

```sh
python build.py
python build.py --zip /tmp/Del_Pla_al_Seguiment_COMPLET_V1.zip
```

El ZIP inclou el joc autònom, les fonts, les imatges i la documentació. Consulta **GUIA_DE_REUTILITZACIO.md** per modificar els continguts. La interfície d’edició senzilla es farà després de revisar i aprovar el contingut client.

## Verificació

**VALIDACIO.json** recull les comprovacions del navegador. Per repetir-les cal instal·lar Playwright i tenir Chromium disponible:

```sh
python -m pip install playwright
CHROMIUM=/usr/bin/chromium python tests/check_game.py
```

Les proves recorren els nou casos, totes les alternatives incorrectes, el menú, el reinici, la persistència i cinc mides de pantalla. El guió i el pressupost de temps es documenten a **GUIO.md** i **CRITERIS_I_TEMPS.md**. Les proves automàtiques no mesuren el temps de lectura real d’una persona.
