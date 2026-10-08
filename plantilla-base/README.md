# Del Pla al Seguiment · BASE_01

Aquesta és la còpia base de treball, a partir de la versió client V15 aprovada. Conserva la portada, la Júlia ajustada, el menú senzill, els reptes, les conseqüències i el desament automàtic.

## Obrir el joc

Obre **joc.html** amb un navegador. És un HTML autònom: les imatges, els textos, els colors i el motor són dins del fitxer. No requereix internet, instal·lació ni comptes. Per compartir-lo amb participants, n’hi ha prou amb aquest fitxer.

Recomanat: ordinador o tauleta en horitzontal. La partida es desa al mateix navegador i dispositiu. Amb fitxers locals, el desament depèn del navegador i de la ubicació del fitxer; convé reobrir el mateix fitxer. En una web, mantén el mateix origen.

## Què conté

- **joc.html**: exemple client que es pot jugar directament.
- **src/**: història, personatges, imatges, colors, estructura i motor separats.
- **build.py**: generador d’un nou HTML autònom; només necessita Python 3.10 o posterior, sense dependències addicionals.
- **GUIA_DE_REUTILITZACIO.md**: com canviar la història i crear una versió nova.
- **EDITOR_FUTUR.md**: criteri acordat per a l’editor que desenvoluparem quan el contingut estigui tancat.

El Capítol 1 és jugable. Els capítols 2–9 continuen pendents de desenvolupar i apareixen desactivats al menú. Aquesta base no afegeix contingut narratiu nou ni representa la versió final del curs.

## Generar un HTML després de fer canvis

Des de la carpeta del paquet:

```sh
python build.py
```

Això genera de nou **joc.html**. Si l’ordre del teu ordinador és `python3`, usa `python3 build.py`.

Per guardar una versió amb un nom diferent:

```sh
python build.py --output Del_Pla_al_Seguiment_V02.html
```

Per generar també un ZIP amb el joc i les fonts:

```sh
python build.py --zip ../Del_Pla_al_Seguiment_BASE_01.zip
```

No editis el joc exportat si vols conservar els canvis per a versions futures: modifica els fitxers de **src/** i torna a generar-lo. Guarda aquesta BASE_01 com a referència i treballa sobre una còpia per ampliar o reduir contingut.

L’editor visual per canviar imatges, textos i colors encara no està inclòs. El motor client ja no conté el codi de l’antic editor Canva; la futura edició utilitzarà el mateix motor que la versió jugable.
