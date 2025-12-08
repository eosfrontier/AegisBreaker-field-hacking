// src/puzzles/logic/parser.js

// Accept names like IonFlux_Mod, ZetaCore_Subsystem, etc.
const NAME = '[A-Za-z0-9._-]+';
// Accept future-y role words
const ROLE = '(Trusted|Rogue|Utility|Security|Harmless|Hostile)';

export function parseStatement(statement) {
  const direct = new RegExp(`^(?<subject>${NAME}) is a (?<role>${ROLE}) process\\.$`);
  const cond = new RegExp(
    `^If (?<subject>${NAME}) is (?<subjectRole>${ROLE}), then (?<conclusion>${NAME}) is (?<conclusionRole>${ROLE})\\.$`,
  );
  const oneOf2 = new RegExp(`^Exactly one of (?<s1>${NAME}) or (?<s2>${NAME}) is (?<role>${ROLE})\\.$`);
  const among3 = new RegExp(
    `^Among (?<a>${NAME}), (?<b>${NAME}), and (?<c>${NAME}), exactly (?<count>\\d+) are (?<role>${ROLE})\\.$`,
  );

  let m;
  if ((m = statement.match(direct))) {
    return { type: 'direct', subject: m.groups.subject, role: m.groups.role };
  }
  if ((m = statement.match(cond))) {
    return {
      type: 'conditional',
      subject: m.groups.subject,
      subjectRole: m.groups.subjectRole,
      conclusion: m.groups.conclusion,
      conclusionRole: m.groups.conclusionRole,
    };
  }
  if ((m = statement.match(oneOf2))) {
    return {
      type: 'comparison',
      subjects: [m.groups.s1, m.groups.s2],
      role: m.groups.role,
      expectedCount: 1,
    };
  }
  if ((m = statement.match(among3))) {
    return {
      type: 'groupComparison',
      subjects: [m.groups.a, m.groups.b, m.groups.c],
      role: m.groups.role,
      expectedCount: parseInt(m.groups.count, 10),
    };
  }
  throw new Error('Statement pattern not recognized: ' + statement);
}
