import type { NormalizedProfile } from "../types";

// Demo profiles. Some are deliberately thin so the UI shows empty sections instead of invented ones.
export const FIXTURE_PROFILES: Record<string, NormalizedProfile> = {
  "lena-hoffmann-demo": {
    name: "Lena Hoffmann",
    headline: "Head of Procurement at Brandt Logistik | Warehouse automation",
    about:
      "I run procurement for Brandt Logistik's 14 warehouses across DACH. Currently focused on automating intralogistics and cutting energy use per pallet.",
    location: "Stuttgart, Germany",
    company: "Brandt Logistik GmbH",
    role: "Head of Procurement",
    experience: [
      { title: "Head of Procurement", company: "Brandt Logistik GmbH", start: "2021", location: "Stuttgart" },
      { title: "Senior Buyer, Intralogistics", company: "Kardex", start: "2016", end: "2021" },
    ],
    education: [{ school: "Universität Mannheim", degree: "M.Sc.", field: "Business Administration" }],
    skills: ["Strategic sourcing", "Warehouse automation", "Supplier negotiation"],
    recentPosts: [
      {
        text: "Three things we learned rolling out autonomous mobile robots in our Ludwigsburg site: start with one aisle, measure travel time, involve the night shift early.",
        url: "https://www.linkedin.com/feed/update/urn:li:activity:demo1",
        date: "2026-09-28",
      },
    ],
    followers: 2140,
    connections: 500,
  },
  "jonas-weber-demo": {
    name: "Jonas Weber",
    headline: "Founder & CEO at Palletly",
    location: "Berlin, Germany",
    company: "Palletly",
    role: "Founder & CEO",
    experience: [{ title: "Founder & CEO", company: "Palletly", start: "2023" }],
    // No about, no skills, no posts: the brief must stay short.
  },
  "amira-schulz-demo": {
    name: "Amira Schulz",
    headline: "Talent Partner, Engineering | Siemens Healthineers",
    about: "Hiring platform and embedded engineers in Erlangen and Munich.",
    location: "Erlangen, Germany",
    company: "Siemens Healthineers",
    role: "Talent Partner",
    experience: [
      { title: "Talent Partner", company: "Siemens Healthineers", start: "2022" },
      { title: "Technical Recruiter", company: "Personio", start: "2019", end: "2022" },
    ],
    skills: ["Technical recruiting", "Employer branding"],
    recentPosts: [
      { text: "We're hiring 12 embedded engineers in Erlangen this quarter. Remote-friendly within Germany.", date: "2026-10-02" },
    ],
  },
  "marco-rossi-demo": {
    name: "Marco Rossi",
    // Only a name and a location: the thinnest real-world case.
    location: "Munich, Germany",
  },
};

/** Unknown slugs in demo mode rotate through this pool (deterministic by slug). */
export const POOL = ["lena-hoffmann-demo", "jonas-weber-demo", "amira-schulz-demo"];

export const FIXTURE_CARDS = [
  {
    name: "Lena Hoffmann",
    title: "Head of Procurement",
    company: "Brandt Logistik GmbH",
    email: "l.hoffmann@brandt-logistik.example",
    phone: "+49 711 555 0142",
    website: "brandt-logistik.example",
    city: "Stuttgart",
  },
  {
    name: "Tobias Krämer",
    title: "Key Account Manager",
    company: "Fördertechnik Süd AG",
    email: "t.kraemer@foerdertechnik-sued.example",
    phone: null,
    website: null,
    city: null,
  },
];
