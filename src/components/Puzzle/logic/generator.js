// src/puzzles/logic/generator.js
import { solveUnique } from './solver';

// Futuristic pool (no .exe)
const POOL = [
  'IonFlux_Mod',
  'ZetaCore_Subsystem',
  'SynapseMirror_Daemon',
  'GeoLight_Aux',
  'NovaPulse_Handler',
  'PsiGuard_Monitor',
  'AxonLink_Host',
  'TeraNode_Proxy',
  'SpectraDrift_Core',
  'ProtoShield_Layer',
  'ChronoWave_Driver',
  'NebulaTrack_Service',
  'HyperFrame_Module',
  'AetherBridge_Thread',
  'Darklight_Service',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickDistinct(list, k) {
  const pool = [...list];
  const out = [];
  while (out.length < k && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

// Simple statement templates (Utility/Security)
const directTemplates = [(X) => `${X} is a Utility process.`, (X) => `${X} is a Security process.`];
const conditionalTemplates = [
  (X, Y) => `If ${X} is Utility, then ${Y} is Security.`,
  (X, Y) => `If ${X} is Security, then ${Y} is Utility.`,
];
const comparisonTemplates = [
  (X, Y) => `Exactly one of ${X} or ${Y} is Security.`,
  (X, Y) => `Exactly one of ${X} or ${Y} is Utility.`,
];
const groupTemplates = [(A, B, C) => `Among ${A}, ${B}, and ${C}, exactly 2 are Utility.`];

export function generatePuzzleEnsuringUnique(difficulty) {
  const num = Math.min(5, Number(difficulty) + 1);
  const names = pickDistinct(POOL, num).map((name) => ({ name }));

  // Visible global rule for players (anchors deduction)
  const rules = difficulty <= 2 ? { exactSecurity: 1 } : difficulty <= 4 ? { exactSecurity: 2 } : { minSecurity: 1 };

  for (let attempt = 0; attempt < 250; attempt++) {
    const stmts = [];

    // Each speaker contributes 1–2 statements based on difficulty
    for (let i = 0; i < num; i++) {
      const speaker = names[i].name;
      const count = difficulty < 3 ? 1 : 2;

      for (let k = 0; k < count; k++) {
        const roll = Math.random();
        if (difficulty < 3 || roll < 0.45) {
          const [t] = pickDistinct(
            names.map((n) => n.name),
            1,
          );
          stmts.push({ speaker, text: pick(directTemplates)(t) });
        } else if (roll < 0.8 && num >= 2) {
          const [x, y] = pickDistinct(
            names.map((n) => n.name),
            2,
          );
          stmts.push({ speaker, text: pick(conditionalTemplates)(x, y) });
        } else if (num >= 2) {
          const [x, y] = pickDistinct(
            names.map((n) => n.name),
            2,
          );
          stmts.push({ speaker, text: pick(comparisonTemplates)(x, y) });
        }
      }
    }

    if (difficulty >= 4 && num >= 3) {
      const [a, b, c] = pickDistinct(
        names.map((n) => n.name),
        3,
      );
      stmts.push({ speaker: pick(names).name, text: pick(groupTemplates)(a, b, c) });
    }

    // Check for uniqueness and get the unique solution assignment if it exists
    const solution = solveUnique(names, stmts, rules);
    if (solution) {
      // Format for UI: attach speaker statements to processes
      const processes = names.map((n) => ({ name: n.name, responses: [] }));
      for (const s of stmts) {
        const p = processes.find((p) => p.name === s.speaker);
        p.responses.push(s.text);
      }
      return { processes, rules, solution };
    }
  }

  // Fallback (very unlikely): trivial direct claims that force a unique mapping
  const processes = names.map((n) => ({ name: n.name, responses: [`${n.name} is a Utility process.`] }));
  const solution = Object.fromEntries(names.map((n) => [n.name, true]));
  return { processes, rules, solution };
}
