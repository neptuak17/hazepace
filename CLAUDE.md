# Hazepace

Mobile app combining weather and wildfire smoke forecasts so athletes can
decide when to train outdoors. Solo hobby project. iOS first.

## Stack

- Expo (managed workflow), expo-router for navigation
- React Native — iOS is the shipping target; no web output from app code
- StyleSheet.create for styling
- TypeScript
- Built on Windows; iOS builds run via EAS Build, never locally

## Hard constraints

- React Native primitives only: View, Text, Pressable, ScrollView, FlatList.
  Never div, span, button, or any HTML element.
- No CSS files, no CSS grid, no position:sticky, no hover states in app code.
- If a design calls for something with no React Native equivalent, say so
  and stop. Do not approximate it silently.
- Shadows: iOS shadow props and Android elevation are different APIs.
  Handle both or note the gap.
- No analytics SDKs, no ad SDKs, no tracking libraries. Ever.
- Keep the dependency list minimal — every third-party SDK adds App Store
  privacy-manifest obligations.
- iOS is the target platform. Write React Native components, not HTML.
  Do not delete the Expo template's React Native Web support — the .web.tsx
  platform variants are inert on iOS and the web target may be used later
  for the marketing site.

## Data

Forecast sources: to be determined — likely ECCC for weather and
FireSmoke.ca or BlueSky Canada for smoke. Not yet finalized.

- All data is public government data. Source attribution must be visible
  in the UI.
- Model output is gridded, not point data. Interpolation to a user
  coordinate is deliberate logic — never fake it or fall back to a
  hardcoded value.
- Forecasts are frequently missing or stale. Absent data must render as
  "unavailable", never as zero, and never as a clean-air reading.

## Language rules (non-negotiable)

This app must never make a health or safety claim. No "safe to breathe",
"safe to exercise", "healthy", or any medical framing — in UI copy,
variable names, or comments. Present conditions, thresholds and
timing; the user decides. This is an App Store review risk and a
liability issue.

## Conventions

- Ask before adding a dependency.
- Small commits, plain-English messages.
- I am learning mobile development — when you make a non-obvious
  architectural choice, explain why in one or two sentences.
