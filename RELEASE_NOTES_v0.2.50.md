# Authproxycaller v0.2.50

## Änderungen seit v0.2.45

- Companion-App-Aufrufe übergeben den DeepUnity-Ordnerpfad jetzt als `path=...` statt `diagnostPath=...`.
- Der Wert von `path=...` wird immer in doppelte Anführungszeichen gesetzt, auch ohne Leerzeichen im Pfad.
- Der Auth-Proxy-Parameter wurde vollständig auf `realm=...` umgestellt; alte IDP-Bezeichnungen wurden aus Oberfläche, Hinweisen, Testdaten und aktiven Feldnamen entfernt.
- Der Beispielwert für Realm lautet jetzt nur noch `REALM`.
- Im Header gibt es einen klar sichtbaren `GitHub`-Link zum Repository; die Versionsnummer bleibt zusätzlich verlinkt.
- Docker-Metadaten und sichtbare App-Version stehen auf `0.2.50`.

## Prüfung

- `node --check src/app.js`
- `node --check src/builder.js`
- XML-Lint für Sprach- und Hinweisdateien
- `npm test`: 23/23 erfolgreich
- Lokales Testsystem: `authproxycaller:0.2.50` auf Port `18081`, healthy
