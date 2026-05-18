# BRIDGE / NST-7 — Project Brief for Cursor

## Hva dette er

En iOS-app som sonifiserer sensordata fra telefonen til ambient lyd.
Primærbruk: telefon i lomme, lyd på ørepropper.
Skjermen er sekundær — brukes kun til start/stopp og sporadisk glance.

Estetisk referanse: Star Trek USS Enterprise bridge ambience + number stations
(shortwave radio). Lydene skal være milde nok til å fungere som kontinuerlig
bakgrunnslyd i timevis, men distinkte nok per dimensjon at brukeren over tid
lærer å gjenkjenne hva de hører.

---

## Kjerneprinsipp

Appen gir tilgang til dimensjoner av omgivelsene som mennesket ikke har
biologiske sanser for. Primært:

- **Magnetfelt** — usynlig elektromagnetisk infrastruktur i bylandskapet
- **Lufttrykk** — vertikal posisjon og atmosfærisk tilstand
- **Hastighet** — din fremdrift gjennom rommet

Akselerometer/gyroskop er sekundære og brukes kun til subtile modulasjoner
og bevegelseshendelser, ikke som primære informasjonsbærere.

Lyssensor er ikke i bruk — telefonen er i lomme.

---

## Tech stack

```
expo-sensors            Accelerometer, Gyroscope, Magnetometer, Barometer
expo-location           GPS (hastighet + posisjon for orbital-beregninger)
react-native-audio-api  Web Audio API-port for React Native
expo-av                 iOS AudioSession + avspilling av ElevenLabs-lydfiler
expo-file-system        Lokal caching av fonetiske lydkomponenter
satellite.js            SGP4-propagator — beregner satellittposisjoner lokalt
elevenlabs              TTS via ElevenLabs API — Multilingual v2
expo-background-fetch   Periodisk bakgrunnshenting av flydata og TLE
```

**Kritisk iOS-konfigurasjon (gjøres én gang ved app-oppstart):**
```ts
import { Audio, InterruptionModeIOS } from 'expo-av';

await Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  shouldDuckAndroid: false,
});
```
Uten dette stopper lyden når skjermen låses.

---

## Prosjektstruktur

```
src/
  audio/
    engine.ts          AudioContext, masterchain, start/stop
    nodes/
      carrier.ts       Lag 0 — gulvoscillator 58–64 Hz
      atmosphere.ts    Lag 1 — D4+A4 sinus via reverb
      texture.ts       Lag 2 — filtrert rosa støy
      events.ts        Lag 3 — pings og glissandos (BAM-hierarki)
      nst.ts           Lag 3 — number station sekvenser
      orbital.ts       Lag 4 — orbital-hendelser
      aviation.ts      Lag 5 — flytetthet og nærhetshendelser
  sensors/
    accelerometer.ts
    magnetometer.ts
    barometer.ts
    gps.ts
    fusion.ts          Normaliserer og smoother alle sensor-streams
  orbital/
    tle.ts             TLE-nedlasting og caching (én gang per dag)
    propagator.ts      satellite.js wrapper — beregner posisjon og elevation
    passes.ts          Forhåndsberegner passeringer for neste 24t
    objects.ts         Definisjon av hvilke objekter som trackes
  aviation/
    opensky.ts         OpenSky Network API — fly i bounding box
    geometry.ts        Beregner elevation, bearing, avstand til fly
    density.ts         Tetthetslag — antall fly → normalisert verdi 0–1
  voice/
    announcer.ts       Kø-system og debounce for kunngjøringer
    phonetic.ts        NATO-fonetisk alfabet + tallkonvertering
    formatter.ts       Formaterer sensordata til kunngjøringstekst
    elevenlabs.ts      ElevenLabs API-wrapper (generering + caching)
    assembler.ts       Setter sammen cachede lydkomponenter til kunngjøring
    languages.ts       Destinasjonsspråk-mapping: ICAO → land → språkkode
  assets/
    phonetic/          Cachede ElevenLabs-lydkomponenter (genereres ved første oppstart)
      nato/            alpha.mp3 ... zulu.mp3, zero.mp3 ... niner.mp3
      en/              bearing.mp3, overhead.mp3, altitude.mp3, descending.mp3 ...
      fr/              cap.mp3, au-dessus.mp3, altitude.mp3, descend.mp3 ...
      de/              kurs.mp3, ueber.mp3, hoehe.mp3, sinkt.mp3 ...
      ja/              houoi.mp3, jokuu.mp3, koudo.mp3, kouka.mp3 ...
      [20+ språk]
  api/
    spaceWeather.ts    NOAA SWPC — Kp-indeks og nordlys-sannsynlighet
    weather.ts         met.no — barometertrend og vind
    airQuality.ts      NILU — NO2, PM2.5 (valgfritt)
  state/
    store.ts           Global tilstand (Zustand eller useReducer)
  ui/
    screens/
      MainScreen.tsx       Primærskjerm — bearing-display + instrumenter
      OnboardingScreen.tsx Første-gangs lydintroduksjon (6 steg)
      EarconListScreen.tsx Komplett earcon-referanse per BAM-nivå
    components/
      BearingDisplay.tsx   Canvas-komponent, North-up
      InstrumentPanel.tsx  OpenBridge instrument-panel mønster
      StatusIndicator.tsx  Rektangulær BAM-fargeindikator
      SystemMenu.tsx       Innstillinger-skuff (palett, lyd, onboarding)
      AlertBanner.tsx      Horisontal varselbanner
      EventLog.tsx         Tabular logg — timestamp + melding
      VoicePreview.tsx     Overlay for stemme-kunngjøring
    theme/
      palettes.ts          OpenBridge fire paletter (Night/Dusk/Day/Bright)
      paletteManager.ts    Auto-modus: lyssensor eller tid på døgnet
  app.tsx
  scripts/
    generateCache.ts   Engangs-script: genererer alle ElevenLabs-komponenter
```

---

## Lydarkitektur — sju lag

Lag 0–3 utgjør basis-ambienten (alltid aktiv eller sensortrigget).
Lag 4–6 er tilleggslag som introduseres senere: orbital, luftfart og stemme.

### Lag 0 — Carrier (alltid aktiv)
- Sinusoscillator: 58–64 Hz
- Frekvens moduleres ekstremt sakte av barometer-trend (over minutter)
- Volum: –33 dB
- Svak tremolo: 0.045 Hz, depth 0.18

### Lag 1 — Atmosfære (alltid aktiv)
- To sinusoscillatorer: D4 (294 Hz) og A4 (440 Hz)
- Gjennom reverb (decay 4s, wet 0.20)
- Volum: –46 dB og –50 dB
- Lavpassfilter: 500 Hz
- D4 moduleres ±7 Hz av magnetometer-baseline (sakte, over 5–10s)

### Lag 2 — Tekstur (alltid aktiv)
- Rosa støy gjennom smal bandpassfilter (280–520 Hz, Q 1.7)
- Filterfrekvens moduleres av smoothet akselerasjonsmagnitude:
  stille: 280 Hz, aktiv gange: 520 Hz
- Volum: –45 dB

### Lag 3 — Hendelser (sparsom, trigget)
Se detaljert sensor-mapping og BAM-lydmønster under.

---

## Lydstandard — BAM-hierarki (IEC 62923)

IMOs Bridge Alert Management-standard definerer lydmønstre for
varslingsprioriteter. Appen følger dette hierarkiet direkte —
ikke fordi det er et krav, men fordi det er et gjennomtenkt system
bygget på tiår med menneskelige faktorstudier i høybelastnings-
miljøer. Filosofien er identisk med appens: minimal forstyrrelse,
maksimal meningsbæring.

```
IMO BAM-hierarki tilpasset appen:

ALARM (høy)     3 korte signaler, gjentatt hvert 7–10s
WARNING (medium) 2 korte signaler, gjentatt hvert 15s–5min
CAUTION (lav)   Ingen trigger — kun ambient modulasjon
```

Viktig prinsipp fra BAM: et varsel med lavt volum kan være
viktigere enn et høyt varsel. Prioriteten kommuniseres via
mønsteret (antall signaler), ikke volumet.

### Hendelseskart — BAM-nivå per trigger

| Hendelse                          | BAM-nivå  | Mønster            | Debounce |
|-----------------------------------|-----------|--------------------|----------|
| Magnetisk anomali > 40 µT         | ALARM     | 3 pinger × 2       | 14s      |
| Kp > 4 (geomagnetisk storm)       | ALARM     | 3 pinger × 2       | 300s     |
| Bemannet romfartøy overhead       | ALARM     | 3 pinger × 1       | 300s     |
| Magnetisk anomali 15–40 µT        | WARNING   | 2 pinger           | 8s       |
| Barometer etasjebytte             | WARNING   | 2 pinger           | 12s      |
| Fly høy elevasjon (> 45°)         | WARNING   | 2 pinger           | 60s      |
| Kp 2–4 (forhøyet aktivitet)       | WARNING   | 2 pinger           | 120s     |
| Kontinuerlig sensormodulasjon     | CAUTION   | Ingen ping         | —        |
| Magnetisk anomali < 15 µT         | CAUTION   | Ingen ping         | —        |
| Hastighetsendring                 | CAUTION   | Ingen ping         | —        |
| NST-sekvenser                     | CAUTION   | Ingen ping         | —        |

### Ping-lyddesign

Alle hendelsespinger deler én felles enveloppe:
```
attack:  0.006s   (veldig rask — distinkt onset)
decay:   0.28s    (rask fade)
sustain: 0
release: 0.06s

Frekvenser (valgt for distinkthet):
  Alarm-ping:   880 Hz (sinustone, bandpassfiltrert)
  Warning-ping: 660 Hz (sinustone, bandpassfiltrert)
  Bandpass: 800–2400 Hz, Q 0.7 — radiokarakter, skiller seg fra ambient
```

Pauser mellom pinger i et mønster: 220ms.
Pause mellom gjentakelser: som BAM-standard (alarm 7–10s, warning 15s–5min).

Stemme-kunngjøring utløses alltid ETTER siste ping i mønsteret,
aldri simultant. BAM-dokumentet noterer at taleutgang er
tillatt som tillegg til standardtonene.

### Volumnivåer relativt til ambient

```
Lag 0 Carrier:      –33 dB   (subliminal)
Lag 1 Atmosfære:    –46 dB   (nesten uhørbar)
Lag 2 Tekstur:      –45 dB   (ambient bakgrunn)
Warning-ping:       –24 dB   (tydelig, ikke skremmende)
Alarm-ping:         –18 dB   (distinkt, krever oppmerksomhet)
Stemme:             –14 dB   (fremtredende men ikke hardt)
```

Ingen lydhendelse skal oppleves som et sjokk. Alle har
tilstrekkelig attack-tid til at overgangen er glatt.

### Earcon-lærbarhet

Forskning viser at brukere når ~80% identifikasjonsytelse for
earcons etter ca. 5 minutters eksponering, og 100% etter 4
treningsøkter à 10 minutter (Hoggan & Brewster). Appen
behøver ikke instruksjoner — lydmønstrene læres passivt
gjennom bruk. Dette er en grunnleggende antagelse i designet.

---

## Sensor → lyd mapping

### Magnetometer (VIKTIGST)

Måler jordens magnetfelt + avvik fra lokal infrastruktur.
Baseline etableres ved oppstart (gjennomsnitt av første 10s).

```
magnitude = sqrt(x² + y² + z²)
deviation = magnitude - baseline
```

**Kontinuerlig:**
- Resonant sinustone: 280 Hz baseline
- Amplitude: nesten usynlig ved 0 avvik, stiger proporsjonalt med deviation
- Legger til svak 2. harmonisk (560 Hz) ved deviation > 15 µT
- Panning: basert på x-akse (positiv → høyre, negativ → venstre)
  gir retningsinformasjon om magnetisk kilde

**Event — BAM ALARM (deviation > 40 µT):**
- 3 pinger (880 Hz) × 2 gjentakelser, 7s mellomrom
- Debounce: 14s
- Stemme utløses etter siste ping
- Event-logg: "MAG ANOMALY +{deviation}µT"

**Event — BAM WARNING (deviation 15–40 µT):**
- 2 pinger (660 Hz), ingen automatisk gjentakelse
- Debounce: 8s
- Ingen stemme

Konseptuelt: geigerteller for magnetfelt. Bruker lærer over tid å
gjenkjenne transformatorer, trikkelinjer, heismotorer, armeringsjern.

### Barometer

Måler lufttrykk → beregner relativ høydeendring.
```
altitudeDelta = (pressurePrev - pressureCurrent) * 8.0  // meter
```

**Event — BAM WARNING (|altitudeDelta| > 1.5m, bekreftet over 3s):**
- 2 pinger (660 Hz)
- Deretter: glissando opp (700 → 900 Hz, 1.5s) ved stigning,
  glissando ned (700 → 520 Hz, 1.5s) ved fall
- Debounce: 12s mellom triggere
- Ingen stemme

Konseptuelt: brukeren vet at de byttet etasje uten å ha tenkt på det.

### GPS — Hastighet

Oppdateres maks hvert 5. sekund, kun ved >3m forflytning.
Vises i **km/h** (ikke m/s) — mer intuitivt for urban kontekst.
Skala: 0–80 km/h med referansemerker ved 15, 30, 50 og 70 km/h.

```
0      15     30          50          70   80
|──────|──────|───────────|───────────|────|
  Fot   Trikk  Buss/trikk  Buss/tbane  Tog
```

Ingen modusdetektion eller labeling — brukeren tolker selv.

**Kontinuerlig:**
- Lav puls: 50 Hz suboscillator, pulsfrekvens = kmh * 0.008 Hz
  (0 km/h = ingen puls, 30 km/h = 0.24 Hz, 70 km/h = 0.56 Hz)
- Volum: –50 dB, senter i stereobilde
- Ramp-tid: 4s (aldri brå endringer)

---

### Sensorsynergi — passiv kontekstbevissthet

Kombinasjonen av sensorer kan gi kontekstuell informasjon
uten å anta noe eksplisitt. Ingen modusetikett — bare
verdiene som snakker med hverandre.

**T-bane/metro underground:**
```
GPS speed:       > 12 m/s (43+ km/h)
GPS fix:         tapt eller degradert
Magnetometer:    stor avvikelse (jerninfrastruktur, tredje skinne)
Barometer:       stabil (ingen høydeendring)
→ Alle fire bekrefter hverandre passivt
```

**Trikk:**
```
GPS speed:       4–12 m/s (15–43 km/h)
Magnetometer:    periodiske pigger fra kontaktledning og skinner
GPS fix:         tilgjengelig (over bakken)
→ Magnetometer-karakteren er distinkt fra statiske anomalier
```

**Konsekvens for lyden:**
Ingen eksplisitt tilstandsbytte — sensorverdiene modulerer
hvert sitt lydlag kontinuerlig. Brukeren opplever konteksten
gjennom lydenes oppførsel, ikke gjennom en kunngjøring.

GPS-tap (underground): hastighetsoscillatoren fades gradvis ut
over 8s. Magnetometerlaget tar over som dominerende dimensjon.
Når GPS returnerer: hastigheten fader inn igjen.

### Akselerometer

Kun til subtil teksturmodulasjon og ekstreme hendelser.
Smoothing: eksponensielt glidende gjennomsnitt, α = 0.15.

**Hendelse (magnitude > 19 m/s², engangs per 14s):**
- Ping: 880 Hz, 0.3s, fast attack
- Volum: –26 dB

### NST-sekvenser (number station)

Tidsbasert, ikke sensortrigget. Kjører hvert 22–50 sekund (tilfeldig).

Sekvenser (semitonforskyvning fra A4=440 Hz):
```ts
const SEQUENCES = [
  [0, -5, -12, -7],
  [0, 3, 7, 5],
  [-12, -5, 0, -3],
  [0, -2, -5, -9, -12],
];
```

- Tone-spacing: 420ms
- Tone-varighet: 160–240ms (tilfeldig per tone)
- Filter: bandpass 1200 Hz, Q 0.8 (radiokarakter)
- Panning: tilfeldig –0.3 til +0.3 per sekvens
- Volum: –34 dB

---

## Orbital-lag (Lag 4)

### Prinsipp

Satellitter og romfartøy befinner seg på kjente, beregnbare posisjoner
til enhver tid. Når et objekt passerer over brukerens posisjon er det
en reell fysisk hendelse — ikke en prognose eller statistikk.
Dette laget gjør objekter overhead hørbare.

Alle posisjoner beregnes lokalt med satellite.js fra TLE-data.
Ingen API-kall under kjøring — kun daglig TLE-oppdatering.

### TLE-data

```ts
// Kilder fra CelesTrak (én gang per dag, cachet lokalt)
// GP-endpoint støtter TLE/2LE/3LE/XML/JSON/CSV
const TLE_SOURCES = {
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  iss:      'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle',
  hubble:   'https://celestrak.org/NORAD/elements/gp.php?CATNR=20580&FORMAT=tle',
}
```

NB: CelesTrak går tom for 5-sifrede katalognumre rundt 2026-07-12.
Nye objekter får 6-sifrede ID-er og er ikke tilgjengelige i ren TLE-format
— bruk 3LE/JSON/XML for nye objekter. satellite.js håndterer 3LE.

Cache TLE lokalt med dato-tag. Oppdater kun hvis > 24t gammelt.

### Objekter som trackes

```ts
// objects.ts
export const ORBITAL_OBJECTS = [
  {
    id: 'ISS',
    name: 'ISS',
    noradId: 25544,
    sound: { freq: 660, character: 'clean', pan: 'bearing' },
    minElevation: 10,   // grader over horisont
  },
  {
    id: 'TIANGONG',
    name: 'Tiangong',
    noradId: 48274,
    sound: { freq: 528, character: 'clean', pan: 'bearing' },
    minElevation: 10,
  },
  {
    id: 'HUBBLE',
    name: 'Hubble',
    noradId: 20580,
    sound: { freq: 741, character: 'resonant', pan: 'bearing' },
    minElevation: 10,
  },
  {
    id: 'VOYAGER1',
    name: 'Voyager 1',
    noradId: 10321,      // har NORAD ID, men TLE er ikke meningsfull i deep space
    ephemerisSource: 'horizons', // posisjon hentes fra NASA JPL Horizons
    sound: { freq: 111, character: 'distant', pan: 'fixed' },
    minElevation: null,  // alltid i én retning, ikke passeringer
  },
]
```

### Lydbeskrivelse per objekt

**ISS (660 Hz) — BAM ALARM**
3 pinger ved passering starts (elevation krysser 10°). Deretter
ren sinustone som stiger med elevation, topper ved maks, fader ut.
Panning følger bearing. Varighet: 4–8 min per passering.
Stemme utløses etter pinger ved oppstart.
Event-logg: "ISS OVERHEAD — MAX EL {x}° {bearing}"

**Tiangong (528 Hz) — BAM ALARM**
Identisk struktur som ISS. Distinkt frekvens — simultane passeringer
gir to toner (660/528 ≈ stor ters). Separate objekter, ikke koordinert.

**Hubble (741 Hz) — BAM WARNING**
2 pinger, deretter kontinuerlig tone. Svak 2. harmonisk (1482 Hz, –18 dB)
skiller det fra bemannede stasjoner. Instrument, ikke menneskelig tilstedeværelse.
Ingen stemme.

**Starlink-klynge — BAM WARNING**
Kun gruppe (≥ 3 satellitter innen 2 min). 2 pinger, deretter
sekvens av korte pings (880 Hz, 80ms) — én per satellitt,
timing fra faktisk passeringsrekkefølge. Aldri enkeltvis.

**Voyager 1 — BAM CAUTION (kontinuerlig)**
Ingen ping. Uhørbar 111 Hz tone (–55 dB), alltid pannert mot
Voyagers faktiske himmelposisjon. Endres umerkelig over dager.
Eneste konstante lyd som aldri blir fremtredende.

### Pass-beregning

```ts
// passes.ts — kjøres ved oppstart og ved midnatt
export function computeUpcomingPasses(
  tle: TLE,
  observerLat: number,
  observerLon: number,
  observerAlt: number,
  hoursAhead: number = 24,
  minElevation: number = 10
): Pass[]

interface Pass {
  objectId: string
  startTime: Date
  maxTime: Date
  endTime: Date
  maxElevation: number
  startBearing: number
  maxBearing: number
}
```

Forberegn alle passeringer for neste 24 timer ved oppstart.
Sett timere for hver. Ingen løpende beregninger under passering —
kun lineær interpolasjon av elevation og bearing mellom forhåndsberegnede
punkter (hvert 10. sekund).

---

## Luftfartslag (Lag 5)

### Prinsipp

ADS-B er radiosignaler fly sender kontinuerlig på 1090 MHz — OpenSky
Network mottar disse via tusenvis av bakkestasjoner globalt. Appen
lytter på det samme via software. Direkte estetisk kobling til
shortwave-lytting og number station-kulturen.

Fly er fundamentalt forskjellig fra satellitter i én dimensjon:
de er konstante. 20–60 fly overhead til enhver tid over en by.
Designet løser dette med to separate nivåer.

### Nivå 1 — Tetthetslag (kontinuerlig)

Antall fly innenfor 50 km radius → normalisert tetthet (0–1).

```ts
density = Math.min(1, aircraftCount / 40)
```

Sonisk effekt: en svak mekanisk drone (90 Hz, –54 dB baseline).
Amplitude stiger lineært med density opp til –44 dB ved full tetthet.
Ikke et event — en konstant ambient konteksttone du sjelden legger merke til.
Endringer skjer over 30s ramp-tid.

### Nivå 2 — Nærhetshendelse (sparsom)

To triggerbetingelser, håndtert separat:

**Høy elevasjonsvinkel (≥ 45°):**
Fly nær direkte overhead. Rarest og mest interessant.
```
elevation = arctan(altitude / horizontalDistance)
```
Lyd: detuned sinustone, 420 Hz med ±3 Hz wobble (0.3 Hz LFO),
bandpassfiltrert (radiokarakter), bearing → panning.
Attack 2s, decay når fly forsvinner under 45°.
Event-logg: "{callsign} OVERHEAD {altitude}m → {destination}"

**Lav altitude (< 3000m):**
Avgang eller landing. Mer stedsspesifikk enn cruise-trafikk.
Lyd: lavere, 280 Hz, samme detuning-karakter.
Vertikal rate: stigning → pitch glir svakt opp, synking → ned.
Event-logg: "{callsign} LOW — {altitude}m {verticalRate>0?'↑':'↓'}"

Debounce: samme fly trigges ikke på nytt før det har forlatt
triggersonen og returnert (minimum 3 minutters pause).

### API — OpenSky Network

```ts
// aviation/opensky.ts
// Poll hvert 45. sekund
// Bounding box ±0.5° lat/lon ≈ 50 km radius

GET https://opensky-network.org/api/states/all
  ?lamin={lat - 0.5}
  &lomin={lon - 0.5}
  &lamax={lat + 0.5}
  &lomax={lon + 0.5}

// Response: { states: [icao24, callsign, origin_country,
//   time_position, last_contact, longitude, latitude,
//   baro_altitude, on_ground, velocity, true_track,
//   vertical_rate, sensors, geo_altitude, squawk,
//   spi, position_source] }

// Filtrer ut: on_ground === true, baro_altitude === null
```

**API-credits (verifisert 2026):**
- Anonym: 400 credits/dag (bounding box ±0.5° = 1 sq° = 1 credit/kall
  → 400 kall = 5 t med 45s polling)
- Standard konto: 4000 credits/dag (50 t med 45s polling)
- Active feeder (≥30% uptime/mnd): 8000 credits/dag

Anbefal bruker å registrere konto.

**Autentisering (fra 2026-03-18):**
Basic auth (brukernavn/passord) er fjernet — OAuth2 client credentials kreves.
```ts
// Hent token én gang per time
const token = await fetchOAuth2Token(CLIENT_ID, CLIENT_SECRET)
fetch(url, { headers: { Authorization: `Bearer ${token}` } })
```
Anonym tilgang fungerer fortsatt uten token, men begrenset til 400 credits/dag.

### Geometriberegning

```ts
// aviation/geometry.ts
function getElevation(
  observerLat: number, observerLon: number,
  aircraftLat: number, aircraftLon: number,
  aircraftAltitude: number  // meter
): number {
  const horizDist = haversineDistance(
    observerLat, observerLon,
    aircraftLat, aircraftLon
  ) // meter
  return Math.atan2(aircraftAltitude, horizDist) * (180 / Math.PI)
}

function getBearing(
  observerLat: number, observerLon: number,
  aircraftLat: number, aircraftLon: number
): number // 0–360 grader fra nord
```

### Sonisk karakter — distinkt fra satellitter

| Egenskap      | Satellitter          | Fly                        |
|---------------|----------------------|----------------------------|
| Frekvens      | 528–741 Hz (rene)    | 280–420 Hz (detuned)       |
| Wavetype      | Ren sinus            | Sinus + ±3 Hz wobble       |
| Filter        | Lett bandpass        | Tyngre bandpass (radio)    |
| Varighet      | 4–8 minutter         | 30s–3 minutter             |
| Frekvens      | 0–3 per time         | Potensielt konstant         |
| Karakter      | Presisjonsinstrument | Maskin i luft              |

---

## Eksterne API-er

### NOAA Space Weather (VIKTIGST for kontekst)

Gir global geomagnetisk aktivitet — Kp-indeksen.
Kontekstualiserer magnetometer-readings: er anomalien lokal eller global?

```ts
// Oppdater hvert 60. minutt
GET https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json

// Gir siste 24t med Kp-verdier (0–9)
// Kp > 4 → nordlys mulig i Norge → aktivere eterisk lydlag
// Kp > 5 → forhøyet global magnetfelt → logg "GEOMAGNETIC STORM Kp={x}"
```

**Sonisk effekt ved Kp > 4:**
Svak eterisk overtone legges til atmosfærelaget (800 Hz, reverb wet økes
til 0.40, volum –48 dB). Representerer aurora-mulighet. Ikke et event —
en gradvis tilstandsendring.

### met.no Locationforecast

Primært for barometertrend-kontekst og vind.

```ts
// Oppdater hvert 30. minutt
GET https://api.met.no/weatherapi/locationforecast/2.0/compact
  ?lat={lat}&lon={lon}
Headers: { 'User-Agent': 'BridgeNST7/1.0 kontakt@epost.no' }

// Relevante felt:
// details.air_pressure_at_sea_level → trend over 6t
// details.wind_speed                → modulerer støylaget svakt
// details.probability_of_precipitation → varsellyd ved > 70%
```

**Vindmodulasjon:** vindhastighet (0–15 m/s) justerer støylagets
filterbredde marginalt (±40 Hz). Merkbar over tid, ikke øyeblikkelig.

### NILU Luftkvalitet (valgfritt)

```ts
// Oppdater hvert 60. minutt
GET https://api.nilu.no/obs/utd?areas=Oslo&components=NO2
```

Kun aktiv hvis NO2 > 40 µg/m³ (EU-grenseverdi for timesmiddel).
Lyd: lavfrekvent drone (80 Hz, –52 dB) som aktiveres gradvis.
Event-logg: "AIR QUALITY — NO2 {x}µg/m³"

---

## Oppdatert sensor-oppdateringsrater og batteri

| Sensor        | Forgrunn | Bakgrunn | Metode                         |
|---------------|----------|----------|-------------------------------|
| Akselerometer | 20 Hz    | 10 Hz    | Accelerometer.setUpdateInterval() |
| Magnetometer  | 4 Hz     | 2 Hz     | Magnetometer.setUpdateInterval()  |
| Barometer     | 1 Hz     | 0.5 Hz   | Barometer.setUpdateInterval()     |
| GPS           | 0.2 Hz   | 0.1 Hz   | distanceInterval: 3m              |

**Modulasjonsthrottling:**
Sensor-rådata leses på ovenstående rater.
Audio-parametre oppdateres maks 5 Hz — ingen grunn til hyppigere rampTo().

**GPS-konfigurasjon:**
```ts
Location.watchPositionAsync({
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 3,
  timeInterval: 5000,
})
```

**AppState-håndtering:**
```ts
AppState.addEventListener('change', state => {
  if (state === 'background') throttleToBackgroundRates();
  if (state === 'active')     throttleToForegroundRates();
});
```

---

## fusion.ts — ansvar

Alle sensorer mates inn hit. Ingenting skriver direkte til audio-lag.

```ts
interface FusedState {
  // Sensorer
  magDeviation: number;      // µT fra baseline, 0+
  magPan: number;            // –1 til +1
  altitudeDelta: number;     // meter, positiv = opp
  speed: number;             // m/s
  motionIntensity: number;   // 0–1, smoothet

  // Orbital
  activePasses: ActivePass[]; // objekter som er overhead akkurat nå
  voyagerBearing: number;     // grader fra nord

  // Luftfart
  aircraftDensity: number;    // 0–1, normalisert antall fly i radius
  nearestAircraft: NearestAircraft | null;

  // API-kontekst
  kpIndex: number;            // 0–9, global geomagnetisk aktivitet
  windSpeed: number;          // m/s
  no2Level: number;           // µg/m³, 0 hvis utilgjengelig
}

interface ActivePass {
  objectId: string;
  elevation: number;    // 0–90 grader
  bearing: number;      // 0–360 grader
  progress: number;     // 0–1 (0 = horizon inn, 1 = horizon ut)
}

interface NearestAircraft {
  callsign: string;
  elevation: number;    // grader
  bearing: number;      // grader
  altitude: number;     // meter
  verticalRate: number; // m/s, positiv = stiger
  isLowAltitude: boolean;
}
```

fusion.ts håndterer:
- Magnetometer baseline-kalibrering (første 10s)
- Eksponentiell smoothing av akselerometer
- Barometer-differensiering og høydeberegning
- Eksponering av normaliserte verdier til audio-lagene

---

## Stemmelag (Lag 6)

### Prinsipp

Inspirert av number stations og NATO aviation radio. En syntetisk stemme
kunngjør hendelser som er genuint bemerkelsesverdige — sjelden, deliberert,
alltid i samme format. Stemmen har vekt fordi den er sparsom.

Flycallsigns leses med NATO fonetisk alfabet (internasjonal standard).
Kunngjøringen for fly skjer på destinasjonsspråket — Air France til Paris
kunngjøres på fransk, JAL til Tokyo på japansk. Samme stemme, samme
karakter, alle språk. Dette gjenspeiler hva objektet faktisk er.

### ElevenLabs — Multilingual v2

Én stemme, 29 språk. Konsistent identitet uavhengig av hvilket språk
som snakkes — ikke én stemme per språk.

```ts
// voice/elevenlabs.ts

const ELEVENLABS_CONFIG = {
  model_id: 'eleven_multilingual_v2',
  voice_id: '[NST-7 custom voice ID]',  // se stemmedesign under
  voice_settings: {
    stability: 0.85,         // høy = konsistent, målt, lite ekspressiv
    similarity_boost: 0.40,  // lavt = nøytral, nesten robotaktig
    style: 0.0,
    use_speaker_boost: false,
  }
}

async function generateComponent(text: string, language: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_CONFIG.voice_id}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_CONFIG.model_id,
        voice_settings: ELEVENLABS_CONFIG.voice_settings,
        language_code: language,  // tving språk eksplisitt
      })
    }
  )
  return response.arrayBuffer()
}
```

### Stemmedesign

Lag en dedikert "NST-7"-stemme via ElevenLabs Voice Design med prompt:
```
"Measured, neutral, slightly synthetic voice. Clear diction. 
Radio operator quality. Calm and deliberate pace. 
Reminiscent of shortwave radio broadcasts."
```

Dette gir appen en unik, konsistent identitet på tvers av alle 29 språk.

### Cachingstrategi — ingen API-latency under kjøring

All lyd forhåndsgenereres og caches lokalt. Null API-kall under
kjøring etter initial oppsett.

**Ved første oppstart — generer og cache:**

```
NATO-alfabet (26 bokstaver × 1 language = 26 filer)
Tall (10 siffer × 1 language = 10 filer)
Nøkkelord per språk (6 ord × 27 språk = 162 filer)
─────────────────────────────────────────────────
Totalt: ~198 filer, ~8-20 MB
```

Nøkkelord som caches per språk:
```ts
const KEYWORDS: Record<string, Record<string, string>> = {
  // ── Nordisk ──────────────────────────────────────────────
  no: { bearing:'kurs',    overhead:'overhead',   altitude:'høyde',
        descending:'synkende',  ascending:'stigende',  destination:'destinasjon' },
  sv: { bearing:'kurs',    overhead:'overhead',   altitude:'höjd',
        descending:'sjunkande', ascending:'stigande',  destination:'destination' },
  da: { bearing:'kurs',    overhead:'overhead',   altitude:'højde',
        descending:'synkende',  ascending:'stigende',  destination:'destination' },
  fi: { bearing:'suunta',  overhead:'yläpuolella', altitude:'korkeus',
        descending:'laskeva',   ascending:'nouseva',   destination:'määränpää' },

  // ── Vest-Europa ───────────────────────────────────────────
  en: { bearing:'bearing', overhead:'overhead',   altitude:'altitude',
        descending:'descending', ascending:'ascending', destination:'destination' },
  de: { bearing:'Kurs',    overhead:'im Überflug', altitude:'Höhe',
        descending:'im Sinkflug', ascending:'im Steigflug', destination:'Ziel' },
  fr: { bearing:'cap',     overhead:'au-dessus',  altitude:'altitude',
        descending:'en descente', ascending:'en montée', destination:'à destination de' },
  nl: { bearing:'koers',   overhead:'overhead',   altitude:'hoogte',
        descending:'dalend',    ascending:'stijgend',  destination:'bestemming' },
  es: { bearing:'rumbo',   overhead:'sobre nosotros', altitude:'altitud',
        descending:'descendiendo', ascending:'ascendiendo', destination:'destino' },
  pt: { bearing:'rumo',    overhead:'em sobrevoo', altitude:'altitude',
        descending:'em descida', ascending:'em subida', destination:'destino' },
  it: { bearing:'rotta',   overhead:'in sorvolo', altitude:'quota',
        descending:'in discesa', ascending:'in salita', destination:'destinazione' },

  // ── Øst-Europa ────────────────────────────────────────────
  pl: { bearing:'kurs',    overhead:'nad nami',   altitude:'wysokość',
        descending:'zniżanie',  ascending:'wznoszenie', destination:'cel' },
  cs: { bearing:'kurz',    overhead:'přelet',     altitude:'výška',
        descending:'klesání',   ascending:'stoupání',  destination:'cíl' },
  sk: { bearing:'kurz',    overhead:'prelet',     altitude:'výška',
        descending:'klesanie',  ascending:'stúpanie',  destination:'cieľ' },
  hu: { bearing:'irány',   overhead:'felettünk',  altitude:'magasság',
        descending:'ereszkedés', ascending:'emelkedés', destination:'úticél' },
  ro: { bearing:'curs',    overhead:'deasupra',   altitude:'altitudine',
        descending:'coborând',  ascending:'urcând',    destination:'destinație' },
  hr: { bearing:'kurs',    overhead:'iznad nas',  altitude:'visina',
        descending:'spuštanje', ascending:'penjanje',  destination:'odredište' },
  bg: { bearing:'курс',    overhead:'над нас',    altitude:'височина',
        descending:'снижаване', ascending:'изкачване', destination:'дестинация' },
  uk: { bearing:'курс',    overhead:'над нами',   altitude:'висота',
        descending:'зниження',  ascending:'набір висоти', destination:'призначення' },
  ru: { bearing:'курс',    overhead:'над нами',   altitude:'высота',
        descending:'снижение',  ascending:'набор высоты', destination:'назначение' },

  // ── Sør/Øst-Europa + øvrig ───────────────────────────────
  el: { bearing:'πορεία',  overhead:'υπερκεφαλής', altitude:'ύψος',
        descending:'καθοδικά',  ascending:'ανοδικά',   destination:'προορισμός' },
  tr: { bearing:'rota',    overhead:'üstümüzde',  altitude:'irtifa',
        descending:'alçalıyor', ascending:'yükseliyor', destination:'varış' },

  // ── Ikke-europeisk (vanlige Oslo-destinasjoner) ───────────
  ar: { bearing:'الاتجاه', overhead:'فوقنا',    altitude:'الارتفاع',
        descending:'هابط',      ascending:'صاعد',      destination:'الوجهة' },
  ja: { bearing:'方位',    overhead:'上空',      altitude:'高度',
        descending:'降下中',    ascending:'上昇中',    destination:'目的地' },
  zh: { bearing:'航向',    overhead:'正上方',    altitude:'高度',
        descending:'下降中',    ascending:'上升中',    destination:'目的地' },
  th: { bearing:'ทิศทาง',  overhead:'เหนือเรา',  altitude:'ความสูง',
        descending:'กำลังลดระดับ', ascending:'กำลังขึ้น', destination:'ปลายทาง' },
}
```

### Destinasjonsspråk-mapping — europeiske lufthavner

```ts
// voice/languages.ts — utvidet for Oslo-basert bruk

const AIRPORT_LANGUAGE: Record<string, string> = {
  // ── Norge (norsk) ─────────────────────────────────────────
  ENGM:'no', ENBR:'no', ENVA:'no', ENBO:'no', ENCN:'no',
  ENZV:'no', ENHD:'no', ENFL:'no', ENMS:'no',

  // ── Norden ────────────────────────────────────────────────
  ESSA:'sv', ESGG:'sv', ESMS:'sv', ESKN:'sv',
  EKCH:'da', EKBI:'da', EKOD:'da',
  EFHK:'fi', EFTU:'fi', EFTP:'fi',
  BIKF:'en',  // Island — ikke i ElevenLabs v2, fallback engelsk

  // ── Britiske øyer ─────────────────────────────────────────
  EGLL:'en', EGKK:'en', EGCC:'en', EGGD:'en',
  EIDW:'en', EGPH:'en', EGPF:'en',

  // ── Vest-Europa ───────────────────────────────────────────
  EDDF:'de', EDDM:'de', EDDB:'de', EDDL:'de', EDDS:'de',
  LOWW:'de', LSZH:'de', LSGG:'fr',
  LFPG:'fr', LFPO:'fr', LFLL:'fr', LFML:'fr', LFTW:'fr',
  EBBR:'fr',  // Brussel — primært fransk
  EHAM:'nl', EHRD:'nl',
  LEMD:'es', LEBL:'es', LEPA:'es', LEAL:'es', LEMG:'es',
  LPPT:'pt', LPPR:'pt', LPFR:'pt',
  LIRF:'it', LIML:'it', LIPZ:'it', LIRN:'it', LICJ:'it',

  // ── Øst-Europa ────────────────────────────────────────────
  EPWA:'pl', EPKK:'pl', EPGD:'pl', EPWR:'pl',
  LKPR:'cs', LKTB:'cs',
  LZIB:'sk',
  LHBP:'hu',
  LROP:'ro', LRBS:'ro', LRTR:'ro',
  LDZA:'hr', LDSP:'hr',
  LBSF:'bg',
  UKBB:'uk', UKLL:'uk',
  UUEE:'ru', UUDD:'ru', ULLI:'ru',

  // ── Sør-Europa ────────────────────────────────────────────
  LGAV:'el', LGIR:'el', LGTS:'el', LGRP:'el',
  LTFM:'tr', LTAI:'tr', LTBA:'tr', LTBJ:'tr',

  // ── Midt-Østen ────────────────────────────────────────────
  OMDB:'ar', OMAA:'ar', OERK:'ar', OTHH:'ar',

  // ── Asia-Stillehavet ──────────────────────────────────────
  RJTT:'ja', RJAA:'ja', RJBB:'ja',
  ZBAA:'zh', ZGSZ:'zh', ZSPD:'zh',
  VTBS:'th', VTBD:'th',

  // ── Nord-Amerika ──────────────────────────────────────────
  KJFK:'en', KLAX:'en', KORD:'en', KATL:'en',
}

export function getLanguageForAirport(icao: string): string {
  return AIRPORT_LANGUAGE[icao] ?? 'en'
}
```

**ElevenLabs v2 europeisk dekning:**
Støtter alle språkene over unntatt islandsk (fallback: engelsk).
Norsk er inkludert — Widerøe og Norwegian-fly til norske byer
kunngjøres på norsk.

### Triggerhierarki

| Prioritet | Hendelse                    | BAM-nivå  | Språk              |
|-----------|-----------------------------|-----------|-------------------|
| 1         | Bemannet romfartøy overhead | ALARM     | Engelsk (alltid)  |
| 2         | Geomagnetisk storm          | ALARM     | Engelsk (alltid)  |
| 3         | Fly høy elevasjon           | WARNING   | Destinasjonsspråk |
| 4         | Sterk magnetisk anomali     | ALARM     | Engelsk (alltid)  |
| 5         | Kritisk luftkvalitet        | WARNING   | Engelsk (alltid)  |

Romfartøy, sensorer og atmosfæriske hendelser: alltid engelsk.
Fly: alltid destinasjonsspråk.
Stemme utløses alltid ETTER siste ping i BAM-mønsteret.

### Eksempler på ferdige kunngjøringer

```
[ping 660 Hz]
"India Sierra Sierra"   ← NATO, engelsk
[pause]
"bearing... zero niner five"
[pause]
"maximum elevation... four two"
```

```
[ping 528 Hz]
"Sierra Alpha Sierra... two three four"   ← NATO callsign, alltid engelsk
[pause]
"au-dessus"                               ← fransk (Paris-destinasjon)
[pause]
"cap... zero niner five"
[pause]
"altitude... huit mille"
[pause]
"en descente"
```

```
[ping 440 Hz]
"Kp... six"
[pause]
"geomagnetic storm"
[pause]
"aurora... possible"
```

---

## UI — OpenBridge-standard

Primærskjerm: **MainScreen** (`src/ui/screens/MainScreen.tsx`).
Visuelt grensesnitt følger OpenBridge 6.1 og IEC 62288.
Referanseimplementasjon: `bridge-ux-v7.html` (prototype i repoet).

### Designprinsipper

- **Ingen dekorative elementer** — hvert piksel tjener informasjon
- **North-up alltid** — bearing-display roterer aldri
- **Semantisk fargekoding** — alarm=rød, warning=amber, nominal=grønn
  Hue er fast på tvers av alle paletter; kun luminans/metning varierer
- **To typografiske lag** — Roboto Condensed (UI/labels),
  Roboto Mono + tabular-nums (instrumentverdier og dynamisk data)
- **Rektangulære statusindikatorer** — 3px vertikal fargestrek,
  ikke sirkler/prikker
- **Systeminnstillinger bak menyikon** — palett og lyd ikke på primærskjerm

### OpenBridge fire paletter

Palett velges automatisk fra lyssensor (native) eller tid på døgnet (fallback).
Manuelt overstyrt fra System-menyen.

```
Night  (00–06, 20–24): minimal lysutsendelse — bevarer mørketilpasning
Dusk   (06–08, 18–20): overgang — gylden time, skumring
Day    (08–11, 15–18): standard arbeidslys
Bright (11–15):        direkte sollys — maksimum kontrast
```

Night-paletten dimmer bevisst ikke-kritiske elementer under full hvitt.
Dette er fysiologisk begrunnet, ikke estetisk.

```ts
// theme/paletteManager.ts
type Palette = 'night' | 'dusk' | 'day' | 'bright';

function paletteFromHour(h: number): Palette {
  if (h >= 11 && h < 15) return 'bright';
  if ((h >= 8 && h < 11) || (h >= 15 && h < 18)) return 'day';
  if ((h >= 6 && h < 8)  || (h >= 18 && h < 20)) return 'dusk';
  return 'night';
}

function paletteFromLux(lux: number): Palette {
  if (lux > 5000) return 'bright';
  if (lux > 200)  return 'day';
  if (lux > 20)   return 'dusk';
  return 'night';
}
```

### Primærskjerm — layout

```
┌─────────────────────────────┐
│ NST-7    [GPS][Mag][Audio] ⚙│  Topbar: sys-id + statusindikatorer + menyknapp
├─────────────────────────────┤
│                             │  (System-meny — skjult som standard)
│     BEARING DISPLAY         │  North-up. Satellitter + fly som prikker.
│     (347×347pt canvas)      │  Heading-indikator på ytterkant.
│                             │
├─────────────────────────────┤
│  N objekter overhead  Hdg°  │  Kontekstlinje — funksjonell data
├──────────────┬──────────────┤
│ MAGNETOMETER │ BAROMETER    │  Instrumentpaneler (OpenBridge-mønster)
│ 42  µT       │ 1013.2  hPa  │  3px statussøyle øverst (BAM-farge)
├──────────────┼──────────────┤
│ MOTION       │ SPEED        │
│ 8.2  m/s²    │ 28  km/h     │  Hastighet: 0–80 km/h med referansetikker
│              │ 0─┬──┬───┬─80│  ved 15, 30, 50, 70
├──────────────┴──────────────┤
│ [BANNER — warning/nominal]  │  Kun synlig ved aktiv hendelse
├─────────────────────────────┤
│ 12:34:56  ISS overhead...   │  Eventlogg — tabular ts + melding
│ 12:34:12  Mag anomaly...    │
├─────────────────────────────┤
│ VOICE  India Sierra Sierra  │  Kun synlig under kunngjøring
│        bearing zero niner…  │
├─────────────────────────────┤
│         [ Start / Stop ]    │  Eneste interaksjonskontroll på primærskjerm
└─────────────────────────────┘
```

### Statusindikatorer (topbar)

Tre indikatorer viser spesifikke systemtilstander:

| Indikator | Grønn (ok)           | Amber (warn)              | Rød (err)         |
|-----------|----------------------|---------------------------|-------------------|
| GPS       | Fix aktiv, god presisjon | Degradert / Kp-storm   | Ingen fix         |
| Mag       | Kalibrert, baseline ok   | Kalibrering pågår        | Sensor utilgjengelig |
| Audio     | AudioSession aktiv   | —                         | Audio-feil        |

### Bearing-display

North-up alltid. Viser kun satellitter og fly — magnetiske anomalier
er ikke posisjonelle og plottes ikke.

```
Senter = direkte overhead (elevation 90°)
Ytterkant = horisonten (elevation 0°)
Radius for objekt = R × (1 - elevation/90)

Farger:
  Satellitter → active-farge (blå)
  Fly         → text-farge (hvit/grå)

Heading-indikator: liten trekant på ytterkanten i din kompassretning.
Viser hvor du peker uten at displayet roterer.
```

### System-meny (bak ⚙-ikon)

To seksjoner:

**Display palette**
Auto + Bright/Day/Dusk/Night.
Auto-kilde vises: "Auto — lyssensor · night" eller "Auto — time of day 22:xx · night".

**Sounds**
- Sounds & Earcons → EarconListScreen
- Onboarding → OnboardingScreen (replay)

### Onboarding (OnboardingScreen)

Utløses automatisk ved første aktivering.
Tilgjengelig fra System-menyen → Sounds → Onboarding.

6 steg:
1. Introduksjon — hva systemet gjør
2. Alarm (BAM) — 3 signaler. Demo: reell lyd via audio engine
3. Warning (BAM) — 2 signaler. Demo: reell lyd
4. Caution — ingen ping, kun ambient. Demo: carrier-tone
5. Stemme — NATO fonetisk, destinasjonsspråk for fly
6. Klar — "Sounds become familiar through use"

Hvert steg viser BAM-nivå-indikator (rektangel, BAM-farge).
Demo-knapp spiller faktisk lyd — ikke beskrivelse av lyd.

### Earcon-referanse (EarconListScreen)

Komplett lydkatalog gruppert etter BAM-nivå.
Åpnes fra System-meny → Sounds → Sounds & Earcons.

Per gruppe: farget header (3px strek + label + mønsterbeskrivelse).
Per rad: BAM-fargestrek (venstre kant) + navn + trigger + spill-knapp.

```
ALARM    ████  3 signaler · gjentatt 7–10s
  ├ Magnetic anomaly   Field deviation > 40 µT   3 × 880 Hz   [▶]
  ├ ISS overhead       Elevation > 10°            3 × 660 Hz   [▶]
  ├ Tiangong overhead  Elevation > 10°            3 × 528 Hz   [▶]
  └ Geomagnetic storm  Kp index > 4               3 × 880 Hz   [▶]

WARNING  ████  2 signaler · gjentatt 15s–5min
  ├ Magnetic activity  Deviation 15–40 µT         2 × 660 Hz   [▶]
  ├ Floor change       Altitude > 1.5m            2 × 660 Hz + gliss [▶]
  ├ Aircraft overhead  Elevation > 45°            2 × 660 Hz   [▶]
  ├ Hubble overhead    Elevation > 10°            2 × 741 Hz   [▶]
  └ Starlink cluster   ≥ 3 satellites, 2 min      2 × 880 Hz   [▶]

CAUTION  ████  Ingen ping — ambient
  ├ Carrier tone       Always active              58–64 Hz cont [▶]
  ├ NST sequence       Every 22–50s               3–5 tones    [▶]
  ├ Speed pulse        Moving                     50 Hz ∝ km/h [▶]
  └ Voyager 1          Always active              111 Hz –55dB [▶]
```

Spill-knapper spiller faktisk lyd via audio engine.

---

## Viktige constraints

**Audio:**
1. Magnetometer baseline MÅ kalibreres ved oppstart — ikke hardkode en verdi
2. Alle audio-rampTo() skal ha tilstrekkelig tid (aldri < 0.5s for kontinuerlige verdier)
3. NST-sekvenser avbrytes aldri av sensor-events — separat scheduling
4. Ingen lyd starter uten eksplisitt brukerhandling (iOS-krav)
5. AudioSession konfigureres FØR første lyd startes
6. Stemmen avbryter aldri NST-sekvenser eller aktive satellitt-toner — vent til de er ferdige
7. Aldri to kunngjøringer med < 45s mellomrom
8. Samme objekt kunngjøres ikke på nytt før 5 min har gått
9. ElevenLabs API kalles KUN ved cache-generering — aldri under aktiv kjøring
10. Cache-integritet verifiseres ved oppstart — manglende filer regenereres stille i bakgrunn
11. Appen fungerer uten stemme hvis cache ikke er generert ennå — ikke blokker oppstart

**Orbital og API:**
12. TLE-data caches lokalt — aldri last ned under en aktiv passering
13. Pass-beregning skjer ved oppstart og midnatt — ikke løpende
14. API-kall har alltid timeout (5s) og silent fallback — appen fungerer offline
15. Voyager-retning oppdateres én gang per dag, ikke oftere
16. OpenSky-polling stopper hvis appen har vært i bakgrunn > 10 min (batteri)
17. Fly på bakken (on_ground = true) filtreres alltid ut

**UI:**
18. Bearing-display er North-up alltid — roterer aldri
19. Kun satellitter og fly plottes i bearing-display — ikke magnetiske anomalier
20. Palett-velger er aldri på primærskjermen — alltid bak system-menyikon
21. Onboarding åpnes automatisk første gang brukeren aktiverer appen
22. Earcon-demos spiller faktisk lyd — ikke tekstbeskrivelse
23. BAM-fargekoding er semantisk fast på tvers av alle paletter:
    alarm=#alarm, warning=#warning, nominal=#nominal — hue endres aldri
