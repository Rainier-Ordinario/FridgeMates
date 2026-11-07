/**
 * Safety guardrails required by the organizers: the mascot and the food characters must never be vulgar.
 * Every prompt the app sends carries FAMILY_FRIENDLY_RULE.
 */
export const FAMILY_FRIENDLY_RULE =
  'Always family-friendly and kind. Never use profanity, slurs, sexual content, insults about people, or crude jokes. Playful teasing about food only.';

/** Teasing is part of the fun, but only ever aimed at the food. */
export const TEASE_FOOD_ONLY = 'Tease the food, never the person.';

/** Prepends the rule to a prompt (or returns the rule alone for an empty prompt). */
export function withSafetyRule(prompt: string): string {
  const p = prompt.trim();
  const rule = `${FAMILY_FRIENDLY_RULE} ${TEASE_FOOD_ONLY}`;
  return p ? `${rule}\n\n${p}` : rule;
}

// ---- Local blocklist (input and output). Whole-word matching after normalizing disguises. ----
const BLOCKED_WORDS = [
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'bullshit',
  'shitty',
  'bitch',
  'bitches',
  'asshole',
  'ass',
  'bastard',
  'dick',
  'dicks',
  'cock',
  'cocks',
  'pussy',
  'cunt',
  'piss',
  'slut',
  'whore',
  'twat',
  'wank',
  'wanker',
  'prick',
  'bollocks',
  'jackass',
  'dumbass',
  'douche',
  'douchebag',
  'sex',
  'sexy',
  'sexual',
  'porn',
  'porno',
  'nude',
  'nudes',
  'naked',
  'boobs',
  'tits',
  'penis',
  'vagina',
  'orgasm',
  'horny',
  'blowjob',
  'handjob',
  'dildo',
  'cum',
  'milf',
  'hentai',
  'xxx',
  'nsfw',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'retarded',
  'tranny',
  'chink',
  'spic',
  'kike',
  'wetback',
];
const BLOCKED_PHRASES = ['kill yourself', 'kys', 'go die'];
const blocked = new Set(BLOCKED_WORDS);

const SUBS: Record<string, string> = {
  '@': 'a',
  $: 's',
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '|': 'l',
};

function normalizeToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split('')
    .map((ch) => SUBS[ch] ?? ch)
    .join('');
}

/** Matches one normalized token (letters and '*' wildcards) against the blocklist. */
function tokenBlocked(token: string): boolean {
  if (!token) return false;
  const variants = new Set([token, token.replace(/(.)\1{2,}/g, '$1$1'), token.replace(/(.)\1+/g, '$1')]);
  for (const v of variants) {
    if (v.includes('*')) {
      const re = new RegExp(`^${v.replace(/[^a-z*]/g, '').replace(/\*/g, '.')}$`);
      if (BLOCKED_WORDS.some((w) => re.test(w))) return true;
    } else if (blocked.has(v)) {
      return true;
    }
  }
  return false;
}

/** True when the text contains profanity, slurs or sexual terms, including simple disguises (f.u.c.k, fuuuck, $hit, f*ck). */
export function isBlocked(text: string): boolean {
  const normalized = normalizeToken(text);
  if (BLOCKED_PHRASES.some((p) => normalized.includes(p))) return true;
  // Join letters that were split with dots/dashes/spaces: "f.u.c.k", "f u c k".
  const joined = normalized.replace(/\b([a-z*])(?:[.\-_ ]+([a-z*]))+\b/g, (m) => m.replace(/[.\-_ ]/g, ''));
  const tokens = joined.split(/[^a-z*]+/).filter(Boolean);
  return tokens.some(tokenBlocked);
}

/** Returns `fallback` when `text` fails the blocklist; the original is never shown. */
export function safeText(text: string, fallback: string): string {
  return isBlocked(text) ? fallback : text;
}

export const FRIDGE_FRIENDLY_LINE = "Let's keep it fridge-friendly! Try one of these:";
