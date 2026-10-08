# Reutilitzar el joc

| Contingut | Fitxer |
| --- | --- |
| Títol, portada, marca i identitat del joc | src/joc.json |
| Itineraris, capítols, passos, escenes i decisions | src/historia.json |
| Noms, càrrecs i expressions dels actors | src/personatges.json |
| Imatges i registre dels recursos | src/assets/ i src/assets.json |
| Paleta | src/colors.json |
| Composició i tipografia | src/estils.css i coordenades dels elements |
| Funcionament | src/motor.js |

Els textos són text pla; el motor no interpreta HTML dins del contingut. Un diàleg amb **actorId** resol el nom i el càrrec des de personatges.json. Un sprite resol la imatge amb **actorId** i **expression**. Les referències a noms dins de les frases s’han de revisar manualment quan es canvien actors.

Per crear una història diferent, duplica el paquet i canvia **gameId**. El joc actual usa `midenet.del-pla-al-seguiment.progress` i desat d’esquema 2; la BASE_01 conserva la seva partida separada. Mantén els identificadors d’escena si una revisió ha de conservar la compatibilitat. Canvia gameId si el nou recorregut és incompatible.

Les imatges es col·loquen dins de src/assets/ i es registren a assets.json. El generador les incrusta al HTML. Els personatges s’ancoren al quadre de diàleg amb **anchorDialogue**, **anchorId** i **anchorOverlap**. **imageScale** a l’element sprite permet ajustar l’encaix d’il·lustracions amb proporcions diferents. L’inactiu conserva la composició amb opacitat i brillantor més baixes.

La composició d’ordinador usa coordenades percentuals sobre 1440 × 810 i escala uniforme. A pantalles de fins a 900 píxels d’amplada, els estils reorganitzen l’escena: personatges a dalt, diàleg i opcions llegibles a sota, amb desplaçament vertical quan cal.

**itineraries** agrupa el menú. **chapters** defineix el títol, l’itinerari, sceneStart i steps. Cada escena té **chapterId**, **stepIndex**, elements i el seu destí explícit **nextScene**. No hi ha avanç implícit segons l’ordre del JSON. Una escena amb **isCaseEnd** completa el capítol en avançar al següent; **isStoryEnd** identifica el final. Els capítols es desbloquegen quan la història hi arriba.

## Formats de repte

- **single**: opcions amb label, correct i targetScene; una sola correcta.
- **compare**: la mateixa estructura, mostrada com a propostes A i B.
- **multi**: opcions correct i destins successScene/retryScene. S’exigeix seleccionar el nombre exacte d’opcions indicat; es desa la selecció parcial.
- **order**: items amb id, label i detail; initialOrder i correctOrder són permutacions completes. Les fletxes canvien l’ordre; també es desa el progrés parcial.

En aquesta versió, **retryScene** és el nom tècnic del destí de resposta incorrecta: presenta la conseqüència i continua al cas següent, sense obligar a repetir. Qualsevol resposta completa el repte. No afegeixis un retorn al repte si vols conservar aquest criteri.

Les opcions bloquegen l’avanç de la història fins a respondre. Revisa sempre l’alternativa correcta i els distractors dins del context: el generador valida les referències, però no pot detectar una ambigüitat pedagògica.

Els colors de colors.json tenen format #RRGGBB. El generador aplica els colors base als estils i als elements; els colors particulars es conserven. Mantinguem el vermell, blanc i grisos dels entregables de MideNet.
