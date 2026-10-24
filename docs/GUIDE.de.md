# Focus-LYT 1.0.0

Ein eigenständiges Obsidian-Theme: die ausdrucksstarken LYT-Farben treffen auf Border-inspirierte Panels und automatische Bedienelemente. Benötigt **Obsidian 1.8.10 oder neuer**.

## Installation

Den gesamten Ordner **Focus-LYT** aus dem Release-ZIP nach `<Vault>/.obsidian/themes/` kopieren. Darin müssen `theme.css` und `manifest.json` direkt liegen. Anschließend unter **Einstellungen → Darstellung → Themes** „Focus-LYT“ auswählen. Die Lizenz- und Font-Hinweise im Ordner mitführen.

Hell und Dunkel lassen sich über Obsidian umschalten. Das Theme benötigt kein Plugin. DM Sans und DM Mono sind eingebettet und funktionieren offline; eigene Text-, Interface- und Monospace-Schriften können weiterhin in Obsidian gewählt werden.

## Gestaltung

Der dunkle Modus erhält LYT-Cyber-Cyan für Fließtext, Gold für Fettdruck, Lavendel für Kursivschrift, Pink für Links und Mint für Tags. Der helle Modus verwendet warme Papierflächen und entsprechend dunklere Textfarben. Dekorative Linien, Verlaufsakzente und Symbole über dem Notiztitel entfallen. Panels sind eingerahmt, geteilte Ansichten und native Bedienelemente bleiben verwendbar.

Reading View, Live Preview und Source Mode nutzen dieselben semantischen Farben. Code, Tabellen, Properties, Aufgaben und Callouts sind gestaltet; Text bleibt auch bei Auswahl und beim Bearbeiten sichtbar.

## Optionale Einstellungen

Mit dem Community-Plugin **Style Settings** steht der Abschnitt **Focus-LYT** zur Verfügung:

| Bereich | Möglichkeiten |
|---|---|
| Leisten anheften | Alle Auto-Hides gemeinsam pausieren und wiederherstellen |
| Focus appearance | Flaches Layout, Panel-Radius und Abstände |
| Light and dark colors | Schreibfläche, Umgebung, Fließtext, Fett, Kursiv, Links und Tags je Farbmodus |
| Writing focus | Aktuelle/überfahrene Zeile markieren; inaktiven Fließtext dezent abdunkeln, während Syntaxfarben erhalten bleiben |
| Ein- und Ausblenden | Notiz-Tabs, Status, Ribbon, Seitenleisten-Kopf/Suche, Notizkopf, Vault-Profil einzeln ausblenden |
| Phone and tablet | Optionale Tablet-Panels und volle Breite der Telefon-Seitenleisten |
| Motion | Optionale Übergangsdauer für den Schreibfokus; die Fokus-Leiste hat eine eigene kurze Überblendung |

Die sechs Schalter stehen direkt am Anfang unter **Einstellungen → Style Settings → Focus-LYT → Ein- und Ausblenden**. Im unveränderten Theme sind sie standardmäßig **aus**; bestehende persönliche Einstellungen können sie aktivieren. Nach Aktivierung zeigt Mausberührung oder Tastaturfokus die jeweilige Leiste wieder an. Die schmale Auslösefläche bleibt erreichbar. Nur die **Notiz-Tabs** überlagern den Schreibbereich; die Tableisten der Seitenleisten bleiben dauerhaft sichtbar und an festen Positionen. Zum Öffnen die Maus an den oberen Rand der Notiz oder der Fensterknöpfe bewegen (8 px Auslösefläche). Nach 120 ms Verweilen blendet die Leiste in 160 ms ein. Notiz-Tabs und rahmenlose Fensterknöpfe verwenden denselben Zustand. Beim Verlassen bleibt sie 240 ms stehen und blendet dann aus; erneutes Betreten kehrt den Übergang um. Der Notizbereich bleibt unverändert. Die Navigation in einer Seitenleiste löst die Notiz-Leiste nicht aus. Ein geöffnetes Tab-Menü hält die Leiste offen. Die Fensterknöpfe behalten ihre nativen Größen; der untere Rand des freien Bereichs der geöffneten Leiste dient zum Verschieben des Fensters. Anheften stellt eine dauerhaft sichtbare Leiste mit eigenem Platz wieder her. Reduzierte Bewegung schaltet Überblendung und Verzögerungen aus. Auf Mobilgeräten und Touch-only-Geräten setzt das Theme seine Auto-Hides aus. Auch ohne den manuellen Schalter respektiert das Theme die Betriebssystem-Einstellung für reduzierte Bewegung.

Mit der optionalen Begleiterweiterung **Focus-LYT Controls** zeigt ein dezenter Pfeil die Auslösefläche an (48 × 24 px). Nach dem Öffnen verschwindet der Pfeil, damit er keine Tabs verdeckt. Ein Schloss in der Tableiste stellt sie fest und löst sie wieder. Schloss und Tastenkürzel verwenden denselben gespeicherten Style-Settings-Zustand. Die Erweiterung bleibt auf Mobilgeräten ohne Bedienelemente. Installation: den Paketordner `focus-lyt-controls` nach `<Vault>/.obsidian/plugins/` kopieren und in Community-Plugins aktivieren. Sie benötigt Style Settings. Nach der ersten Installation Obsidian neu laden.

**Leisten anheften** pausiert alle Theme-Auto-Hides gemeinsam. Erneutes Umschalten stellt die vorherigen Einzelschalter wieder her. Der Befehl steht in der Befehlspalette; unter **Einstellungen → Tastenkürzel** lässt sich dafür beispielsweise **Strg+Alt+P** belegen. Auf Handy und Tablet bleiben die nativen Touch-Bedienelemente mit und ohne Anheften sichtbar.

Style Settings registriert für jeden Auto-Hide-Schalter zusätzlich einen Befehl in der Befehlspalette. Diese Befehle lassen sich mit Tastenkürzeln belegen. So können auch Leisten wieder eingeblendet werden, deren native Obsidian-Buttons keine Tabulator-Fokusziele sind.

## Beispiel und Prüfung

Das Release-ZIP enthält einen separaten `examples/vault`-Ordner. Als eigenen Vault öffnen und das Theme installieren. **Focus-LYT** zeigt die kurze Notiz aus den Projekt-Screenshots; **Prism Observatory** enthält weitere Beispiele für verschiedene Ansichten.

Das Projekt enthält reproduzierbare Linux-Containertests mit echtem Obsidian/Electron 1.8.10 und 1.14.4 sowie Style Settings 1.0.9. Mobilzustände und Bildschirmgrößen werden darin simuliert. Native iOS-/Android-Geräte sowie macOS-/Windows-Fensterleisten sind damit nicht verifiziert. Individuelle Community-Plugins können eigene Stile benötigen.

## Lizenz und Herkunft

Unabhängige Weiterentwicklung auf Grundlage von LYT Mode (Nick Milo; Designbeiträge von Cecilia May) und Border (Akifyss). Kein offizielles Release der ursprünglichen Projekte. Theme: [MIT](../LICENSE). DM Sans und DM Mono: SIL OFL 1.1, siehe [Drittanbieter-Nachweise](../THIRD-PARTY-NOTICES.md) und `licenses/`.
