\# HazePace



Mobile app combining weather and wildfire smoke forecasts so athletes can

decide when to train outdoors. Solo hobby project. iOS first.



\## Stack



\- Expo (managed workflow), expo-router for navigation

\- React Native — \*\*no web output\*\*

\- StyleSheet.create for styling

\- TypeScript

\- Built on Windows; iOS builds run via EAS Build, never locally



\## Hard constraints



\- React Native primitives only: View, Text, Pressable, ScrollView, FlatList.

&#x20; Never div, span, button, or any HTML element.

\- No CSS files, no CSS grid, no position:sticky, no hover states.

\- If a design calls for something with no React Native equivalent, say so

&#x20; and stop. Do not approximate it silently.

\- Shadows: iOS shadow props and Android elevation are different APIs.

&#x20; Handle both or note the gap.

\- No analytics SDKs, no ad SDKs, no tracking libraries. Ever.

\- Keep the dependency list minimal — every third-party SDK adds App Store

&#x20; privacy-manifest obligations.



\## Data



Forecast sources: to be determined — likely ECCC for weather and

FireSmoke.ca or BlueSky Canada for smoke. Not yet finalized.



\- All data is public government data. Source attribution must be visible

&#x20; in the UI.

\- Model output is gridded, not point data. Interpolation to a user

&#x20; coordinate is deliberate logic — never fake it or fall back to a

&#x20; hardcoded value.

\- Forecasts are frequently missing or stale. Absent data must render as

&#x20; "unavailable", never as zero, and never as a clean-air reading.



\## Language rules (non-negotiable)



This app must never make a health or safety claim. No "safe to breathe",

"safe to exercise", "healthy", or any medical framing — in UI copy,

variable names, or comments. Present conditions, thresholds and

timing; the user decides. This is an App Store review risk and a

liability issue.



\## Conventions



\- Ask before adding a dependency.

\- Small commits, plain-English messages.

\- I am learning mobile development — when you make a non-obvious

&#x20; architectural choice, explain why in one or two sentences.



