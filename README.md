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

**Iterasjon 0–5 implementert og validert. Iter 6 påbegynt** (2026-05-20).
Aktiv branch: `master` (Iter 6 merged).

- **Lyd:** Lag 0–3 koblet til sensorfusion. Stemme (Lag 6) ikke koblet ennå.
- **UI:** OpenBridge MainScreen validert på iPhone 13 mini.
- **Stemme (Mac CLI):** `npm run voice:list|preview|generate` — se
  [`docs/DEV.md`](./docs/DEV.md). ElevenLabs kalles aldri fra iOS-appen.
- **Neste:** velg tre stemmer i ElevenLabs → queue/player → event-kobling.
  Full cache-generering venter til stemmer er låst.

---

## Stemme-cache (Mac, valgfritt)

Krever `ELEVENLABS_API_KEY` i `.env.local`:

```bash
npm run voice:list                                          # se stemmer
npm run voice:preview -- --text "bearing" --channel alpha --lang en --voice <id>
npm run voice:generate -- --langs en,fr,no   # kun etter alle kanaler er satt
```

Kanaler konfigureres i `scripts/voiceProfiles.json`.

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

Ved feil med `expo-font` eller stale native pods (f.eks. EXAV etter fjernet modul):
```bash
cd ios && rm -rf Pods Podfile.lock build && pod install && cd ..
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
  voice/                  Phonetic, assembler, profiles (Iter 6, delvis)
  ui/
    theme/                Paletter, layout-tokens, typografi
    screens/              MainScreen
    components/           Bearing, instrumenter, event-logg, meny
  orbital/                TLE + satellite.js (Iter 7)
  aviation/               OpenSky (Iter 8)
  api/                    NOAA, met.no, NILU (Iter 9)

scripts/                  Mac-only ElevenLabs CLI (Iter 6)
voice-dev-cache/          Generert TTS-cache (gitignored unntatt manifest)

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
