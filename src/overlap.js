// Outil get_overlap : chevauchement entre la fenêtre de travail d'Emeline et les horaires d'une équipe.
// Tout passe par les fuseaux IANA et Intl.DateTimeFormat : aucun décalage écrit à la main,
// les changements d'heure sont donc gérés automatiquement pour la date du jour.

export const EMELINE = { timeZone: "Asia/Nicosia", start: "06:30", end: "21:00" };
export const MINIMUM_HOURS = 2;
const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

// Villes courantes -> fuseau IANA. Clés sans accents, en minuscules.
const CITIES = {
  // France
  paris: "Europe/Paris", lyon: "Europe/Paris", marseille: "Europe/Paris", bordeaux: "Europe/Paris",
  lille: "Europe/Paris", nantes: "Europe/Paris", toulouse: "Europe/Paris", rennes: "Europe/Paris",
  nice: "Europe/Paris", strasbourg: "Europe/Paris", montpellier: "Europe/Paris", grenoble: "Europe/Paris",
  france: "Europe/Paris",
  // Europe
  london: "Europe/London", londres: "Europe/London", manchester: "Europe/London", edinburgh: "Europe/London",
  edimbourg: "Europe/London", bristol: "Europe/London", uk: "Europe/London", "united kingdom": "Europe/London",
  "royaume-uni": "Europe/London", "royaume uni": "Europe/London", angleterre: "Europe/London", england: "Europe/London",
  dublin: "Europe/Dublin", ireland: "Europe/Dublin", irlande: "Europe/Dublin",
  berlin: "Europe/Berlin", munich: "Europe/Berlin", munchen: "Europe/Berlin", hamburg: "Europe/Berlin",
  hambourg: "Europe/Berlin", frankfurt: "Europe/Berlin", francfort: "Europe/Berlin", cologne: "Europe/Berlin",
  koln: "Europe/Berlin", germany: "Europe/Berlin", allemagne: "Europe/Berlin",
  amsterdam: "Europe/Amsterdam", rotterdam: "Europe/Amsterdam", "the hague": "Europe/Amsterdam", "la haye": "Europe/Amsterdam",
  netherlands: "Europe/Amsterdam", "pays-bas": "Europe/Amsterdam", "pays bas": "Europe/Amsterdam",
  brussels: "Europe/Brussels", bruxelles: "Europe/Brussels", antwerp: "Europe/Brussels", anvers: "Europe/Brussels",
  belgium: "Europe/Brussels", belgique: "Europe/Brussels", luxembourg: "Europe/Luxembourg",
  geneva: "Europe/Zurich", geneve: "Europe/Zurich", zurich: "Europe/Zurich", lausanne: "Europe/Zurich",
  bern: "Europe/Zurich", berne: "Europe/Zurich", basel: "Europe/Zurich", bale: "Europe/Zurich",
  switzerland: "Europe/Zurich", suisse: "Europe/Zurich",
  madrid: "Europe/Madrid", barcelona: "Europe/Madrid", barcelone: "Europe/Madrid", valencia: "Europe/Madrid",
  valence: "Europe/Madrid", seville: "Europe/Madrid", malaga: "Europe/Madrid", spain: "Europe/Madrid", espagne: "Europe/Madrid",
  lisbon: "Europe/Lisbon", lisbonne: "Europe/Lisbon", lisboa: "Europe/Lisbon", porto: "Europe/Lisbon", portugal: "Europe/Lisbon",
  rome: "Europe/Rome", roma: "Europe/Rome", milan: "Europe/Rome", milano: "Europe/Rome", turin: "Europe/Rome",
  naples: "Europe/Rome", italy: "Europe/Rome", italie: "Europe/Rome",
  vienna: "Europe/Vienna", vienne: "Europe/Vienna", wien: "Europe/Vienna", austria: "Europe/Vienna", autriche: "Europe/Vienna",
  prague: "Europe/Prague", warsaw: "Europe/Warsaw", varsovie: "Europe/Warsaw", krakow: "Europe/Warsaw", cracovie: "Europe/Warsaw",
  budapest: "Europe/Budapest", bucharest: "Europe/Bucharest", bucarest: "Europe/Bucharest", sofia: "Europe/Sofia",
  athens: "Europe/Athens", athenes: "Europe/Athens", thessaloniki: "Europe/Athens", greece: "Europe/Athens", grece: "Europe/Athens",
  copenhagen: "Europe/Copenhagen", copenhague: "Europe/Copenhagen", stockholm: "Europe/Stockholm",
  oslo: "Europe/Oslo", helsinki: "Europe/Helsinki", tallinn: "Europe/Tallinn", riga: "Europe/Riga", vilnius: "Europe/Vilnius",
  kyiv: "Europe/Kyiv", kiev: "Europe/Kyiv", istanbul: "Europe/Istanbul",
  // Chypre, Moyen-Orient, Afrique
  nicosia: "Asia/Nicosia", nicosie: "Asia/Nicosia", larnaca: "Asia/Nicosia", limassol: "Asia/Nicosia",
  paphos: "Asia/Nicosia", cyprus: "Asia/Nicosia", chypre: "Asia/Nicosia",
  "tel aviv": "Asia/Jerusalem", jerusalem: "Asia/Jerusalem", israel: "Asia/Jerusalem", beirut: "Asia/Beirut", beyrouth: "Asia/Beirut",
  dubai: "Asia/Dubai", "abu dhabi": "Asia/Dubai", uae: "Asia/Dubai", emirats: "Asia/Dubai", "emirats arabes unis": "Asia/Dubai",
  doha: "Asia/Qatar", riyadh: "Asia/Riyadh", riyad: "Asia/Riyadh",
  cairo: "Africa/Cairo", "le caire": "Africa/Cairo", casablanca: "Africa/Casablanca", rabat: "Africa/Casablanca",
  tunis: "Africa/Tunis", algiers: "Africa/Algiers", alger: "Africa/Algiers", lagos: "Africa/Lagos",
  nairobi: "Africa/Nairobi", johannesburg: "Africa/Johannesburg", "cape town": "Africa/Johannesburg", "le cap": "Africa/Johannesburg",
  // Asie
  mumbai: "Asia/Kolkata", bombay: "Asia/Kolkata", bangalore: "Asia/Kolkata", bengaluru: "Asia/Kolkata",
  delhi: "Asia/Kolkata", "new delhi": "Asia/Kolkata", chennai: "Asia/Kolkata", hyderabad: "Asia/Kolkata",
  pune: "Asia/Kolkata", india: "Asia/Kolkata", inde: "Asia/Kolkata", karachi: "Asia/Karachi",
  singapore: "Asia/Singapore", singapour: "Asia/Singapore", "hong kong": "Asia/Hong_Kong",
  shanghai: "Asia/Shanghai", beijing: "Asia/Shanghai", pekin: "Asia/Shanghai", shenzhen: "Asia/Shanghai",
  taipei: "Asia/Taipei", seoul: "Asia/Seoul", tokyo: "Asia/Tokyo", osaka: "Asia/Tokyo", japan: "Asia/Tokyo", japon: "Asia/Tokyo",
  bangkok: "Asia/Bangkok", jakarta: "Asia/Jakarta", "kuala lumpur": "Asia/Kuala_Lumpur", manila: "Asia/Manila",
  manille: "Asia/Manila", "ho chi minh": "Asia/Ho_Chi_Minh", "ho chi minh city": "Asia/Ho_Chi_Minh", hanoi: "Asia/Bangkok",
  // Océanie
  sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", canberra: "Australia/Sydney", brisbane: "Australia/Brisbane",
  perth: "Australia/Perth", adelaide: "Australia/Adelaide", auckland: "Pacific/Auckland", wellington: "Pacific/Auckland",
  "new zealand": "Pacific/Auckland", "nouvelle-zelande": "Pacific/Auckland", "nouvelle zelande": "Pacific/Auckland",
  // Amériques
  "new york": "America/New_York", nyc: "America/New_York", boston: "America/New_York", "washington dc": "America/New_York",
  "washington d c": "America/New_York", philadelphia: "America/New_York", philadelphie: "America/New_York",
  miami: "America/New_York", atlanta: "America/New_York", toronto: "America/Toronto", montreal: "America/Toronto",
  ottawa: "America/Toronto", quebec: "America/Toronto", chicago: "America/Chicago", austin: "America/Chicago",
  dallas: "America/Chicago", houston: "America/Chicago", minneapolis: "America/Chicago", denver: "America/Denver",
  "salt lake city": "America/Denver", calgary: "America/Edmonton", phoenix: "America/Phoenix",
  "los angeles": "America/Los_Angeles", la: "America/Los_Angeles", "san francisco": "America/Los_Angeles",
  sf: "America/Los_Angeles", "san jose": "America/Los_Angeles", "san diego": "America/Los_Angeles",
  seattle: "America/Los_Angeles", vancouver: "America/Vancouver", "portland oregon": "America/Los_Angeles",
  "portland or": "America/Los_Angeles", "portland maine": "America/New_York",
  "mexico city": "America/Mexico_City", mexico: "America/Mexico_City", "sao paulo": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo", "buenos aires": "America/Argentina/Buenos_Aires",
  santiago: "America/Santiago", bogota: "America/Bogota", lima: "America/Lima",
};

// Noms qui désignent plusieurs fuseaux : l'agent doit redemander.
const AMBIGUOUS = {
  portland: "Portland (Oregon) ou Portland (Maine)",
  washington: "Washington DC ou l'État de Washington (Seattle)",
  cambridge: "Cambridge (Royaume-Uni) ou Cambridge (Massachusetts)",
  birmingham: "Birmingham (Royaume-Uni) ou Birmingham (Alabama)",
  usa: "les États-Unis ont plusieurs fuseaux : demander la ville",
  "etats-unis": "les États-Unis ont plusieurs fuseaux : demander la ville",
  "etats unis": "les États-Unis ont plusieurs fuseaux : demander la ville",
  "united states": "les États-Unis ont plusieurs fuseaux : demander la ville",
  us: "les États-Unis ont plusieurs fuseaux : demander la ville",
  canada: "le Canada a plusieurs fuseaux : demander la ville",
  australia: "l'Australie a plusieurs fuseaux : demander la ville",
  australie: "l'Australie a plusieurs fuseaux : demander la ville",
  brazil: "le Brésil a plusieurs fuseaux : demander la ville",
  bresil: "le Brésil a plusieurs fuseaux : demander la ville",
};

const normalize = (s) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\./g, " ").replace(/[^a-z0-9/_ -]/g, " ").replace(/\s+/g, " ").trim();

function isIanaZone(name) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

// Ville ou fuseau -> { timeZone } ou { error }.
export function resolveTimeZone(input) {
  const raw = String(input || "").trim();
  if (!raw) return { error: "Ville manquante : demande au visiteur la ville de l'équipe." };
  if (raw.includes("/") && isIanaZone(raw)) return { timeZone: new Intl.DateTimeFormat("en-US", { timeZone: raw }).resolvedOptions().timeZone };
  const candidates = [normalize(raw), normalize(raw.split(",")[0])];
  for (const key of candidates) {
    if (CITIES[key]) return { timeZone: CITIES[key] };
    if (AMBIGUOUS[key]) return { error: `Lieu ambigu (${AMBIGUOUS[key]}) : demande au visiteur de préciser.` };
  }
  return {
    error: `Ville inconnue : « ${raw.slice(0, 60)} ». Demande au visiteur une grande ville proche ou un fuseau IANA (ex. Europe/Paris).`,
  };
}

// ---------- Calcul avec Intl ----------

function partsIn(timeZone, instant) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(instant)).map((x) => [x.type, Number(x.value)]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute };
}

// Décalage du fuseau par rapport à UTC à un instant donné, en minutes.
function offsetMinutes(timeZone, instant) {
  const p = partsIn(timeZone, instant);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return Math.round((asUtc - Math.floor(instant / 60000) * 60000) / 60000);
}

// Heure locale (date + HH:MM dans un fuseau) -> instant UTC.
function localToInstant(timeZone, y, m, d, hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let instant = guess - offsetMinutes(timeZone, guess) * 60000;
  const corrected = guess - offsetMinutes(timeZone, instant) * 60000;
  if (corrected !== instant) instant = corrected;
  return instant;
}

const pad = (n) => String(n).padStart(2, "0");
const clock = (timeZone, instant) => {
  const p = partsIn(timeZone, instant);
  return `${pad(p.h)}:${pad(p.min)}`;
};
const isoDate = (timeZone, instant) => {
  const p = partsIn(timeZone, instant);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
};
const utcOffset = (timeZone, instant) => {
  const off = offsetMinutes(timeZone, instant);
  const sign = off < 0 ? "-" : "+";
  return `UTC${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Entrée de l'outil -> résultat (objet JSON renvoyé au modèle). `now` sert aux tests.
export function getOverlap(input = {}, now = Date.now()) {
  const resolved = resolveTimeZone(input.city_or_timezone);
  if (resolved.error) return { error: resolved.error };
  const teamZone = resolved.timeZone;
  const start = input.local_start ? String(input.local_start).trim() : DEFAULT_START;
  const end = input.local_end ? String(input.local_end).trim() : DEFAULT_END;
  if (!HHMM.test(start) || !HHMM.test(end) || start >= end) {
    return { error: "Horaires invalides : local_start et local_end au format HH:MM, avec un début avant la fin." };
  }

  // Journée de référence : la date du jour à Chypre.
  const today = partsIn(EMELINE.timeZone, now);
  const emeStart = localToInstant(EMELINE.timeZone, today.y, today.m, today.d, EMELINE.start);
  const emeEnd = localToInstant(EMELINE.timeZone, today.y, today.m, today.d, EMELINE.end);

  // La journée de l'équipe peut tomber la veille ou le lendemain (fuseaux éloignés) : on garde le meilleur cas.
  let best = null;
  for (const shift of [-1, 0, 1]) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + shift));
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    const teamStart = localToInstant(teamZone, y, m, d, start);
    const teamEnd = localToInstant(teamZone, y, m, d, end);
    const from = Math.max(emeStart, teamStart);
    const to = Math.min(emeEnd, teamEnd);
    if (to > from && (!best || to - from > best.to - best.from)) best = { from, to };
  }

  const hours = best ? Math.round(((best.to - best.from) / 3600000) * 100) / 100 : 0;
  return {
    date: isoDate(EMELINE.timeZone, now),
    emeline: { timezone: EMELINE.timeZone, utc_offset: utcOffset(EMELINE.timeZone, emeStart), window: `${EMELINE.start}-${EMELINE.end}` },
    team: {
      timezone: teamZone,
      utc_offset: utcOffset(teamZone, emeStart),
      window: `${start}-${end}`,
      default_hours_used: !input.local_start && !input.local_end,
    },
    overlap: best
      ? {
          team_time: `${clock(teamZone, best.from)}-${clock(teamZone, best.to)}`,
          emeline_time: `${clock(EMELINE.timeZone, best.from)}-${clock(EMELINE.timeZone, best.to)}`,
        }
      : null,
    overlap_hours: hours,
    meets_minimum: hours >= MINIMUM_HOURS,
  };
}
