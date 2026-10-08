# Criteri per a l’editor final

Primer treballarem sobre aquesta base, ampliant o reduint contingut i tancant el recorregut dels dos itineraris. Quan la versió client estigui aprovada, crearem la versió editable.

La versió editable haurà de representar exactament la mateixa història i composició que la versió client. Utilitzarà el mateix motor, els mateixos continguts, les mateixes imatges i la mateixa paleta. L’edició canviarà les dades del joc, sense mantenir una segona interpretació de les pantalles.

La interfície serà senzilla: seleccionar una escena o un element des d’una llista, editar els camps corresponents i veure el resultat amb el motor del joc. No cal recuperar el format Canva ni els controls de moviment, rotació o profunditat de l’editor anterior.

La primera versió de l’editor haurà de permetre:

- Canviar els textos de portada, diàlegs, preguntes, opcions i conseqüències.
- Substituir fons i imatges dels personatges i gestionar-ne les expressions.
- Canviar noms dels actors i colors del joc.
- Afegir, duplicar, eliminar o reordenar contingut i revisar els salts entre escenes.
- Desar un projecte reutilitzable amb les seves dades i recursos.
- Exportar un HTML client autònom i una versió editable que es pugui tornar a obrir.

El desament de l’editor serà el del projecte; el desament automàtic del jugador continuarà sent el de la partida. Són dades diferents i han de romandre separades.

Abans de donar l’editor per acabat, comprovarem que les pantalles de la versió client i les de la previsualització editable coincideixin, que editar no canviï l’escala o les posicions, i que els exports es puguin tornar a obrir sense perdre recursos ni contingut.

Aquest document fixa el criteri de treball futur. La BASE_01 inclou els fitxers de contingut i el motor preparats per a aquesta separació; encara no inclou la interfície d’edició.
