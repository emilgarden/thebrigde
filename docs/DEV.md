# Utviklerverktøy — logging og testing

## JavaScript-konsoll (Metro)

`console.log`, `console.warn` og feil fra React Native vises i terminalen der Metro kjører:

```bash
nvm use 22
npx expo start --host lan
```

Mac og iPhone må være på samme WiFi. Dette er den enkleste måten å se
JS-logg i Cursor — åpne en integrert terminal og kjør Metro **før** appen
startes.

Hvis splash-rutenettet henger: telefonen finner ikke Metro. Rist →
Configure Bundler → `DIN_MAC_IP:8081` (finn IP: `ipconfig getifaddr en0`).

## Native / enhetslogg i Cursor-terminal

Cursor har ikke innebygd Xcode-konsoll, men du kan strømme enhetslogg i en egen terminal mens du utvikler.

### Fysisk iPhone (anbefalt for dette prosjektet)

**Alternativ 1 — `log stream` (macOS, ingen ekstra installasjon):**

```bash
log stream --predicate 'processImagePath contains "Bridge"' --style compact
```

Bytt `"Bridge"` til app-navnet som vises under prosess hvis nødvendig (`com.oygarden.bridge`).

**Alternativ 2 — React Native CLI:**

```bash
npx react-native log-ios
```

**Alternativ 3 — Xcode debug-konsoll:**

1. Åpne `ios/Bridge.xcworkspace` i Xcode
2. Velg fysisk enhet som target
3. Run (⌘R) — konsollen nederst i Xcode viser native + JS (via Metro)

Når appen allerede kjører via dev client + Metro trenger du ikke rebuild for JS-endringer; Xcode-konsollen er mest nyttig for native feil, crash-rapporter og `NSLog`.

**Alternativ 4 — libimobiledevice (valgfritt):**

```bash
brew install libimobiledevice
idevicesyslog | grep -i bridge
```

### Simulator

```bash
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Bridge"' --style compact
```

## Anbefalt oppsett i Cursor

| Terminal | Kommando |
|----------|----------|
| 1 | `npx expo start --host lan` — JS + hot reload |
| 2 | `log stream --predicate 'processImagePath contains "Bridge"' --style compact` — native/enhet |

**Xcode-deploy:** bruk USB, ikke trådløs — unngår install-feil (CoreDeviceError 3002).

## UI-referanse iPhone 13 mini

OpenBridge-prototypen (`docs/bridge-ux-v7.html`) er designet for **375×812 pt** — samme som iPhone 13 mini.

Layout-tokens: `src/ui/theme/openBridgeLayout.ts`

| Token | Verdi |
|-------|-------|
| Bredde | 375 pt |
| Horisontal padding | 14 pt |
| Bearing-størrelse | 347 pt (375 − 2×14) |
| Event-logg min-høyde | 54 pt |

Test alltid på fysisk 13 mini etter layout-endringer — simulator har litt annerledes safe area.

## Stemme (Mac CLI)

**ElevenLabs kalles aldri fra iOS-appen.** Stemmer velges og testes i ElevenLabs UI;
prosjektskriptene genererer kun cache-filer til appen.

### Arbeidsflyt

1. Lag/velg stemmer i [ElevenLabs](https://elevenlabs.io) → kopier `voice_id`
2. `npm run voice:list` — se alle tilgjengelige stemmer
3. Sett kanaler i `scripts/voiceProfiles.json` (alpha / bravo / charlie)
4. `npm run voice:preview -- --text "bearing" --channel alpha --lang en` — test enkeltfrase
5. `npm run voice:generate -- --langs en,fr,no` — batch-cache (kun etter låste stemmer)

API-nøkkel: `.env.local` · Cache: `voice-dev-cache/`
