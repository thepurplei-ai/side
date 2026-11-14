// Safety checks that run on the phone before anything is generated, published or commented.
//
// This is the first layer only. Before Side goes public, every prompt, upload and finished
// video must also pass a server-side moderation service (see docs/ROADMAP.md).
// Pure TypeScript: tested by `npm test`.

export interface ModerationResult {
  ok: boolean;
  /** Short, friendly reason to show the person when ok is false. */
  reason?: string;
}

const OK: ModerationResult = { ok: true };

type Rule = { re: RegExp; reason: string };

const minors = String.raw`\b(child|children|kid|kids|minor|minors|underage|teen|teens|boy|girl|baby|toddler|schoolgirl|schoolboy|\d{1,2}[- ]?(?:yo|year[- ]old))\b`;
const sexual = String.raw`\b(nude|naked|nsfw|porn\w*|sex|sexy|sexual|explicit|erotic|undress\w*|strip\w*|lingerie|topless|onlyfans)\b`;

/** Rules for everyone. */
const RULES: Rule[] = [
  { re: new RegExp(sexual, 'i'), reason: 'Sexual or nude content is not allowed on Side.' },
  {
    re: /\b(deepfake|face ?swap)\b.*\b(celebrity|president|politician|actor|actress|singer|famous)\b|\b(celebrity|famous person)\b.*\b(deepfake|face ?swap)\b/i,
    reason: "You can't put a real or famous person's face in a video without their permission.",
  },
  {
    re: /\b(behead\w*|gore|gory|dismember\w*|torture\w*|mutilat\w*|massacre|school shooting|mass shooting)\b/i,
    reason: 'Extreme violence or gore is not allowed.',
  },
  {
    re: /\b(suicide|self[- ]?harm|kill (my|your|him|her|them)sel(f|ves)|cut (my|your)sel(f|ves))\b/i,
    reason: 'Self-harm content is not allowed. If you are struggling, please talk to someone you trust or a local helpline.',
  },
  {
    re: /\b(nazi|kkk|white power|heil|genocide)\b/i,
    reason: 'Hateful or extremist content is not allowed.',
  },
  {
    re: /\b(bomb[- ]making|make a bomb|build a bomb|terroris[tm]\w*)\b/i,
    reason: 'Content about real-world attacks or weapons is not allowed.',
  },
];

/** Extra rules in Family Mode: stories must be gentle and suitable for children. */
const FAMILY_RULES: Rule[] = [
  {
    re: /\b(kill\w*|murder\w*|blood\w*|gun|guns|shoot\w*|knife|knives|stab\w*|dead|death|die|dies|war|weapon\w*|horror|scary|zombie\w*|monster attack|demon\w*|drunk|beer|wine|alcohol|drug\w*|smok\w*|kiss\w*|romance|romantic|dating|swear\w*)\b/i,
    reason: 'Family Mode stories must be gentle and suitable for children. Try a kinder version of the idea.',
  },
];

function run(text: string, rules: Rule[]): ModerationResult {
  for (const rule of rules) if (rule.re.test(text)) return { ok: false, reason: rule.reason };
  return OK;
}

/** Checks a prompt, title, caption or comment. */
export function checkText(text: string, opts: { familyMode?: boolean } = {}): ModerationResult {
  const t = text.normalize('NFKC');
  // Anything sexual that also mentions a child is always blocked, with the strongest wording.
  if (new RegExp(sexual, 'i').test(t) && new RegExp(minors, 'i').test(t)) {
    return { ok: false, reason: 'This is not allowed. Content that sexualises children is blocked and never generated.' };
  }
  const base = run(t, RULES);
  if (!base.ok) return base;
  if (opts.familyMode) return run(t, FAMILY_RULES);
  return OK;
}

/** Checks a comment. Also blocks links and very long spam. */
export function checkComment(text: string): ModerationResult {
  const t = text.trim();
  if (!t) return { ok: false, reason: 'Write something first.' };
  if (t.length > 300) return { ok: false, reason: 'Comments can be up to 300 characters.' };
  if (/https?:\/\/|www\.|\.com\b/i.test(t)) return { ok: false, reason: 'Links are not allowed in comments.' };
  if (/\b(idiot|stupid|ugly|loser|kys|retard\w*|f+u+c+k+ (you|u)|stfu)\b/i.test(t)) {
    return { ok: false, reason: 'Please keep comments kind.' };
  }
  return checkText(t);
}
