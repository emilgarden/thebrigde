# Handoff — Bridge / NST-7

**Sist oppdatert:** 2026-05-19 (sen kveld) · Iter 5 MainScreen implementert

Hensikten med dette dokumentet er å gi neste chat-økt nok kontekst til å
plukke opp arbeidet uten å re-lese hele transkriptet.

---

## TL;DR — hvor vi er

Iter 3–4 er merged til `master`. Iter 5 (MainScreen / OpenBridge UI)
er implementert i branchen `iter-5-mainscreen` — primærskjermen er
portert fra `bridge-ux-v7.html` med bearing-display, instrumentpaneler,
palett-bytte og event-logg.

**Første jobb i neste chat:** valider Iter 5 på fysisk iPhone (layout,
palett-bytte, bearing ytelse). Merge til master. Deretter Iter 6
(stemme) eller mag-baseline-rekalibrering.

---

## Versjonskontroll

Repoet bruker nå commit-disiplin per logisk bunt og branch per iter.

```
master               Iter 3–4 merged (Lag 0–3 audio + events + NST)
└─ iter-5-mainscreen pågående — OpenBridge MainScreen

67f2a73 docs: add NST sequences to Iter 4 spec and handoff
7a3a9d7 fix(audio): revert JS-side ramp tracking (Iter 3 scope revision)
```

Ingen remote er konfigurert ennå. Hvis backup/multi-device blir
relevant: `git remote add origin <url>` + `git push -u origin master`.

---

## Hva som ble gjort i denne økten (2026-05-19, kveld)

### Bunt 1 — Fjernet motarbeidende koblinger (Iter 3-rensk)

Per filosofien "usynlig → hørbart, åpenbart → taust":

- `engine.ts`: fjernet `TEXTURE_GAIN_IDLE/ACTIVE` + `onPhaseChange`-
  kobling. Tekstur følger nå mag kontinuerlig uten fase-gate.
- `engine.ts`: fjernet `motionToReverbWet`. Atmosfærens reverb-wet
  ligger statisk på 0.20.
- `modulation.ts`: slettet `motionToReverbWet`-funksjonen.
- `atmosphere.ts`: `setReverbWet` beholdt som API uten kobling.

### Bunt 2 — Speed Pulse (Lag 0+)

Per CURSOR.md linje 296–314:
- 50 Hz sub-sinus modulert av LFO med frekvens `kmh × 0.008` Hz.
- Output gain ramps 0→1 over 4 s ved fart, 1→0 over 8 s ved GPS-tap.
- PULSE_DEPTH = 0.7.

### Bunt 3 — Iter 3 scope-revisjon (revert)

- Slettet `src/audio/ramp.ts` (JS-side ramp-tracking).
- carrier/texture/speedPulse tilbake til opprinnelig mønster:
  `cancelScheduledValues + setValueAtTime(param.value, t) +
  linearRampToValueAtTime`.
- Beholdt mag-EMA α=0.3 (fusion), Q=1.0 (texture), FREQ_RAMP_SEC=1.0
  (texture) — uavhengig av ramp-hypotesen og dokumentert i kommentarer.

Bekreftet i lyttetest: ingen knitring lenger.

### Bunt 4 — Iter 4 implementasjon (Lag 3)

Tre nye moduler + UI for BAM-events:

- `audio/nodes/events.ts` — felles ping-motor med envelope + bandpass.
- `audio/eventScheduler.ts` — BAM-patterns (alarm 3×2, warning 2×1) +
  debounce per trigger-nøkkel.
- `audio/eventTriggers.ts` — leser FusedState, fyrer mag-alarm,
  mag-warning, baro-warning (sustained 3 s).
- `state/eventLog.ts` — in-memory ringbuffer (50) + subscribe.
- `ui/components/EventLogStrip.tsx` — kompakt 4-rads strip.

Engine: events opprettes/dispose-es parallelt med øvrige lag.
Triggers evalueres i 5 Hz modulasjonsløkke.

### Bunt 5 — NST-sekvenser (Lag 3 tilleggsdel)

- `audio/nodes/nst.ts` — sekvensspiller med bandpass 1200 Hz Q 0.8,
  StereoPannerNode ±0.3 tilfeldig per sekvens. 4 forhåndsdefinerte
  semitone-sekvenser fra A4=440 Hz, 420 ms spacing, 160–240 ms
  tone-varighet, -34 dB.
- `audio/nstScheduler.ts` — setTimeout-løkke, random 22–50 s intervall.
- Helt uavhengig av eventScheduler — per CURSOR.md skal NST aldri
  avbrytes av sensor-events.

---

## Aktuelt scope-spørsmål for neste chat

Iter 4 må valideres i felt før den merges. Spørsmål som må besvares:

1. **Events-frekvens** — er det for mange triggere i naturlig bruk?
   Mag-warning ved 15 µT kan være for følsomt i støyfylte bymiljøer.
2. **Debounce** — føles 14 s / 8 s / 12 s riktig, eller er det for kort/langt?
3. **Hørbarhet** — er pingene tydelige over ambient-lagene uten å være
   sjokkerende? -18/-24 dB er fra spec, men kan måtte justeres.
4. **Baro-sustain** — 3 s krever stabil ramp. Heistur fra 1. til 4. etg
   tar typisk 8–10 s, så det skal trigge. Korte hopp vil ikke. Bra?

Konkret arbeid hvis triggere må justeres:
- Tersklene ligger som konstanter øverst i `eventTriggers.ts`.
- Debounce-vinduer er felter på `FireOptions` i scheduler-kall.

---

## Status: hva fungerer i dag

**Dev Client på iPhone via Xcode (Personal Team).** Metro startes med
`npx expo start --dev-client --tunnel`. Lock screen-kontroller virker.
Ren JS-endring trenger ikke Xcode-rebuild.

**Lyd:**
- Lag 0 (carrier) — 58 Hz sinus + LFO tremolo. Pitch moduleres av baro-delta.
- Lag 0+ (speedPulse) — 50 Hz sub modulert av kmh-LFO.
- Lag 1 (atmosphere) — D4+A4 gjennom syntetisk reverb. Statisk wet.
- Lag 2 (texture) — pink noise gjennom bandpass. Mag → bandpass-freq.
- Lag 3 (events) — ping-motor + scheduler + triggers. Mag- og
  baro-trigget BAM-mønstre.
- Lag 3 (NST) — tidsbaserte sinussekvenser med radio-bandpass,
  random panning, hvert 22–50 s.

**Sensorer (`src/sensors/`):**
- Magnetometer (10-sek baseline + EMA α=0.3 i fusion)
- Barometer (relativ høyde via trykk-delta)
- Akselerometer (smoothet til `motionIntensity`)
- Gyroskop (`gyro` + `rotationIntensity`)
- GPS (`BestForNavigation`, 1 Hz, 1 m intervall)
- Stale-GPS-override (uvalidert): accel overstyrer frosset GPS til 0

**Recorder (`src/sensors/recorder.ts` + `RecorderBar.tsx`):**
- 5 Hz sample-rate, ring-buffer + periodiske file-flushes
- Eksport som JSON, share via systemets Share-API

**State:**
- `state/eventLog.ts` — derivat av scheduler-output, 50-entries ringbuffer.

---

## Filosofi (uendret)

"Det usynlige skal være hørbart, det åpenbare skal være taust."
Bevegelse er åpenbar (du føler det). Hvor *fort* man beveger seg,
hva magnetfeltet gjør, lufttrykk-endringer — det er usynlig og må
bæres av lyd.

Akselerometer/gyroskop: subtile modulasjoner og bevegelseshendelser,
ikke primære informasjonsbærere (CURSOR.md linje 25–26).

Final mix-balanse utsettes til Lag 3–6 er på plass.

---

## Avtalte men ikke startede oppgaver

1. **Bruk fase-modulen internt til mag-baseline-rekalibrering.** Når
   `idle` har vart >15 sek, rekalibrer mag-baseline (adresserer
   driften 38.95 → 60.03 µT mellom kontorrunder).
2. **MainScreen / OpenBridge UI** — Iter 5.

---

## Testdata

Tre opptak ligger i `~/Downloads/`:

| Fil | Tid | Innhold | Status |
|---|---|---|---|
| `session-2026-05-19_13-29-01.json` | 3:34 | Kontorrunde 1 | Analysert i `iter3-validation.canvas.tsx` |
| `session-2026-05-19_13-43-00.json` | 4:02 | Kontorrunde 2 | Analysert i `iter3-validation.canvas.tsx` |
| `session-2026-05-19_14-06-13.json` | 29:24 | Nydalen → el-buss → Fredensborg | Analysert i `bus-trip-analysis.canvas.tsx` |

**Nøkkelfunn:**
- Barometer repeterbart innen 0.1 m mellom runder
- Mag-baseline driftet 38.95 → 60.03 µT mellom runder (drift-problem)
- El-buss: distinkt mag 60–180 µT (vs t-bane 1500+ µT, vs gange ~5 µT)
- GPS 98.9 % fix utendørs, ~0–7 % innendørs
- Heistur ±13 m baro-rampe over 10–12 sek
- Gyroskop fanger dørgjennomgang og trapper (5.6 rad/s spikes)

---

## Canvases (analyser)

I `~/.cursor/projects/Users-oleemil-thebridge/canvases/`:
- `iter3-validation.canvas.tsx` — begge kontorrunder, fase-detektor-bug-fiks
- `sensor-trip-analysis.canvas.tsx` — t-bane-tur Majorstuen → Nationaltheatret
- `bus-trip-analysis.canvas.tsx` — el-buss-turen, GPS-bug-funn

---

## Filer å orientere seg i

```
docs/
  CURSOR.md              Project brief — kilde til sannhet
  ITERATIONS.md          Iter-plan, hvor vi er
  HANDOFF.md             Dette dokumentet

src/
  audio/
    engine.ts            Modulasjonsløkke; events hooket inn
    phase.ts             Binær idle/active (uendret denne økten)
    modulation.ts        Pure functions
    eventScheduler.ts    [Iter 4] BAM-patterns + debounce
    eventTriggers.ts     [Iter 4] FusedState → scheduler-kall
    nstScheduler.ts      [Iter 4] Tidsbasert NST-løkke
    nodes/
      carrier.ts         58 Hz + tremolo + baro-pitch
      atmosphere.ts      D4+A4 + statisk reverb-wet
      texture.ts         Pink noise + bandpass styrt av mag
      speedPulse.ts      [Iter 3] 50 Hz sub modulert av kmh-LFO
      events.ts          [Iter 4] Ping-motor + glissando
      nst.ts             [Iter 4] NST sinus-sekvenser med radio-BP
  sensors/
    fusion.ts            Mag-EMA + stale-GPS-override (uvalidert)
    gps.ts               BestForNavigation, 1 Hz
    accelerometer.ts
    magnetometer.ts
    barometer.ts
    gyroscope.ts
    recorder.ts          5 Hz session-opptak
    types.ts             FusedState
  state/
    eventLog.ts          [Iter 4] In-memory event-logg
  ui/
    theme/
      palettes.ts          [Iter 5] OpenBridge fire paletter
      PaletteContext.tsx   [Iter 5] Auto/manuell palett
    screens/
      MainScreen.tsx       [Iter 5] Primærskjerm
    components/
      BearingDisplay.tsx   [Iter 5] North-up kompass (SVG)
      InstrumentPanel.tsx  [Iter 5] Enkelt instrument
      StatusIndicator.tsx  [Iter 5] Topbar GPS/Mag/Audio
      SystemMenu.tsx       [Iter 5] Palett + dev-verktøy
      EventLogPanel.tsx    [Iter 5] 2-rads event-logg
      SensorPanel.tsx      Debug (ikke i MainScreen)
      RecorderBar.tsx      Session-opptak (i system-meny)

App.tsx                  Root — PaletteProvider + MainScreen
```

---

## Forslag til åpningsmelding i neste chat

> Vi fortsetter Bridge/NST-7. Iter 5 (MainScreen) er implementert i
> branch `iter-5-mainscreen`. Les `docs/HANDOFF.md`.
>
> Valider på iPhone: layout, palett-bytte (⚙ → Display palette), bearing-
> display, instrumentoppdatering. Merge til master hvis ok.
>
> Neste etter merge: Iter 6 (stemme) eller mag-baseline-rekalibrering
> (fase-modul → fusion, adresserer 38.95→60.03 µT drift).
