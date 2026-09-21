# Hazepace

Weather and wildfire-smoke conditions for deciding when to train outdoors.
Expo / React Native, iOS first.

The app rates each hour against the user's own limits for rain, wind and
heat, and against Environment and Climate Change Canada's AQHI guidance for
air. The rules are specified in [`docs/decision-rules.md`](docs/decision-rules.md);
the code follows that file.

## About this repository

Hazepace is a personal, non-commercial project by one person. It is
published so that the data providers it calls can see what is calling them.

- **Not licensed.** All rights reserved. The code is here to read, not to
  reuse, and contributions are not being accepted.
- **Contact:** clifford.smith@gmail.com, or the GitHub profile [@neptuak17](https://github.com/neptuak17).
- **If you operate one of the APIs below** and see this repository's URL in
  a `User-Agent` header, that traffic is this app. It fetches once per app
  open and on manual refresh, caches results, sends no personal data, and
  rounds every coordinate to two decimal places before requesting. Please
  get in touch if it is causing you trouble.

## Run

```bash
npm install
npx expo start --go
```

Scan the QR code with Expo Go on a phone on the same network. A full
reload (shake → Reload) is needed after changes to providers or hooks.

## Test

```bash
npm test
```

Pure-model tests under Node's built-in runner — no test framework. To
exercise the live data layer against both sources:

```bash
npm run check:conditions
```

Pass a coordinate (`npm run check:conditions -- 51.00 -118.20`) or `--all`
for the sample sites.

## Sources

- Environment and Climate Change Canada — AQHI observations and forecasts.
- Open-Meteo — hourly weather, air-quality pollutants (CAMS) and place
  search. CC BY 4.0; attribution is shown in the app.

## Layout

- `src/app/` — screens (expo-router)
- `src/components/` — shared UI
- `src/lib/` — data layer, place resolution, the rating model
- `src/constants/` — design tokens and every user-facing string
- `docs/decision-rules.md` — the rules the model implements
- `scripts/check-conditions.mjs` — live check of the data layer
