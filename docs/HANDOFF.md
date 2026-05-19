# Handoff — Bridge / NST-7

**Sist oppdatert:** 2026-05-19 (sen kveld) · etter scope-revisjon

Hensikten med dette dokumentet er å gi neste chat-økt nok kontekst til å
plukke opp arbeidet uten å re-lese hele transkriptet.

---

## TL;DR — ny retning

Etter en runde med detalj-arbeid på modulasjonsløkka (anti-knitring,
ramp-tracking, smoothing) erkjenner vi at det er **scope creep**.
Vi har brukt energi på å perfeksjonere kontinuerlig sensor→audio-
modulasjon før vi vet om infrastrukturen for **events** og **stemme**
faktisk fungerer.

**Ny prioritet:** sikre at sensoravlesninger faktisk kan trigge
distinkte lyder eller stemme-kunngjøringer (Iter 4 → Iter 6).
Kontinuerlig modulasjon kan være "ok nok" inntil videre — vi tuner
balansen og smoothing når hele systemet er på plass.

**Første jobb i neste chat:** revider eksisterende kode for
hensiktsmessig scope. Sannsynligvis simplifisere/revertere ting fra
denne økten før vi går videre.

---

## Hva som ble gjort i denne økten (2026-05-19, kveld)

### Bunt 1 — Fjernet motarbeidende koblinger (gjennomført)

Per filosofien "usynlig → hørbart, åpenbart → taust":

- `src/audio/engine.ts`: fjernet `TEXTURE_GAIN_IDLE/ACTIVE` + `onPhaseChange`-
  kobling. Tekstur følger nå mag kontinuerlig uten fase-gate.
- `src/audio/engine.ts`: fjernet `motionToReverbWet`-kobling. Atmosfærens
  reverb-wet ligger statisk på 0.20.
- `src/audio/modulation.ts`: slettet `motionToReverbWet`-funksjonen.
- `src/audio/nodes/atmosphere.ts`: docstring oppdatert — `setReverbWet`
  beholdes som API, men er ikke koblet til sensorinngang.
- `phase.update()` kjøres fortsatt i tikket kun for UI-footer.
  Skal flyttes til intern bruk i fusion (mag-baseline-rekalibrering).

### Bunt 2 — Speed Pulse (Lag 0+) implementert

Per CURSOR.md linje 296–314:

- Ny fil `src/audio/nodes/speedPulse.ts`. 50 Hz sub-sinus modulert av
  LFO med frekvens `kmh × 0.008` Hz. Output gain ramps 0→1 over 4s ved
  fart, 1→0 over 8s ved GPS-tap / speedKmh=0. PULSE_DEPTH = 0.7.
- `src/audio/modulation.ts`: ny `speedKmhToPulseLfoHz(kmh)` helper.
- `src/audio/engine.ts`: speedPulse opprettes/disposes parallelt med
  øvrige lag, oppdateres hver tikk med `s.speedKmh + s.hasGpsFix`.

### Anti-knitring (resultat: blandet/forverret)

Bruker rapporterte knitring i lyden foran PC. Vi forsøkte tre fikser
i tur, og det ble verre ved siste:

1. **Mag-EMA i fusion** (α=0.3 på rå magnitude før deviation regnes) —
   `src/sensors/fusion.ts`. Liten effekt.
2. **Bandpass Q 1.7 → 1.0** i `src/audio/nodes/texture.ts`. Liten effekt.
3. **Bandpass-ramp 0.4s → 1.0s** i `src/audio/nodes/texture.ts`. Liten
   effekt.
4. **JS-side ramp-tracking** via ny `src/audio/ramp.ts` (helper) brukt i
   carrier, texture, speedPulse. **Gjorde det verre** — knitring ble
   tydeligere.

**Konklusjon:** vår hypotese om at `AudioParam.value`-getteren i
`react-native-audio-api` 0.12.x var stale, stemte sannsynligvis ikke.
JS-side ramp-tracking innfører nå drift mellom JS-modellen og faktisk
audio-scheduler. Mest sannsynlig fix: revertere ramp.ts og bruke det
opprinnelige mønsteret.

**Stale-GPS-fix fra forrige sesjon er fortsatt ikke validert.**

---

## Aktuelt scope-spørsmål for neste chat

Iter-planen ([docs/ITERATIONS.md](./ITERATIONS.md)) sier Iter 3 må føles
riktig før vi går til Iter 4. Spørsmålet er: **hvor "riktig" er bra nok?**

Forslag til prinsipp: Iter 3 er ferdig så snart:
1. Lagene kan høres uten åpenbare feil (ingen klikk/knitring som
   distraherer).
2. Sensor-input påvirker lyden på *en* måte (selv om mappingen ikke er
   finjustert).
3. Speed Pulse er hørbar på tur og forsvinner i tunnel.

Alt utover dette utsettes til etter Iter 4–6 er på plass, slik at
balansen tunes mot hele lydbildet — ikke et halvt.

Konkret revisjon i neste chat — sannsynlig liste:
- Revertere `src/audio/ramp.ts` + JS-tracking i carrier/texture/speedPulse,
  tilbake til opprinnelig `cancelScheduledValues + setValueAtTime(param.value, t)` mønster.
- Vurdere om mag-EMA + Q-reduksjon + slow ramp i texture skal beholdes
  som de er, justeres delvis, eller reverteres.
- Bekrefte at lyden er "ok nok" og gå videre til Iter 4 (events / Lag 3).

---

## Status: hva fungerer i dag

**Dev Client på iPhone via Xcode (Personal Team).** Metro startes med
`npx expo start --dev-client --tunnel`. Lock screen-kontroller virker.
Ren JS-endring trenger ikke Xcode-rebuild.

**Lyd:**
- Lag 0 (carrier) — 58 Hz sinus + LFO tremolo. Pitch moduleres av baro-delta.
- Lag 0+ (speedPulse, NY) — 50 Hz sub modulert av kmh-LFO. Untested in lomma.
- Lag 1 (atmosphere) — D4+A4 gjennom syntetisk reverb. Statisk wet.
- Lag 2 (texture) — pink noise gjennom bandpass. Mag → bandpass-freq.

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

Fra forrige handover — pkt 1, 2, 3 er gjort. Pkt 4 gjenstår:

4. **Bruk fase-modulen internt til mag-baseline-rekalibrering.** Når
   `idle` har vart >15 sek, rekalibrer mag-baseline (adresserer
   driften vi så mellom kontorrunde 1 og 2: 38.95 → 60.03 µT).
   `phase.update()` kjøres fortsatt i engine for UI — men selve
   detektoren skal flyttes til fusion og brukes der.

Dette kan godt utsettes til etter scope-revisjon.

---

## Testdata

Tre opptak ligger i `~/Downloads/`:

| Fil | Tid | Innhold | Status |
|---|---|---|---|
| `session-2026-05-19_13-29-01.json` | 3:34 | Kontorrunde 1 (heis ned, ut, trapp, ut, heis opp) | Analysert i `iter3-validation.canvas.tsx` |
| `session-2026-05-19_13-43-00.json` | 4:02 | Kontorrunde 2 (samme rute, 14 min senere) | Analysert i `iter3-validation.canvas.tsx` |
| `session-2026-05-19_14-06-13.json` | 29:24 | Nydalen-kontor → el-buss → Fredensborg 3. etg | Analysert i `bus-trip-analysis.canvas.tsx` |

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
    engine.ts            Modulasjonsløkke; speedPulse hooked in
    phase.ts             Binær idle/active (uendret denne økten)
    modulation.ts        Pure functions; speedKmhToPulseLfoHz lagt til
    ramp.ts              [NY denne økten] JS-side ramp-tracking — KANDIDAT FOR REVERT
    nodes/
      carrier.ts         JS-side ramp-tracking lagt til (sannsynlig revert)
      atmosphere.ts      Static wet, setReverbWet ikke kalt
      texture.ts         Q=1.0, ramp=1.0s, JS-side ramp (sannsynlig revert)
      speedPulse.ts      [NY denne økten] Lag 0+
  sensors/
    fusion.ts            Mag-EMA + stale-GPS-override (uvalidert)
    gps.ts               BestForNavigation, 1 Hz
    accelerometer.ts
    magnetometer.ts
    barometer.ts
    gyroscope.ts
    recorder.ts          5 Hz session-opptak
    types.ts             FusedState

App.tsx                  Root — initierer fusion, audio, UI
```

---

## Forslag til åpningsmelding i neste chat

> Vi fortsetter Bridge/NST-7. Les `docs/HANDOFF.md` for kontekst.
> Forrige økt eskalerte i scope rundt anti-knitring (JS-side ramp-
> tracking) som gjorde lyden verre, ikke bedre. Vi skal nå revidere
> eksisterende kode mot et hensiktsmessig scope: Iter 3 er ferdig
> så snart lyden er "ok nok" — vi tuner ikke mer her før event-
> trigging og stemme (Iter 4–6) er på plass.
>
> Start med å foreslå hva som bør reverteres (sannsynlig kandidat:
> `src/audio/ramp.ts` + JS-tracking i carrier/texture/speedPulse).
> Ikke gjør endringene før jeg har godkjent listen.
