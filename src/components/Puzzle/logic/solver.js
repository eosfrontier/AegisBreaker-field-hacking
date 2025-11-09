// src/puzzles/logic/solver.js
import { parseStatement } from './parser';
import { evaluateAST } from './evaluator';

// rules: { exactSecurity?: number, minSecurity?: number }
function globalRulesPass(assignments, processes, rules) {
  const secCount = processes.reduce((acc, p) => acc + (assignments[p.name] === false ? 1 : 0), 0);
  if (rules?.exactSecurity != null && secCount !== rules.exactSecurity) return false;
  if (rules?.minSecurity != null && secCount < rules.minSecurity) return false;
  return true;
}

export function solveUnique(processes, statements, rules) {
  const names = processes.map((p) => p.name);
  const N = names.length;
  const parsed = statements.map((s) => ({ speaker: s.speaker, ast: parseStatement(s.text) }));

  const solutions = [];
  for (let mask = 0; mask < 1 << N; mask++) {
    const assign = {};
    for (let i = 0; i < N; i++) assign[names[i]] = !!(mask & (1 << i)); // true=Utility, false=Security

    if (!globalRulesPass(assign, processes, rules)) continue;

    // Speaker truthfulness must match role:
    let ok = true;
    for (const { speaker, ast } of parsed) {
      const truth = evaluateAST(ast, assign);
      const speakerIsUtility = assign[speaker] === true;
      if (speakerIsUtility && !truth) {
        ok = false;
        break;
      }
      if (!speakerIsUtility && truth) {
        ok = false;
        break;
      }
    }
    if (ok) {
      solutions.push(assign);
      if (solutions.length > 1) break; // no longer unique
    }
  }
  return solutions.length === 1 ? solutions[0] : null;
}
