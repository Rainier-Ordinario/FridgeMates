/**
 * Safety guardrails required by the organizers: the mascot and the food characters must never be vulgar.
 * Every prompt the app sends carries FAMILY_FRIENDLY_RULE.
 */
export const FAMILY_FRIENDLY_RULE =
  'Always family-friendly and kind. Never use profanity, slurs, sexual content, insults about people, or crude jokes. Playful teasing about food only.';

/** Prepends the rule to a prompt (or returns the rule alone for an empty prompt). */
export function withSafetyRule(prompt: string): string {
  const p = prompt.trim();
  return p ? `${FAMILY_FRIENDLY_RULE}\n\n${p}` : FAMILY_FRIENDLY_RULE;
}
