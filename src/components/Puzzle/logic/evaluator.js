// src/puzzles/logic/evaluator.js

const ROLE_TRUE_WORDS = ['Trusted', 'Utility', 'Harmless'];
const ROLE_FALSE_WORDS = ['Rogue', 'Security', 'Hostile'];

export function roleWordToBool(word) {
  if (ROLE_TRUE_WORDS.includes(word)) return true;
  if (ROLE_FALSE_WORDS.includes(word)) return false;
  throw new Error('Unknown role word: ' + word);
}

// assignments: { name: boolean }  true=Utility, false=Security
export function evaluateAST(ast, assignments) {
  const is = (name, roleWord) => assignments[name] === roleWordToBool(roleWord);

  switch (ast.type) {
    case 'direct':
      return is(ast.subject, ast.role);

    case 'conditional': {
      const condHolds = is(ast.subject, ast.subjectRole);
      if (!condHolds) return true; // material implication
      return is(ast.conclusion, ast.conclusionRole);
    }

    case 'comparison': {
      const want = roleWordToBool(ast.role);
      const cnt = ast.subjects.reduce((acc, s) => acc + (assignments[s] === want ? 1 : 0), 0);
      return cnt === ast.expectedCount;
    }

    case 'groupComparison': {
      const want = roleWordToBool(ast.role);
      const cnt = ast.subjects.reduce((acc, s) => acc + (assignments[s] === want ? 1 : 0), 0);
      return cnt === ast.expectedCount;
    }

    default:
      throw new Error('Unknown AST type: ' + ast.type);
  }
}
