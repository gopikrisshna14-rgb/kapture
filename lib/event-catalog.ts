// Major trade fairs in Germany for the event search. Names, cities and venues only:
// dates change every edition, so the user picks the date. Add fairs here as needed.

export interface Fair {
  name: string;
  city: string;
  venue: string;
  industry: string;
  aliases?: string[];
}

export const FAIRS: Fair[] = [
  // Berlin
  { name: "IFA", city: "Berlin", venue: "Messe Berlin", industry: "Consumer electronics" },
  { name: "ITB Berlin", city: "Berlin", venue: "Messe Berlin", industry: "Travel and tourism" },
  { name: "InnoTrans", city: "Berlin", venue: "Messe Berlin", industry: "Rail and transport technology" },
  { name: "Fruit Logistica", city: "Berlin", venue: "Messe Berlin", industry: "Fresh produce" },
  { name: "Internationale Grüne Woche", city: "Berlin", venue: "Messe Berlin", industry: "Food and agriculture", aliases: ["Green Week", "Gruene Woche"] },
  // Cologne
  { name: "gamescom", city: "Cologne", venue: "Koelnmesse", industry: "Games" },
  { name: "Anuga", city: "Cologne", venue: "Koelnmesse", industry: "Food and beverage" },
  { name: "DMEXCO", city: "Cologne", venue: "Koelnmesse", industry: "Digital marketing" },
  { name: "ISM", city: "Cologne", venue: "Koelnmesse", industry: "Sweets and snacks" },
  { name: "imm cologne", city: "Cologne", venue: "Koelnmesse", industry: "Furniture and interiors" },
  { name: "IDS", city: "Cologne", venue: "Koelnmesse", industry: "Dental", aliases: ["International Dental Show"] },
  { name: "FIBO", city: "Cologne", venue: "Koelnmesse", industry: "Fitness and health" },
  // Düsseldorf
  { name: "MEDICA", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Medical technology" },
  { name: "COMPAMED", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Medical supply chain" },
  { name: "drupa", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Printing" },
  { name: "interpack", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Packaging and processing" },
  { name: "K", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Plastics and rubber", aliases: ["K Messe", "K-Messe"] },
  { name: "ProWein", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Wine and spirits" },
  { name: "boot Düsseldorf", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Boats and water sports" },
  { name: "EuroShop", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Retail" },
  { name: "A+A", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Safety and health at work" },
  { name: "wire", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Wire and cable" },
  { name: "Tube", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Tubes and pipes" },
  { name: "glasstec", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Glass" },
  { name: "METAV", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Metalworking" },
  { name: "Caravan Salon", city: "Düsseldorf", venue: "Messe Düsseldorf", industry: "Caravans and motorhomes" },
  // Frankfurt
  { name: "Automechanika", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Automotive aftermarket" },
  { name: "Light + Building", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Lighting and building technology", aliases: ["Light and Building"] },
  { name: "ISH", city: "Frankfurt", venue: "Messe Frankfurt", industry: "HVAC and water" },
  { name: "Ambiente", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Consumer goods" },
  { name: "ACHEMA", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Process industry" },
  { name: "Formnext", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Additive manufacturing" },
  { name: "Frankfurter Buchmesse", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Publishing", aliases: ["Frankfurt Book Fair"] },
  { name: "Texprocess", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Textile processing" },
  { name: "Techtextil", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Technical textiles" },
  { name: "Heimtextil", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Home textiles" },
  { name: "Musikmesse", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Music" },
  // Hamburg
  { name: "SMM", city: "Hamburg", venue: "Hamburg Messe", industry: "Maritime" },
  { name: "INTERNORGA", city: "Hamburg", venue: "Hamburg Messe", industry: "Hospitality and food service" },
  { name: "OMR Festival", city: "Hamburg", venue: "Hamburg Messe", industry: "Digital marketing", aliases: ["OMR"] },
  { name: "WindEnergy Hamburg", city: "Hamburg", venue: "Hamburg Messe", industry: "Wind energy" },
  // Hannover
  { name: "HANNOVER MESSE", city: "Hannover", venue: "Deutsche Messe", industry: "Industrial technology", aliases: ["Hannover Fair", "Hanover Fair"] },
  { name: "Agritechnica", city: "Hannover", venue: "Deutsche Messe", industry: "Agricultural machinery" },
  { name: "EuroTier", city: "Hannover", venue: "Deutsche Messe", industry: "Livestock" },
  { name: "EMO Hannover", city: "Hannover", venue: "Deutsche Messe", industry: "Metalworking" },
  { name: "IAA Transportation", city: "Hannover", venue: "Deutsche Messe", industry: "Commercial vehicles and logistics" },
  { name: "LIGNA", city: "Hannover", venue: "Deutsche Messe", industry: "Woodworking" },
  { name: "DOMOTEX", city: "Hannover", venue: "Deutsche Messe", industry: "Floor coverings" },
  { name: "CeMAT", city: "Hannover", venue: "Deutsche Messe", industry: "Intralogistics" },
  // Munich
  { name: "bauma", city: "Munich", venue: "Messe München", industry: "Construction machinery" },
  { name: "BAU", city: "Munich", venue: "Messe München", industry: "Architecture and building materials" },
  { name: "electronica", city: "Munich", venue: "Messe München", industry: "Electronics" },
  { name: "productronica", city: "Munich", venue: "Messe München", industry: "Electronics manufacturing" },
  { name: "automatica", city: "Munich", venue: "Messe München", industry: "Robotics and automation" },
  { name: "transport logistic", city: "Munich", venue: "Messe München", industry: "Logistics and supply chain" },
  { name: "The smarter E Europe", city: "Munich", venue: "Messe München", industry: "Solar and energy storage", aliases: ["Intersolar Europe", "ees Europe"] },
  { name: "ISPO Munich", city: "Munich", venue: "Messe München", industry: "Sports business" },
  { name: "EXPO REAL", city: "Munich", venue: "Messe München", industry: "Real estate" },
  { name: "analytica", city: "Munich", venue: "Messe München", industry: "Laboratory and analytics" },
  { name: "LASER World of PHOTONICS", city: "Munich", venue: "Messe München", industry: "Photonics" },
  { name: "IAA Mobility", city: "Munich", venue: "Messe München", industry: "Mobility" },
  { name: "drinktec", city: "Munich", venue: "Messe München", industry: "Beverage and liquid food" },
  { name: "IFAT", city: "Munich", venue: "Messe München", industry: "Water, sewage and waste" },
  // Nuremberg
  { name: "embedded world", city: "Nuremberg", venue: "NürnbergMesse", industry: "Embedded systems" },
  { name: "SPS", city: "Nuremberg", venue: "NürnbergMesse", industry: "Industrial automation", aliases: ["SPS smart production solutions"] },
  { name: "it-sa", city: "Nuremberg", venue: "NürnbergMesse", industry: "IT security", aliases: ["itsa"] },
  { name: "FACHPACK", city: "Nuremberg", venue: "NürnbergMesse", industry: "Packaging" },
  { name: "BIOFACH", city: "Nuremberg", venue: "NürnbergMesse", industry: "Organic food" },
  { name: "Spielwarenmesse", city: "Nuremberg", venue: "NürnbergMesse", industry: "Toys", aliases: ["Toy Fair"] },
  { name: "Enforce Tac", city: "Nuremberg", venue: "NürnbergMesse", industry: "Security and defence" },
  // Stuttgart
  { name: "LogiMAT", city: "Stuttgart", venue: "Messe Stuttgart", industry: "Intralogistics" },
  { name: "Motek", city: "Stuttgart", venue: "Messe Stuttgart", industry: "Assembly and handling" },
  { name: "AMB", city: "Stuttgart", venue: "Messe Stuttgart", industry: "Metalworking" },
  { name: "CMT", city: "Stuttgart", venue: "Messe Stuttgart", industry: "Travel and leisure" },
  { name: "intergeo", city: "Stuttgart", venue: "Messe Stuttgart", industry: "Geodesy and geoinformation" },
  { name: "Control", city: "Stuttgart", venue: "Messe Stuttgart", industry: "Quality assurance" },
  // Essen, Leipzig, Karlsruhe, Friedrichshafen
  { name: "E-world energy & water", city: "Essen", venue: "Messe Essen", industry: "Energy", aliases: ["E-world"] },
  { name: "SPIEL Essen", city: "Essen", venue: "Messe Essen", industry: "Board games" },
  { name: "Security Essen", city: "Essen", venue: "Messe Essen", industry: "Security" },
  { name: "Leipziger Buchmesse", city: "Leipzig", venue: "Leipziger Messe", industry: "Publishing", aliases: ["Leipzig Book Fair"] },
  { name: "LEARNTEC", city: "Karlsruhe", venue: "Messe Karlsruhe", industry: "Digital learning" },
  { name: "Eurobike", city: "Frankfurt", venue: "Messe Frankfurt", industry: "Bicycles" },
  { name: "AERO Friedrichshafen", city: "Friedrichshafen", venue: "Messe Friedrichshafen", industry: "General aviation" },
];

export const fold = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9+]+/g, " ").trim();

/** Ranked search: name prefix > word prefix in name/alias > anywhere in name/alias/city/industry. */
export function searchFairs(q: string, limit = 8): Fair[] {
  const f = fold(q);
  if (!f) return [];
  const scored: [number, Fair][] = [];
  for (const fair of FAIRS) {
    const names = [fair.name, ...(fair.aliases ?? [])].map(fold);
    const other = [fair.city, fair.industry, fair.venue].map(fold);
    let score = 0;
    if (names.some((n) => n === f)) score = 100;
    else if (names.some((n) => n.startsWith(f))) score = 80;
    else if (names.some((n) => n.split(" ").some((w) => w.startsWith(f)))) score = 60;
    else if (names.some((n) => n.includes(f))) score = 40;
    else if (other.some((o) => o.split(" ").some((w) => w.startsWith(f)))) score = 20;
    if (score) scored.push([score, fair]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map(([, x]) => x);
}
