/**
 * How the app introduces itself to the services it calls.
 *
 * Every outbound request carries this so an operator at Open-Meteo or ECCC
 * who sees the traffic can follow the URL to the README, which says what
 * the app is, how it fetches, and how to reach its author. Neither service
 * requires a User-Agent; it is a courtesy that costs nothing.
 *
 * No imports, so the data modules that use it stay runnable under plain
 * Node. Keep the version in step with `version` in app.json.
 */
export const USER_AGENT = 'HazePace/1.0 (+https://github.com/neptuak17/hazepace)';
