// Explicit table instead of String#normalize('NFD'): same result on every JS engine.
const ACCENTS: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c',
};

/** Lowercase, strip accents, and turn anything that isn't a letter or digit into a space. */
export function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, (ch) => ACCENTS[ch])
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Query → normalized words; empty array means "no search" (e.g. only spaces or "¡!").
 * The matching itself runs in the API (`q` on /events), which normalizes the same way.
 */
export function searchTerms(query: string) {
  return normalizeText(query).split(' ').filter(Boolean);
}
