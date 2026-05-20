# Handoff — Bridge / NST-7

**Sist oppdatert:** 2026-05-20 · Iter 6 påbegynt, merged til `master`

Hensikten med dette dokumentet er å gi neste chat-økt nok kontekst til å
plukke opp arbeidet uten å re-lese hele transkriptet.

---

## TL;DR — hvor vi er

Iter 3–5 er implementert og validert. **Iter 6 (stemme) er påbegynt** og
merged til `master` via `iter-6-voice-lab`.

- Mac CLI for ElevenLabs (list / preview / generate cache)
- App-side voice-moduler (phonetic, assembler, profiles) — **ikke koblet til
  lydmotor ennå**
- Stemmer velges i **ElevenLabs UI** — `voiceProfiles.json` har `null` til
  nye voice_id er satt
- **Ingen full cache-generering** før alle tre kanaler har låst stemme

**Første jobb i neste chat:** velg og sett inn tre stemmer i
`voiceProfiles.json`, deretter queue + player + event-kobling.

---

## Versjonskontroll

```
origin   https://github.com/emilgarden/thebrigde.git

master               ← iter-6-voice-lab merged (Iter 3–6 delvis)
iter-5-mainscreen    44cfc09 (historisk, samme som pre-merge master)
iter-6-voice-lab     merged til master
```

---

## Hva som ble gjort i siste økt (2026-05-20)

### Iter 6 — stemme (delvis)

**Mac CLI (ElevenLabs kun på Mac, aldri i iOS-app):**

| Script | Kommando |
|--------|----------|
| List stemmer | `npm run voice:list` |
| Test én frase | `npm run voice:preview -- --text "bearing" --channel alpha --lang en` |
| Batch-cache | `npm run voice:generate -- --langs en,fr,no` |

- `scripts/lib/elevenlabs.ts` — TTS + filskriving
- `scripts/lib/env.ts` — `.env.local`, `voiceProfiles.json`, cache-stier
- `scripts/voiceProfiles.json` — kanal-tilordning (se under)
- `voice-dev-cache/` — genererte MP3 (gitignored unntatt `manifest.json`)
- API-nøkkel i `.env.local` (gitignored)

**App-side moduler (`src/voice/`):**

- `phonetic.ts` — NATO, tall, språk
- `keywords.ts` — kontekstord per språk
- `profiles.ts` — ALPHA / BRAVO / CHARLIE kanaler
- `assembler.ts` — bygger segment-lister for kunngjøringer
- `types.ts` — delte typer

**Ikke implementert ennå:**

- `voice/queue.ts` — 45 s gap, 5 min cooldown, prioritet
- `voice/player.ts` — avspilling i app (prod-cache fra `documentDirectory`)
- Kobling til Lag 3-events (mag-anomaly via ALPHA først)
- Full cache-generering og deploy til app-bundle (**venter på låste stemmer**)

**Arkitekturbeslutning:** Voice Lab (lokalt web-dashboard med audition,
Voice Design, slot-sletting) ble droppet. Stemmer lages og testes i
ElevenLabs UI → `voice_id` kopieres til `voiceProfiles.json`.

### Stabilitet — minne og native

- **Fusion throttle:** abonnenter får maks 5 Hz (200 ms) — unngår React
  re-render-storm over lange økter.
- **Recorder v2:** NDJSON streaming med flat minnebruk (ikke lenger full
  JSON.stringify av hele bufferet hvert 30. sekund).
- **iOS OOM:** app drept etter ~2 t debug på iPhone 13 mini — sannsynlig
  kombinasjon av throttle + recorder-fix adresserer dette; ikke re-validert
  over natten ennå.
- **`expo-av` fjernet** fra avhengigheter. Ved build-feil om EXAV/Swift:
  `cd ios && rm -rf Pods Podfile.lock build && pod install`.

---

## Tidligere økter

### Iter 5 — OpenBridge UI (2026-05-19, validert)

- Port av `bridge-ux-v7.html` til `MainScreen.tsx`.
- `BearingDisplay.tsx` — north-up kompass med RN Views (ikke SVG).
- Paletter, layout-tokens, Roboto Condensed/Mono, safe-area.
- `docs/DEV.md` — Metro, logging, layout-ref.

### Iter 3–4 — audio (2026-05-19)

- Lag 0–3, speedPulse, BAM-events, NST-sekvenser.
- `eventTriggers.ts`, `eventScheduler.ts`, `nstScheduler.ts`.

---

## Status: hva fungerer i dag

**Dev på fysisk iPhone 13 mini via Xcode (Personal Team).** Metro over LAN.
Lock screen-kontroller virker. Ren JS-endring trenger ikke Xcode-rebuild.

**Lyd:**
- Lag 0 (carrier) — 58 Hz sinus + LFO tremolo. Pitch moduleres av baro-delta.
- Lag 0+ (speedPulse) — 50 Hz sub modulert av kmh-LFO.
- Lag 1 (atmosphere) — D4+A4 gjennom syntetisk reverb. Statisk wet 0.20.
- Lag 2 (texture) — pink noise gjennom bandpass. Mag → bandpass-freq.
- Lag 3 (events) — ping-motor + scheduler + triggers. Mag- og baro-triggert.
- Lag 3 (NST) — tidsbaserte sinussekvenser, random 22–50 s.
- **Lag 6 (stemme) — ikke koblet.**

**UI (Iter 5):**
- OpenBridge MainScreen validert visuelt på iPhone 13 mini.
- Palett-bytte via ⚙ → Display palette.
- Instrumentverdier oppdateres sanntid fra `FusedState` (throttled 5 Hz).
- Event-logg viser siste 2 hendelser.

**Sensorer (`src/sensors/`):**
- Magnetometer (10-sek baseline + EMA α=0.3 i fusion)
- Barometer, akselerometer, gyroskop, GPS
- Stale-GPS-override (uvalidert): accel overstyrer frosset GPS til 0

**Recorder:** 5 Hz NDJSON-opptak via system-meny → Developer.

---

## Stemmeprofiler

**Ikke låst.** Tidligere audition-stemmer (Marina/Daniel/River) er fjernet.
Velg tre nye stemmer i ElevenLabs → `npm run voice:list` → sett `voice_id`
i `scripts/voiceProfiles.json` per kanal.

| Kanal | voice_id | Label |
|-------|----------|-------|
| ALPHA | *(null)* | Velg i ElevenLabs |
| BRAVO | *(null)* | Velg i ElevenLabs |
| CHARLIE | *(null)* | Velg i ElevenLabs |

Full cache (`npm run voice:generate`) kjøres **ikke** før alle tre er satt.
Enkeltpreview (`npm run voice:preview`) fungerer med `--voice <id>` under utvelgelse.

---

## Åpne spørsmål / neste arbeid

### Iter 6 — gjenstående
1. **Velg og lås** tre stemmer i ElevenLabs → oppdater `voiceProfiles.json`
2. **`voice/queue.ts`** — 45 s gap, 5 min cooldown, prioritet
3. **`voice/player.ts`** — avspill MP3 fra prod-cache
4. **Wire til events** — mag-anomaly → ALPHA først
5. **Full cache + prod-deploy** — etter stemmer er låst

### Iter 4 — feltvalidering (fortsatt relevant)
1. Events-frekvens — mag-warning ved 15 µT for følsom i by?
2. Debounce 14/8/12 s — riktig?
3. Ping-hørbarhet over ambient (-18/-24 dB)?
4. Baro-sustain 3 s — fungerer heistur?

Terskler: konstanter i `eventTriggers.ts`.

### Audio / sensor
- **Mag-baseline-rekalibrering** via fase-modul når idle >15 s
  (drift 38.95 → 60.03 µT observert mellom kontorrunder).

### Iter 5 — utsatt
- Alert-bannere (Kp, floor change) — events logges, vises ikke ennå.
- Onboarding + EarconList (Iter 10).
- Lyssensor auto-palett (fallback: tid på døgnet).

---

## Filosofi (uendret)

"Det usynlige skal være hørbart, det åpenbare skal være taust."

Final mix-balanse utsettes til Lag 3–6 er på plass.

---

## Testdata

Tre opptak i `~/Downloads/` (2026-05-19). Se canvases i
`~/.cursor/projects/Users-oleemil-thebridge/canvases/`.

**Nøkkelfunn:** baro repeterbart ±0.1 m, mag-drift mellom runder,
el-buss 60–180 µT, heistur ±13 m over 10–12 s.

---

## Filer å orientere seg i

```
docs/
  CURSOR.md              Project brief — kilde til sannhet
  ITERATIONS.md          Iter-plan, hvor vi er
  HANDOFF.md             Dette dokumentet
  DEV.md                 Metro, logging, voice CLI

scripts/                 Mac-only ElevenLabs (aldri i app)
  lib/elevenlabs.ts      TTS API
  lib/env.ts             .env.local, profiler, cache-stier
  voiceProfiles.json     Kanal → voice_id
  listVoices.ts          npm run voice:list
  voicePreview.ts        npm run voice:preview
  generateCache.ts       npm run voice:generate

voice-dev-cache/         Generert cache (MP3 gitignored)

src/
  audio/                 engine, events, NST, modulation, nodes/
  sensors/               fusion, gps, mag, baro, accel, gyro, recorder
  state/eventLog.ts      In-memory event-logg (50 entries)
  voice/                 phonetic, assembler, profiles (Iter 6, delvis)
  ui/
    theme/               Paletter, layout, typografi
    screens/MainScreen.tsx
    components/          Bearing, instrumenter, event-logg, meny

App.tsx                  Fonts + SafeAreaProvider + MainScreen
```

---

## Forslag til åpningsmelding i neste chat

> Vi fortsetter Bridge/NST-7 på `master`. Les `docs/HANDOFF.md`.
> Iter 6: velg tre stemmer i ElevenLabs, sett voiceProfiles.json, deretter
> queue + player + event-kobling. Full cache venter til stemmer er låst.
