# Handoff — Bridge / NST-7

**Sist oppdatert:** 2026-05-19 (natt) · Iter 5 validert på iPhone 13 mini

Hensikten med dette dokumentet er å gi neste chat-økt nok kontekst til å
plukke opp arbeidet uten å re-lese hele transkriptet.

---

## TL;DR — hvor vi er

Iter 3–4 er merged til `master`. Iter 5 (MainScreen / OpenBridge UI) er
**implementert og validert** i branchen `iter-5-mainscreen` — pushet til
[github.com/emilgarden/thebrigde](https://github.com/emilgarden/thebrigde.git).

Primærskjermen følger `bridge-ux-v7.html` (375×812 pt, iPhone 13 mini):
bearing north-up, event-logg under bearing, instrumentpaneler 2×2, palett-
bytte, Roboto Condensed/Mono, ingen scroll.

**Første jobb i neste chat:** merge `iter-5-mainscreen` → `master`.
Deretter Iter 6 (stemme) eller mag-baseline-rekalibrering via fase-modul.

---

## Versjonskontroll

```
origin   https://github.com/emilgarden/thebrigde.git

master               Iter 3–4 (Lag 0–3 audio + events + NST)
└─ iter-5-mainscreen Iter 5 OpenBridge UI — VALIDERT, klar for merge

4045f94 feat(ui): harmonize OpenBridge layout for iPhone 13 mini
7d1c15f docs: document Iter 5 MainScreen implementation
eb083c6 feat(ui): port OpenBridge MainScreen from bridge-ux-v7 (Iter 5)
67f2a73 docs: add NST sequences to Iter 4 spec and handoff  ← master tip
```

---

## Hva som ble gjort i siste økt (2026-05-19, natt)

### Iter 5 — OpenBridge UI (implementert + validert)

- Port av `bridge-ux-v7.html` til React Native (`MainScreen.tsx`).
- `BearingDisplay.tsx` — north-up kompass med **ren RN Views** (ikke SVG;
  unngår Xcode-rebuild ved UI-endringer).
- `InstrumentPanel`, `StatusIndicator`, `SystemMenu`, `EventLogPanel`.
- `palettes.ts` + `PaletteContext` — night/dusk/day/bright, auto + manuell.
- Layout-tokens i `openBridgeLayout.ts` (375 pt, padding 14, bearing 347).
- Typografi: Roboto Condensed + Roboto Mono via `@expo-google-fonts` +
  `expo-font`.
- `react-native-safe-area-context` — top safe area + dynamisk bunn-padding.
- Flex-layout uten ScrollView. Rekkefølge: topbar → bearing → logg →
  instrumenter → start/stopp.
- `docs/DEV.md` — Metro-logging og enhetslogg i Cursor-terminal.

### Dev-oppsett (lært under testing)

- Metro: `npx expo start --host lan` (Mac og iPhone på samme WiFi).
- Bundler-URL på enhet: `192.168.x.x:8081` (Configure Bundler i dev-meny).
- Xcode-deploy: **USB**, ikke trådløs — unngår CoreDeviceError 3002.
- Splash-rutenett = JS ikke lastet = Metro ikke tilkoblet.
- Etter native endringer (font, safe-area): `cd ios && rm -rf Pods
  Podfile.lock && pod install`, deretter Xcode-rebuild.
- `ios/.xcode.env.local` (lokal, gitignored via `/ios`): NODE_BINARY + 
  `REACT_NATIVE_PACKAGER_HOSTNAME`.

---

## Tidligere økt (2026-05-19, kveld) — audio Iter 3–4

Se commit-historikk. Kort:

- Iter 3 scope-revisjon: revert JS-side ramp-tracking (knitring borte).
- Lag 0+ speedPulse, Lag 3 BAM-events + NST-sekvenser.
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

**UI (Iter 5):**
- OpenBridge MainScreen validert visuelt på iPhone 13 mini.
- Palett-bytte via ⚙ → Display palette.
- Instrumentverdier oppdateres sanntid fra `FusedState`.
- Event-logg viser siste 2 hendelser.

**Sensorer (`src/sensors/`):**
- Magnetometer (10-sek baseline + EMA α=0.3 i fusion)
- Barometer, akselerometer, gyroskop, GPS
- Stale-GPS-override (uvalidert): accel overstyrer frosset GPS til 0

**Recorder:** 5 Hz JSON-opptak via system-meny → Developer.

---

## Åpne spørsmål / neste arbeid

### Merge (prioritet 1)
```bash
git checkout master
git merge iter-5-mainscreen
git push origin master
```

### Iter 4 — feltvalidering (fortsatt relevant)
1. Events-frekvens — mag-warning ved 15 µT for følsom i by?
2. Debounce 14/8/12 s — riktig?
3. Ping-hørbarhet over ambient (-18/-24 dB)?
4. Baro-sustain 3 s — fungerer heistur?

Terskler: konstanter i `eventTriggers.ts`.

### Iter 5 — utsatt
- Alert-bannere (Kp, floor change) — events logges, vises ikke ennå.
- Onboarding + EarconList (Iter 10).
- Lyssensor auto-palett (fallback: tid på døgnet).

### Audio / sensor
- **Mag-baseline-rekalibrering** via fase-modul når idle >15 s
  (drift 38.95 → 60.03 µT observert mellom kontorrunder).

### Iter 6 — stemme
- ElevenLabs cache, koblet til Lag 3-events.
- Stemme avbryter ikke NST.

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
  DEV.md                 Metro, logging, iPhone 13 mini layout-ref

src/
  audio/                 engine, events, NST, modulation, nodes/
  sensors/               fusion, gps, mag, baro, accel, gyro, recorder
  state/eventLog.ts      In-memory event-logg (50 entries)
  ui/
    theme/
      palettes.ts          Fire OpenBridge-paletter
      PaletteContext.tsx   Auto/manuell palett
      openBridgeLayout.ts  Layout-tokens (375 pt baseline)
      typography.ts        Roboto font family names
    screens/MainScreen.tsx Primærskjerm
    components/
      BearingDisplay.tsx   North-up kompass (RN Views)
      InstrumentPanel.tsx  2×2 instrumentgrid
      EventLogPanel.tsx    2-rads event-logg
      StatusIndicator.tsx  GPS/Mag/Audio topbar
      SystemMenu.tsx       Palett + dev-verktøy

App.tsx                  Fonts + SafeAreaProvider + MainScreen
```

---

## Forslag til åpningsmelding i neste chat

> Vi fortsetter Bridge/NST-7. Iter 5 er validert i `iter-5-mainscreen`.
> Les `docs/HANDOFF.md`. Merge til master, deretter Iter 6 (stemme) eller
> mag-baseline-rekalibrering.
