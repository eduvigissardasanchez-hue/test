# Reutilitzar la plantilla

## On es modifica cada cosa

| Què vols canviar | Fitxer |
| --- | --- |
| Títol, marca, presentació i identitat del joc | src/joc.json |
| Diàlegs, decisions, conseqüències, capítols i itineraris | src/historia.json |
| Noms dels actors i imatges de les seves expressions | src/personatges.json |
| Fons, sprites i altres imatges | src/assets.json i src/assets/ |
| Paleta de colors | src/colors.json |
| Composició i tipografia | src/estils.css i les dades dels elements a historia.json |
| Funcionament de la novel·la visual | src/motor.js |

Els JSON estan escrits amb sagnat perquè siguin fàcils de revisar. Per canviar els continguts habituals no cal tocar el motor.

## Una història nova

Duplica la carpeta del paquet i canvia **gameId** a joc.json: per exemple, `missio-roma-2028`. Aquest identificador separa les partides de cada joc. La BASE_01 manté `missio-paris-2027` i l’espai `midenet`, compatibles amb el desament de la V15 quan s’obre sota el mateix origen.

Mantén el mateix gameId per revisar la mateixa història; canvia’l si crees un joc diferent o una versió amb un recorregut incompatible. Els identificadors d’escena també han de ser estables si vols conservar les partides entre revisions. Si s’elimina l’escena desada, el joc ofereix començar de nou.

La portada es configura amb **cover.titleLines**, **cover.setting** i **cover.descriptionLines**. Cada entrada de titleLines ocupa una línia. Els textos són text pla; no cal escriure HTML. **coverSceneId** identifica la portada i **startSceneId** la primera escena de la història.

## Personatges i imatges

A personatges.json cada actor té un identificador estable, un nom, un rol i una llista d’expressions. Els sprites de les escenes indiquen **actorId** i **expression**. Els diàlegs indiquen **actorId** per mostrar el nom del personatge. El generador resol aquestes referències en exportar el joc.

Per substituir una il·lustració, posa el fitxer nou dins src/assets/ i canvia el seu camí a assets.json. Per afegir un fons nou, afegeix una clau al registre i fes-la servir com a **assetKey** de l’element background de l’escena. Els fitxers es converteixen en imatges incrustades: el HTML exportat no necessita la carpeta assets/.

Canviar el nom d’un actor actualitza el nom de qui parla i la identitat del seu sprite. Revisa també els diàlegs que esmenten aquest nom dins de les frases: aquests textos formen part de la narració i s’editen a historia.json.

Les coordenades dels elements són percentatges d’una escena de 1440 × 810, que s’escala uniformement. Els personatges amb **anchorDialogue: true** s’ancoren al diàleg mitjançant anchorId i anchorOverlap. El personatge inactiu conserva la mida i la posició, amb menys opacitat i brillantor. Les imatges noves poden tenir proporcions diferents; comprova’n l’encaix en la previsualització del joc.

## Textos i colors

A historia.json, els diàlegs es troben als elements **dialogue**, camp **text**. Les preguntes, instruccions i opcions són als elements **choices**. La portada té els seus textos a joc.json.

A colors.json, els colors tenen format **#RRGGBB**. accent i accentHover controlen el vermell principal i el seu estat actiu; ink i muted els tons foscos; surface el blanc; border les vores; soft, disabled i secondary els grisos de suport. El generador aplica la paleta als estils i als colors de les escenes que fan servir els colors base. Per donar un color propi a un element, canvia el seu camp bg, color o speakerColor a historia.json. Els colors addicionals no vinculats a la paleta es conserven.

En aquest projecte mantindrem la gamma dels entregables: vermell, blanc i grisos.

## Ampliar o reduir el recorregut

**itineraries** defineix les agrupacions del menú. **chapters** defineix els capítols, la seva disponibilitat, escena inicial i passos. Cada escena indica chapterId i stepIndex; els passos es numeren internament des de 0. La capçalera i el menú es generen a partir d’aquestes dades, sense dependre dels noms de MideNet ni d’un nombre fix de capítols.

Per afegir un capítol:

1. Afegeix el capítol i els seus passos a chapters.
2. Afegeix les escenes amb identificadors únics i el chapterId corresponent.
3. Defineix sceneStart i marca available com a true quan sigui jugable.
4. Relaciona els reptes amb el camp challenge del pas corresponent.
5. Comprova la conversa, els reptes i la navegació després de generar el joc.

Per reduir contingut, elimina les escenes que sobren i revisa les referències de destí, els passos i el menú. Si reordenes escenes, revisa també els salts: sense nextScene explícit, una conversa avança a la següent escena ordinària de la llista i omet les escenes branchOnly.

## Decisions i conseqüències

Un repte **single** té almenys dues opcions i una sola resposta correcta. Cada opció inclou label, correct i targetScene. Un destí incorrecte ha de mostrar una conseqüència comprensible i retornar al repte amb nextScene. Usa branchOnly i returnToQuestion per a aquestes escenes.

Un repte **multi** indica les respostes correctes amb correct: true i exigeix que el conjunt seleccionat coincideixi exactament amb aquest conjunt. Defineix successScene, retryScene, hint i submitLabel. Les seleccions parcials es desen automàticament.

Les escenes amb opcions visibles bloquegen l’avanç amb el botó de diàleg i amb el teclat. La resposta s’integra en la història a través de l’escena de conseqüència; no cal afegir una pantalla teòrica.

El generador comprova les referències entre escenes, capítols, actors i imatges, els passos i les respostes correctes. Una generació correcta no substitueix la revisió narrativa: cal provar que els reptes no siguin ambigus i que els textos encaixin i es llegeixin bé.
