// Tests de get_overlap. Lancer avec : npm test  (gratuit : aucun appel au modèle).
//
// Dates de changement d'heure utilisées (règles officielles) :
//   Chypre et UE : passage à l'heure d'hiver le 25/10/2026, à l'heure d'été le 28/03/2027.
//   États-Unis   : heure d'hiver le 01/11/2026, heure d'été le 14/03/2027.
//   Australie    : heure d'été (Sydney) le 04/10/2026, heure d'hiver le 04/04/2027.
// Plage d'Emeline : 06:30-21:00 à Chypre, minimum 2 h en commun. Équipe : 09:00-17:00 locales par défaut.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getOverlap, resolveTimeZone } from "../src/overlap.js";

const at = (date) => Date.parse(`${date}T10:00:00Z`);
const run = (city, date, extra = {}) => getOverlap({ city_or_timezone: city, ...extra }, at(date));

// [ville, date, décalage Chypre, décalage équipe, heures de chevauchement, fenêtre locale de l'équipe]
const CASES = [
  // Paris : même règle que Chypre, toujours 1 h d'écart -> journée entière.
  ["Paris", "2026-07-15", "UTC+03:00", "UTC+02:00", 8, "09:00-17:00"],
  ["Paris", "2026-10-28", "UTC+02:00", "UTC+01:00", 8, "09:00-17:00"],
  ["Paris", "2027-04-10", "UTC+03:00", "UTC+02:00", 8, "09:00-17:00"],
  // Londres : 2 h d'écart toute l'année.
  ["London", "2026-07-15", "UTC+03:00", "UTC+01:00", 8, "09:00-17:00"],
  ["Londres", "2026-12-15", "UTC+02:00", "UTC+00:00", 8, "09:00-17:00"],
  // New York : 7 h d'écart, sauf les semaines où l'Europe et les États-Unis ne changent pas le même jour (6 h).
  ["New York", "2026-07-15", "UTC+03:00", "UTC-04:00", 5, "09:00-14:00"],
  ["New York", "2026-10-28", "UTC+02:00", "UTC-04:00", 6, "09:00-15:00"],
  ["New York", "2026-12-15", "UTC+02:00", "UTC-05:00", 5, "09:00-14:00"],
  ["New York", "2027-03-20", "UTC+02:00", "UTC-04:00", 6, "09:00-15:00"],
  // San Francisco : 10 h d'écart (9 h pendant les semaines décalées) -> juste au minimum.
  ["San Francisco", "2026-07-15", "UTC+03:00", "UTC-07:00", 2, "09:00-11:00"],
  ["San Francisco", "2026-10-28", "UTC+02:00", "UTC-07:00", 3, "09:00-12:00"],
  ["San Francisco", "2026-12-15", "UTC+02:00", "UTC-08:00", 2, "09:00-11:00"],
  // Sydney : 7 h d'avance en juillet, 8 h après le 04/10, 9 h après le 25/10 (sous le minimum).
  ["Sydney", "2026-07-15", "UTC+03:00", "UTC+10:00", 3.5, "13:30-17:00"],
  ["Sydney", "2026-10-03", "UTC+03:00", "UTC+10:00", 3.5, "13:30-17:00"],
  ["Sydney", "2026-10-05", "UTC+03:00", "UTC+11:00", 2.5, "14:30-17:00"],
  ["Sydney", "2026-12-15", "UTC+02:00", "UTC+11:00", 1.5, "15:30-17:00"],
  ["Sydney", "2027-04-10", "UTC+03:00", "UTC+10:00", 3.5, "13:30-17:00"],
];

for (const [city, date, emelineOffset, teamOffset, hours, teamWindow] of CASES) {
  test(`${city} le ${date} : ${hours} h`, () => {
    const r = run(city, date);
    assert.equal(r.emeline.utc_offset, emelineOffset, "décalage de Chypre");
    assert.equal(r.team.utc_offset, teamOffset, "décalage de l'équipe");
    assert.equal(r.overlap_hours, hours);
    assert.equal(r.overlap ? r.overlap.team_time : null, teamWindow);
    assert.equal(r.meets_minimum, hours >= 2);
    assert.equal(r.team.default_hours_used, true);
  });
}

test("Cas vérifié à la main n°1 : New York, 15/07/2026", () => {
  // Chypre UTC+3, New York UTC-4 : 7 h d'écart. 06:30-21:00 Chypre = 23:30 (veille)-14:00 à New York.
  // Équipe 09:00-17:00 -> chevauchement 09:00-14:00 New York = 16:00-21:00 Chypre = 5 h.
  const r = run("New York", "2026-07-15");
  assert.deepEqual(r.overlap, { team_time: "09:00-14:00", emeline_time: "16:00-21:00" });
  assert.equal(r.overlap_hours, 5);
  assert.equal(r.meets_minimum, true);
});

test("Cas vérifié à la main n°2 : Sydney, 15/12/2026 (Chypre en hiver, Sydney en été)", () => {
  // Chypre UTC+2, Sydney UTC+11 : 9 h d'avance. 06:30-21:00 Chypre = 15:30-06:00 (lendemain) à Sydney.
  // Équipe 09:00-17:00 -> 15:30-17:00 Sydney = 06:30-08:00 Chypre = 1,5 h, sous le minimum de 2 h.
  const r = run("Sydney", "2026-12-15");
  assert.deepEqual(r.overlap, { team_time: "15:30-17:00", emeline_time: "06:30-08:00" });
  assert.equal(r.overlap_hours, 1.5);
  assert.equal(r.meets_minimum, false);
});

test("Horaires d'équipe personnalisés", () => {
  const r = run("New York", "2026-07-15", { local_start: "08:00", local_end: "18:00" });
  assert.equal(r.overlap.team_time, "08:00-14:00");
  assert.equal(r.overlap_hours, 6);
  assert.equal(r.team.default_hours_used, false);
});

test("Fuseau IANA accepté directement", () => {
  assert.equal(run("America/Chicago", "2026-07-15").team.timezone, "America/Chicago");
});

test("Accents, majuscules et pays précisé", () => {
  assert.equal(resolveTimeZone("Genève").timeZone, "Europe/Zurich");
  assert.equal(resolveTimeZone("MONTRÉAL").timeZone, "America/Toronto");
  assert.equal(resolveTimeZone("Lyon, France").timeZone, "Europe/Paris");
  assert.equal(resolveTimeZone("Portland, Oregon").timeZone, "America/Los_Angeles");
});

test("Lieu ambigu : l'agent doit redemander", () => {
  assert.match(run("Portland", "2026-07-15").error, /ambigu/);
  assert.match(run("États-Unis", "2026-07-15").error, /ambigu/);
});

test("Ville inconnue ou absente : erreur claire", () => {
  assert.match(run("Gotham", "2026-07-15").error, /inconnue/);
  assert.match(getOverlap({}, at("2026-07-15")).error, /manquante/);
});

test("Horaires invalides refusés", () => {
  assert.match(run("Paris", "2026-07-15", { local_start: "9h", local_end: "17:00" }).error, /invalides/);
  assert.match(run("Paris", "2026-07-15", { local_start: "18:00", local_end: "09:00" }).error, /invalides/);
});
