# Iterasjonsplan

Hver iterasjon skal være testbar på fysisk iPhone i lomma, validere
én usikkerhet, og kunne stoppes på uten halvferdig kode.

---

## Fase 1 — Kjerneløkken

### Iterasjon 0 — Fundament + Lag 0   `[fullført 2026-05-19]`

- Expo-prosjekt, TypeScript, mappestruktur.
- Dev-client via `expo prebuild` + Xcode.
- `react-native-audio-api` med iOS AudioSession (`playback`-kategori).
- `audio/engine.ts` — AudioContext, masterchain, fade in/out.
- `audio/nodes/carrier.ts` — Lag 0 (58 Hz sinus + 0.045 Hz tremolo).
- Start/stopp-knapp i appen.
- Now Playing-widget på låseskjerm + Control Center.
- State-subscription mellom engine og UI (begge synker når status endres).

**Validert:** Lyd fortsetter når skjermen er låst. Lydløs-modus
overstyres. Native Web Audio synthese fungerer uten glitches.
Lock Screen-kontroller virker begge veier (start/stop fra både app og widget).

### Iterasjon 1 — Lag 1 og 2   `[fullført 2026-05-19]`

- `audio/nodes/atmosphere.ts` — D4+A4 gjennom syntetisk reverb og lowpass (Lag 1).
- `audio/nodes/texture.ts` — pink-noise (Paul Kellet) gjennom bandpass (Lag 2).
- Volumforhold:
  - Lag 0: –33 dB (per spec)
  - Lag 1: –38 dB (D4) / –42 dB (A4) — justert opp fra –46/–50 etter lyttetest
  - Lag 2: –45 dB (per spec)
- Statiske parametere, ingen sensorinngang ennå.

**Validert:** Alle tre lag spiller stabilt sammen. Lag 1 hørbar ved fokus,
ellers ambient. Ingen klikk, loop-søm eller fasekonflikter rapportert.

### Iterasjon 2 — Sensorfusion   `[fullført 2026-05-19]`

- `sensors/magnetometer.ts`, `barometer.ts`, `accelerometer.ts`, `gps.ts`.
- `sensors/fusion.ts` med:
  - Magnetometer baseline-kalibrering (første 10s)
  - Akselerometer-magnitude med eksponentiell smoothing (α=0.15)
  - Barometer differensiert til altitude-delta (×8 m/hPa)
  - GPS fix-deteksjon og hastighet i m/s + km/h
  - Sentralisert `FusedState` med subscribe-API
- `ui/components/SensorPanel.tsx` — sanntids debug-visning.
- Location-permission ber om kjøretid (foreground only).

**Validert:** Magnetometer reagerer på PC, barometer 1004 hPa i
5. etasje (rimelig for Oslo), motion ~9.8 m/s² i ro, GPS-fix ok
(heading mangler i ro — forventet iOS-oppførsel).

### Iterasjon 3 — Sensor → lyd (kontinuerlig) `[implementert 2026-05-19]`

Mapping og terskler er datadrevne — se canvas
`canvases/sensor-trip-analysis.canvas.tsx` for grunnlaget fra opptak
Nydalen↔Pilestredet 2026-05-19.

- `audio/modulation.ts` — rene transform-funksjoner:
  - `magToControl`: log10(1+x)/log10(2000) → tanh-saturasjon (håndterer
    observert dynamikk 0–1 579 µT)
  - `motionToReverbWet`: 0–1 → 0.15–0.60
  - `baroDeltaToPitchHz`: ±1.5 m clip → ±2 Hz
  - `magControlToBandpassHz`: logaritmisk 250 → 3 500 Hz
- `audio/phase.ts` — binær fase med hysterese:
  - `active` etter motion_i > 0.30 sustained 3 s
  - `idle` etter motion_i < 0.08 sustained 5 s
- Lag-koblinger:
  - Lag 0 carrier ← `baro_dalt` smoothet → pitch-offset ±2 Hz
  - Lag 1 atmosfære ← `motion_i` → reverb wet 0.15–0.60
  - Lag 2 tekstur ← `log(mag_dev)` → bandpass 250–3 500 Hz
  - Lag 2 output-gain ← `phase` → 0.5×/1.0× (binær "wake-up")
- Modulasjonsløkke: 5 Hz (200 ms) i `engine.ts`, alle AudioParam-endringer
  bruker `linearRampToValueAtTime` for klikkfri overgang.
- Sekundær glatting α=0.35 i selve løkken for å unngå at 5 Hz
  fusion-oppdateringer høres trinnvis.
- UI: fase-indikator i footer (`audio · idle` / `audio · active` med
  grønn farge når aktiv).

**Valideres:** *føles* det riktig? Tur i byen, telefon i lomma, ett kvarter.
Sammenlign opplevd lyd mot tidlige opptak — endrer texture seg merkbart
ved T-bane vs gange? Reagerer carrier-pitch på heistur?

---

## Fase 2 — Hendelser og grensesnitt

### Iterasjon 4 — BAM-events (Lag 3)

- Ping-motor med envelope og bandpass.
- Debounce-system per trigger.
- BAM-mønstre (3-pinger alarm, 2-pinger warning).
- Magnetisk anomali, etasjebytte, NST-sekvenser.
- Event-logg (in-memory).

**Valideres:** events-frekvens i naturlig bruk. For mange?
For få? Riktig BAM-nivå?

### Iterasjon 5 — MainScreen (OpenBridge)

- Port `bridge-ux-v7.html` til React Native.
- Bearing-display (Canvas/SVG).
- Instrumentpaneler.
- Palett-bytte (auto + manuell).
- Start/stopp.

**Valideres:** spesifikasjonen oversetter rent til native.
Performance på Canvas/SVG ved ~30 fps.

---

## Fase 3 — Tilleggslag

### Iterasjon 6 — Stemme (Lag 6)

- `scripts/generateCache.ts` (kjøres én gang).
- `voice/` med phonetic, formatter, assembler, queue.
- ElevenLabs API kun under cache-generering.
- Koblet til Lag 3-events.

**Valideres:** stemmekvalitet, latency fra event til lyd, kø-logikk.
Stemmen avbryter ikke NST-sekvenser.

### Iterasjon 7 — Orbital (Lag 4)

- TLE-cache med dags-tag.
- `satellite.js` for posisjonsberegning.
- Pass-forhåndsberegning per oppstart + midnatt.
- ISS, Tiangong, Hubble.
- Voyager 1 som konstant via Horizons-ephemeris.

**Valideres:** passeringer treffer faktisk himmelposisjon
(sammenlign med Heavens-Above eller lignende).

### Iterasjon 8 — Luftfart (Lag 5)

- OpenSky med OAuth2 (basic auth fjernet 2026-03-18).
- 45s polling, bounding box ±0.5°.
- Tetthet (kontinuerlig drone) + nærhetsevents.
- Destinasjonsspråk for fly via callsign-lookup.

**Valideres:** ADS-B-densitet i Oslo. Batteripåvirkning av
polling + posisjonsberegninger.

---

## Fase 4 — Kontekst og polish

### Iterasjon 9 — Eksterne API-er

- NOAA Kp-indeks.
- met.no locationforecast.
- NILU NO2 (valgfritt).
- Påvirker ambient-lag + utløser alarmer ved Kp > 4.

**Valideres:** robusthet ved API-feil. Silent fallback når
offline. Cache-policy.

### Iterasjon 10 — Onboarding + EarconList + polish

- Port av onboarding-overlay og earcon-referanse fra prototype.
- `expo-background-fetch` for TLE og met.no.
- AppState-throttling (forgrunn/bakgrunn-rater).
- Batterimåling over 1 t bruk.
- Første kandidat for TestFlight.

**Valideres:** ≥ 4 t kontinuerlig bruk uten å drepe batteriet.
Onboarding er forståelig uten forklaring.

---

## Prinsipper

1. **HTML-prototypen er levende kravdokument.** Synkroniser med
   `CURSOR.md` mens du jobber.
2. **Stopp etter Fase 1.** Bruk appen en uke i lomma før Fase 2.
3. **Én iterasjon = én PR/branch.** Mergebar i seg selv.
4. **Hver iterasjon må kunne testes i lomma.** Simulator teller ikke.
