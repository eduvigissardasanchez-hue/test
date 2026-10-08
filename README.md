# Del Pla al Seguiment

Joc HTML de formació de MideNet del Departament d’Exteriors, en format novel·la visual. Seguim la Marta i la Júlia de la Delegació del Govern a França i el Pla de Treball 2027, amb la missió institucional a París com a fil conductor.

La versió **COMPLET_V1** inclou els nou casos dels dos itineraris: quatre de Planificació i cinc de Seguiment. Una decisió per cas, conseqüències explicades i continuació de la història. Durada objectiu d’uns cinc minuts, pendent de prova amb participants. Compatible amb ordinador i mòbil, amb desat automàtic en el mateix navegador.

## Descarregar el joc

Els fitxers són a [descarregues/](descarregues/). Obre **Del_Pla_al_Seguiment_COMPLET_V1.html**, prem **Download raw file** i obre’l amb un navegador. Per obtenir també les fonts, baixa el ZIP i descomprimeix-lo; el joc és **joc.html**.

**index.html** és el mateix HTML autònom complet. No necessita biblioteques externes, servidor ni connexió per jugar, i no envia resultats a una plataforma.

## Fonts i versions

- [joc-definitiu/](joc-definitiu/): fonts modulars, generador Python, guió, criteris, pressupost de temps i validació de COMPLET_V1.
- [plantilla-base/](plantilla-base/): plantilla de referència BASE_01, conservada a partir de la V15 aprovada.
- [descarregues/](descarregues/): HTML i ZIP de les dues versions.

Per regenerar el joc complet:

```sh
python joc-definitiu/build.py
```

Textos, actors, imatges i colors estan separats del motor. La futura interfície d’edició sense Canva utilitzarà aquest mateix motor i les mateixes dades, quan el contingut estigui tancat.
