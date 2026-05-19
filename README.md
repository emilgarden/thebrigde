# Bridge / NST-7

iOS-app som sonifiserer sensordata fra telefonen til ambient lyd.
Telefon i lomma, lyd på ørepropper. Skjermen er sekundær.

Se [`docs/CURSOR.md`](./docs/CURSOR.md) for full spesifikasjon og
[`docs/bridge-ux-v7.html`](./docs/bridge-ux-v7.html) for UI-referanse.
Iterasjonsplan: [`docs/ITERATIONS.md`](./docs/ITERATIONS.md).
Utviklerverktøy og logging: [`docs/DEV.md`](./docs/DEV.md).

---

## Status

**Iterasjon 0–2 fullført 2026-05-19.** Ambient-lyd (Lag 0–2) spiller
parallelt over react-native-audio-api. Sensorfusion (magnetometer,
barometer, akselerometer, GPS) leser kontinuerlig og eksponerer
`FusedState`. Sensor-panel i appen viser sanntidsverdier.

**Neste:** Iterasjon 3 — kobling fra sensor til lyd. Magnetometer →
atmosfære-pitch, akselerometer → tekstur-filter, barometer → carrier-
frekvens, GPS → speed-pulslag (Lag 0+).

---

## Førstegangsoppsett

### 1. Verktøykjede

Krever Node 22, Xcode (full IDE) og Cocoapods.

```bash
nvm use 22

# Cocoapods (én gang, globalt)
brew install cocoapods           # eller: sudo gem install cocoapods

# Xcode lastes fra App Store (~10 GB).
# Etter installasjon, peker xcode-select til riktig sted:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -runFirstLaunch        # aksepterer lisens, installerer tilleggspakker
```

### 2. Avhengigheter

```bash
npm install
cd ios && pod install && cd ..
```

### 3. Build til enhet

```bash
open ios/Bridge.xcworkspace
```

I Xcode:
1. Velg **Bridge**-prosjektet → **Signing & Capabilities**
2. Velg eget Team (din Apple ID — gratis personlig konto fungerer)
3. Sett Bundle Identifier til noe unikt (f.eks. `com.dittnavn.bridge`)
4. Koble til iPhone via USB, velg den som destinasjon
5. ⌘R for å bygge og kjøre

På telefonen må du første gang godta utvikler-sertifikatet under
**Settings → General → VPN & Device Management**.

Etter første build kjøres JavaScript-endringer via Metro uten å rebuilde
native lag:

```bash
npm start
```

Native config-endringer (nye permissions, nye native moduler, endringer
i `app.json` som påvirker Info.plist) krever rebuild via Xcode.

---

## Testprosedyre — Iterasjon 0

1. Bygg og kjør på fysisk iPhone (simulator ignorerer bakgrunnsregler).
2. Trykk **Start**. Du skal høre en mild lav tone (58 Hz) som svakt
   pulserer — tremoloen er bevisst nesten umerkelig.
3. **Lås skjermen.** Tonen skal fortsette uavbrutt.
4. Sveip ned kontrollsenter — verifiser at media-widgeten viser at
   lyd er aktiv.
5. Skru på lydløs-modus (ringe-bryteren). Tonen skal fortsette
   (`iosCategory: 'playback'` overstyrer lydløs).
6. Trykk **Stop**. Tonen fader ut over 0.5 s.

Hvis steg 3 feiler:
- Sjekk at `UIBackgroundModes` i `ios/Bridge/Info.plist` inneholder `"audio"`.
- Sjekk at `AudioManager.setAudioSessionOptions({ iosCategory: 'playback' })`
  faktisk kjøres før `start()`.

---

## Mappestruktur

```
src/
  audio/
    engine.ts             AudioContext, masterchain, start/stop
    nodes/
      carrier.ts          Lag 0 — 58 Hz sinus + tremolo
  sensors/                expo-sensors-fusjon (Iter 2)
  orbital/                TLE + satellite.js (Iter 7)
  aviation/               OpenSky (Iter 8)
  voice/                  ElevenLabs cache (Iter 6)
  api/                    NOAA, met.no, NILU (Iter 9)
  state/                  Global tilstand
  ui/                     Skjermer, komponenter, paletter (Iter 5)
  scripts/                Engangs-skript

docs/                     Spesifikasjon + iterasjonsplan
ios/                      Generert av expo prebuild
```

---

## Verktøy

| Verktøy | Versjon | Status |
|---------|---------|--------|
| Node    | 22      | `nvm use 22` |
| Expo SDK | 54     | installert |
| React Native | 0.81 | installert |
| react-native-audio-api | 0.12.2 | installert |
| Xcode | ≥ 15 | **må installeres** |
| Cocoapods | ≥ 1.15 | **må installeres** |
