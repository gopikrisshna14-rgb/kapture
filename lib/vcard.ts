// Parses vCard (2.1/3.0/4.0) and MECARD payloads from digital business card QR codes.

export interface ContactFields {
  full_name: string | null;
  role_title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  linkedin_url: string | null;
}

const blank = (): ContactFields => ({
  full_name: null,
  role_title: null,
  company: null,
  email: null,
  phone: null,
  website: null,
  location: null,
  linkedin_url: null,
});

export const isVCard = (s: string) => /^\s*BEGIN:VCARD/i.test(s);
export const isMeCard = (s: string) => /^\s*MECARD:/i.test(s);

function unescapeV(s: string) {
  return s.replace(/\\n/gi, " ").replace(/\\([,;:\\])/g, "$1").trim();
}

function decodeQP(s: string) {
  return s
    .replace(/=\r?\n/g, "")
    .replace(/(=[0-9A-F]{2})+/gi, (m) => {
      try {
        return decodeURIComponent(m.replace(/=/g, "%"));
      } catch {
        return m;
      }
    });
}

export function parseVCard(text: string): ContactFields {
  const out = blank();
  // Unfold continuation lines (RFC 6350 §3.2)
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  let n: string | null = null;
  const urls: string[] = [];
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const head = line.slice(0, idx);
    let value = line.slice(idx + 1);
    const [nameRaw, ...params] = head.split(";");
    const name = nameRaw.replace(/^item\d+\./i, "").toUpperCase();
    if (params.some((p) => /QUOTED-PRINTABLE/i.test(p))) value = decodeQP(value);
    value = value.trim();
    if (!value) continue;
    switch (name) {
      case "FN":
        out.full_name ??= unescapeV(value);
        break;
      case "N": {
        const [family, given, middle] = value.split(";").map(unescapeV);
        n = [given, middle, family].filter(Boolean).join(" ") || null;
        break;
      }
      case "TITLE":
        out.role_title ??= unescapeV(value);
        break;
      case "ORG":
        out.company ??= unescapeV(value.split(";")[0]);
        break;
      case "EMAIL":
        out.email ??= unescapeV(value).replace(/^mailto:/i, "");
        break;
      case "TEL":
        out.phone ??= unescapeV(value).replace(/^tel:/i, "");
        break;
      case "URL":
        urls.push(unescapeV(value));
        break;
      case "X-SOCIALPROFILE":
        urls.push(unescapeV(value));
        break;
      case "ADR": {
        // PO;ext;street;locality;region;postal;country
        const parts = value.split(";").map(unescapeV);
        const city = parts[3] || null;
        const country = parts[6] || null;
        out.location ??= [city, country].filter(Boolean).join(", ") || null;
        break;
      }
    }
  }
  out.full_name ??= n;
  assignUrls(out, urls);
  return out;
}

export function parseMeCard(text: string): ContactFields {
  const out = blank();
  const body = text.replace(/^\s*MECARD:/i, "");
  const fields: [string, string][] = [];
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\" && i + 1 < body.length) {
      cur += body[++i];
      continue;
    }
    if (c === ";") {
      const k = cur.indexOf(":");
      if (k > 0) fields.push([cur.slice(0, k).toUpperCase(), cur.slice(k + 1).trim()]);
      cur = "";
      continue;
    }
    cur += c;
  }
  const urls: string[] = [];
  for (const [k, v] of fields) {
    if (!v) continue;
    if (k === "N") {
      const [a, b] = v.split(",").map((x) => x.trim());
      out.full_name ??= b ? `${b} ${a}` : a;
    } else if (k === "EMAIL") out.email ??= v;
    else if (k === "TEL") out.phone ??= v;
    else if (k === "URL") urls.push(v);
    else if (k === "ORG") out.company ??= v;
    else if (k === "TITLE") out.role_title ??= v;
    else if (k === "ADR") out.location ??= v;
  }
  assignUrls(out, urls);
  return out;
}

function assignUrls(out: ContactFields, urls: string[]) {
  for (const u of urls) {
    if (/linkedin\.com\/(?:mwlite\/)?in\//i.test(u)) {
      out.linkedin_url ??= u.startsWith("http") ? u : `https://${u}`;
    } else {
      out.website ??= u;
    }
  }
}

export function parseContactPayload(text: string): ContactFields | null {
  if (isVCard(text)) return parseVCard(text);
  if (isMeCard(text)) return parseMeCard(text);
  return null;
}
