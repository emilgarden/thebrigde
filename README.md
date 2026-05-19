# Bridge / NST-7

iOS-app som sonifiserer sensordata fra telefonen til ambient lyd.
Telefon i lomma, lyd på ørepropper. Skjermen er sekundær.

Repo: [github.com/emilgarden/thebrigde](https://github.com/emilgarden/thebrigde)

Se [`docs/CURSOR.md`](./docs/CURSOR.md) for full spesifikasjon og
[`docs/bridge-ux-v7.html`](./docs/bridge-ux-v7.html) for UI-referanse.
Iterasjonsplan: [`docs/ITERATIONS.md`](./docs/ITERATIONS.md).
Handoff: [`docs/HANDOFF.md`](./docs/HANDOFF.md).
Utviklerverktøy: [`docs/DEV.md`](./docs/DEV.md).

---

## Status

**Iterasjon 0–5 implementert (2026-05-19).** Branch `iter-5-mainscreen`
— klar for merge til `master`.

- **Lyd:** Lag 0–3 (carrier, atmosphere, texture, speedPulse, BAM-events,
  NST-sekvenser) koblet til sensorfusion.
- **UI:** OpenBridge MainScreen validert på iPhone 13 mini — bearing,
  instrumenter, event-logg, palett-bytte.
- **Neste:** merge → Iter 6 (stemme) eller mag-baseline-rekalibrering.

---

## Daglig utvikling

```bash
nvm use 22
npm install

# Terminal 1 — Metro (start FØR appen åpnes)
npx expo start --host lan

# Terminal 2 — valgfritt, native logg
log stream --predicate 'processImagePath contains "Bridge"' --style compact
```

Mac og iPhone må være på **samme WiFi**. Hvis splash henger: rist telefonen
→ Configure Bundler → `DIN_MAC_IP:8081` → Reload.

---

## Førstegangsoppsett

### 1. Verktøykjede

Krever Node 22, Xcode og Cocoapods.

```bash
nvm use 22
brew install cocoapods
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -runFirstLaunch
```

### 2. Avhengigheter og pods

```bash
npm install
cd ios && pod install && cd ..
```

Ved feil med `expo-font` etter `npm install`:
```bash
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```

### 3. Build til enhet

```bash
open ios/Bridge.xcworkspace
```

I Xcode:
1. Koble iPhone med **USB** (ikke bare trådløs)
2. Velg Team under Signing & Capabilities
3. Velg fysisk enhet som destinasjon
4. ⌘R

Etter første native build: JS-endringer lastes via Metro uten rebuild.
Native moduler (font, safe-area, permissions) krever ny pod install + rebuild.

---

## Testprosedyre — grunnleggende

1. Start Metro (`npx expo start --host lan`).
2. Åpne appen på fysisk iPhone.
3. Trykk **Start** — hør ambient-tone (58 Hz carrier + lag).
4. Lås skjermen — lyd fortsetter.
5. Sjekk instrumentpaneler og event-logg under bearing.
6. Trykk **Stop** — fade out.

---

## Mappestruktur

```
src/
  audio/                  Lag 0–3, events, NST, modulation
  sensors/                Fusion, GPS, mag, baro, accel, gyro, recorder
  state/                  eventLog
  ui/
    theme/                Paletter, layout-tokens, typografi
    screens/              MainScreen
    components/           Bearing, instrumenter, event-logg, meny
  orbital/                TLE + satellite.js (Iter 7)
  aviation/               OpenSky (Iter 8)
  voice/                  ElevenLabs cache (Iter 6)
  api/                    NOAA, met.no, NILU (Iter 9)

docs/                     Spesifikasjon, iter-plan, handoff, DEV
ios/                      Generert av expo prebuild (gitignored)
```

---

## Verktøy

| Verktøy | Versjon | Merknad |
|---------|---------|---------|
| Node | 22 | `nvm use 22` |
| Expo SDK | 54 | |
| React Native | 0.81 | |
| react-native-audio-api | 0.12.2 | |
| Xcode | ≥ 15 | USB-deploy anbefalt |
| Cocoapods | ≥ 1.15 | |
