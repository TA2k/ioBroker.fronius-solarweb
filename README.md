![Logo](admin/fronius-solarweb.png)

# ioBroker.fronius-solarweb

[![NPM version](https://img.shields.io/npm/v/iobroker.fronius-solarweb.svg)](https://www.npmjs.com/package/iobroker.fronius-solarweb)
[![Downloads](https://img.shields.io/npm/dm/iobroker.fronius-solarweb.svg)](https://www.npmjs.com/package/iobroker.fronius-solarweb)
![Number of Installations](https://iobroker.live/badges/fronius-solarweb-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/fronius-solarweb-stable.svg)
[![Dependency Status](https://img.shields.io/david/TA2k/iobroker.fronius-solarweb.svg)](https://david-dm.org/TA2k/iobroker.fronius-solarweb)

[![NPM](https://nodei.co/npm/iobroker.fronius-solarweb.png?downloads=true)](https://nodei.co/npm/iobroker.fronius-solarweb/)

**Tests:** ![Test and Release](https://github.com/TA2k/ioBroker.fronius-solarweb/workflows/Test%20and%20Release/badge.svg)

## fronius-solarweb adapter for ioBroker

Adapter for Fronius Solarweb Portal

## Loginablauf

Die solarWeb Mail und Passwort eingeben.

## Energy-Forecast

Wenn für die Solar.web-Anlage die Energy-Forecast-/Pro-Daten verfügbar sind, liest der Adapter den aktuellen und den nächsten lokalen Kalendertag aus:

- `energyforecast`: Rohdaten für den heutigen lokalen Kalendertag.
- `energyforecastTomorrow`: Rohdaten für den morgigen lokalen Kalendertag.

Da Fronius je nach Zeitpunkt unterschiedliche Granularitäten liefert, erzeugt der Adapter zusätzlich stabile, normalisierte Datenpunkte:

- `energyforecastToday15m.*.value`: 96 feste 15-Minuten-Slots für heute.
- `energyforecastTomorrowHourly.*.value`: 24 feste Stunden-Slots für morgen.
- `energyforecastSummary.todayWh`: Summe der heutigen Prognose in Wh.
- `energyforecastSummary.todayRemainingWh`: verbleibende Prognose für heute in Wh. Dieser Wert wird minütlich aus den stabilen 15-Minuten-Slots aktualisiert und berücksichtigt den angebrochenen aktuellen Slot anteilig.
- `energyforecastSummary.tomorrowWh`: Summe der morgigen Prognose in Wh.
- `energyforecastSummary.recordCount`: Anzahl der zuletzt gelesenen Rohdatensätze für heute und morgen.

Die vorhandenen kompakten Summary-States `todayWh`, `todayRemainingWh` und `tomorrowWh` bleiben zusätzlich erhalten. `todayRemainingWh` wird ebenfalls minütlich aktualisiert.

Beim Aktualisieren der Rohdaten markiert der Adapter außerdem Index-Objekte aus vorherigen, längeren Forecast-Antworten als veraltet. Dafür werden pro Rohdatenzeile Metadaten wie `valid`, `stale`, `lastSeenInResponseAt` und `staleSince` gepflegt. Die Rohdatenobjekte werden nicht gelöscht, damit vorhandene ioBroker-Custom-Settings, z. B. History-/SQL-Konfigurationen, erhalten bleiben.

## Diskussion und Fragen

<https://forum.iobroker.net/topic/51550/test-adapter-fronius-solarweb>

## Changelog
### 0.1.1 (2025-03-12)

- fix for login flow

### 0.0.3

- (TA2k) add ohmpilot flowdata

### 0.0.1

- (TA2k) initial release

## License

MIT License

Copyright (c) 2022-2030 TA2k <tombox2020@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
