# Priečinok na dokumenty

Sem nahrajte PDF súbory, na ktoré odkazuje stránka `dokumenty.html`.
Názvy súborov musia sedieť presne, inak sa odkaz zobrazí ako nefunkčný:

| Súbor                                 | Obsah                                              |
|---------------------------------------|----------------------------------------------------|
| `osvedcenie-rsp.pdf`                  | Osvedčenie o priznaní štatútu RSP                   |
| `vypis-orsr.pdf`                      | Výpis z obchodného registra                         |
| `vyrocna-sprava-2024.pdf`             | Výročná správa za posledný uzavretý rok             |
| `zakladatelska-listina.pdf`           | Zakladateľská listina v platnom znení               |
| `potvrdenie-nahradne-plnenie.pdf`     | Vzor potvrdenia pre odberateľa                      |
| `gdpr-zasady.pdf`                     | Zásady ochrany osobných údajov                      |

Odporúčania:

- Súbory pomenúvajte bez diakritiky a bez medzier.
- Skenované dokumenty prežeňte cez OCR, aby sa v nich dalo vyhľadávať.
- Pred zverejnením začiernite osobné údaje, ktoré tam nemajú čo robiť
  (rodné čísla, adresy trvalého pobytu, podpisy fyzických osôb).
- Ak niektorý dokument mať nebudete, odstráňte príslušný blok
  `<div class="doc-item">…</div>` zo súboru `dokumenty.html`.
