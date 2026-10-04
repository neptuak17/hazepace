# Hazepace privacy policy

_Effective 2 October 2026_

Hazepace shows weather and air quality conditions so you can decide when to
train outdoors. It has no accounts, no server of its own, no analytics, no
advertising, no crash reporting and no tracking. This page sets out what
leaves your phone, who receives it, and what stays on the phone.

## What leaves your phone

Hazepace asks two public data services for conditions. Nothing is sent to
the developer.

**Open-Meteo** (open-meteo.com) supplies the weather, the air quality model
and the place search. It receives:

- **An approximate location:** a latitude and longitude rounded to two
  decimal places, which is about one kilometre. The phone's exact position
  never leaves the device; it is rounded on the phone before anything is sent.
- **The text you type into the place search**, if you use it, so a town
  name can be turned into a location.

**Environment and Climate Change Canada** (api.weather.gc.ca) supplies air
quality readings and forecasts. It does not receive your location. Hazepace
downloads ECCC's public list of reporting communities and the latest reading
for every one of them across Canada, picks the ones near you on the phone,
and then asks for the nearest community's reading and forecast by its
identifier.

Like any web request, each one also carries your phone's IP address and a
short line naming the app (`Hazepace/1.0`), which lets the services see that
the request came from Hazepace.

## What those services keep

Hazepace keeps nothing off your phone. The two services run their own
servers and keep their own logs:

- Open-Meteo's terms say its free service keeps web server logs that may
  include coordinates, and deletes them after 90 days. See
  [open-meteo.com/en/terms](https://open-meteo.com/en/terms).
- ECCC's servers are covered by the Government of Canada's privacy notice.
  See [canada.ca/en/transparency/privacy](https://www.canada.ca/en/transparency/privacy.html).

Neither service receives an account, a name, a device identifier or anything
that links a request to you, and Hazepace does not share data with anyone
for advertising or tracking.

## Your location

Hazepace asks for location access **only while the app is in use**, never in
the background. It reads a low-accuracy position, rounds it to about one
kilometre, and uses it only to fetch conditions.

You can decline, or later turn location off in iOS Settings → Hazepace →
Location. The app still works: you can choose a place by name instead, and
without either it shows conditions for a default town until you do.

## What stays on your phone

Your settings are saved on the phone so they are there next time you open
the app:

- the activities you do and your air quality sensitivity setting
- your rain, wind and heat limits
- your time format and appearance choice
- a place you chose by name, if any (its name, region and rounded
  coordinate)

Forecasts are held in memory for a short time to avoid repeat requests and
are gone when the app closes. None of this is sent anywhere. Choosing
**Use my location** clears a saved place; deleting the app removes
everything.

## Children

Hazepace is not directed at children and does not knowingly collect
information from anyone.

## Changes

If what the app sends or keeps changes, this page will be updated and the
date at the top will change. The history of this page is public in the
[repository](https://github.com/neptuak17/hazepace/commits/main/docs/privacy.md).

## Contact

Cliff Smith — clifford.smith@gmail.com
