# Graphql Queries

InfoObjekte können Personen über das `persons`-Attribut zugewiesen werden.

Um Personen zu filtern, suchen wir über dieses Feld. Damit werden für dieses Feld alle Personen aus dem Ergebnis entfernt, die nicht der Suche entsprechen.

Damit wir alle autoren erhalten müssen wir den Graph ein zweites Mal traversieren, um alle Personen eines Objekts zu erhalten. Dadurch können wir den hässlichen Kunstgriff mit der doppelten Query vermeiden und die Suche in einem Schritt durchführen. 

Die folgende Abfrage liefert alle Publikationen zum `sdg_3`, an denen Personen aus den  Departementen `G` und `P` mitgearbeitet haben.

```graphql
 1{ 
 2    queryInfoObject(filter: {
 3     sdgs: { in: sdg_3 }
 4   }) @cascade(fields: [ "persons", "category" ] ) {
 5       
 6   persons(filter: { department: { in:  [G, P] } }) {
 7       initials
 8   }
 9
10   category(filter: { name: { eq: "Publication" } } ) {
11      name
12  }
13
14  authors: persons {
15      fullname
16  }
17  year 
18  sdgs { id }
19  link
20      } 
21}
```

Diese Query nutzt sog. [Aliases](https://graphql.org/learn/queries/#aliases), um alle Autoren einer Publikation zu erhalten. 

- In Zeile 2-4 wird die SDG Suche festgelegt. 

- Zeile 4: mit  `@cascade(fields: [ "persons", "category" ] )` wird angezeigt, dass nur gültige Ergebnisse angefragt werden. 

- Zeile 6: Der Personen `filter` legt fest, aus welchen Departementen die Daten angefragt werden sollen. 

- Zeile 7 ist notwendig, damit die `@cascade`-Directive funktionieren kann. 

- Zeile 10-12 filtern auf `InfoObject` vom Typ Publikation.
- Zeile 14: Das  Attribut `persons` wird in authors umgenannt und ungefiltert geladen. Damit wird erreicht, dass alle Autoren geladen werden.

## Der ursprüngliche Ansatz

Unsere Suchen haben drei primäre ankerpunkte:

- sdg suche
- Personen suche 
- Departements suche

Zusätzlich ist eine Begriffssuche über Textfelder angedacht. 


InfoObjekte sind 
- Publikationen, 
- Projekte und 
- Module

Die SDG Begriffssuche ist immer nachgereiht und muss über das `InfoObject` erfolgen. 

Die Namenssuche muss über ein `Person`-Objekt erfolgen. 

Falls eine Suche **keine** Person einbezieht, kann die Suche direkt erfolgen. 

```graphql
query { 
    queryInfoObject(filter: { 
        sdgs: {in: sdg_2 } 
    }) {
        authors {
            fullname
        }
        year 
        sdgs
    } 
}

Eine Departementssuche kann über die Zuordnung eines Informationsobjekts erfolgen und das `department`-Attribut erfolgen.

# Personensuche: 

Falls eine Person eingeschlossen wird, muss die Suche aktuell in zwei Schritten erfolgen. 

Zuerst muss die Suche ausgeführt werden. Der Rückgabewert sind die *Links* der jeweiligen `InfoObject`e. 

```graphql
query { 
    queryPerson(filter: {
        initials: { in: [ "glah", "borz" ] }
    }) @cascade(fields: "objects") {
    objects(filter: { 
        sdgs: {in: sdg_2 } 
    }) {
        link
        } 
    }
}
```

Anschliessend muss der Client diese Links abfragen.

```graphql
query {
    queryInfoObject(filter: {
        link: {
        in: [ 
        "https://digitalcollection.zhaw.ch/handle/11475/24961" ,
        "https://digitalcollection.zhaw.ch/handle/11475/24016" ,
        "https://digitalcollection.zhaw.ch/handle/11475/24961"
    ] } 
    } ) {
        authors {
            fullname
        }
        year 
        sdgs
    }
}
```

Dgraph reduziert automatisch doppelte Links auf ein Objekt. Weil die Anfrage sehr umfangreich sein kann, sollte der Client diese Reduktion direkt durch führen.

```javascript

const links = authorLinks
    .map((author) => author.objects.map((object) => object.link) )
    .flatten()
    .filter((link, idx, akku) => akku.indexOf(link) >= 0);
```

Aus dieser Liste ergibt such auch die Anzahl der jeweiligen Einträge. 
