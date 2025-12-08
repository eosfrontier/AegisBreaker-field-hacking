// ----- Parser & Evaluator -----

// A simple parser for four statement formats:
// 1) "A is a Harmless module."
// 2) "If A is Harmless, then B is Hostile."
// 3) "Exactly one of A or B is Hostile."
// 4) "Among A, B, and C, exactly 2 are Harmless."

const PROCESS_NAME_CANDIDATES = [
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

function shuffleArray(array) {
  // In-place shuffle of the array using Fisher-Yates
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickProcessNames(count) {
  // Clone and shuffle the candidates
  const shuffled = shuffleArray([...PROCESS_NAME_CANDIDATES]);
  // Return the top `count` names
  return shuffled.slice(0, count);
}

function parseStatement(statement) {
  // Accept names with letters/digits/underscore/dot/dash
  const directRegex = /^(?<subject>[A-Za-z0-9._-]+) is a (?<role>Harmless|Hostile) module\.$/;
  const conditionalRegex =
    /^If (?<subject>[A-Za-z0-9._-]+) is (?<subjectRole>Harmless|Hostile), then (?<conclusion>[A-Za-z0-9._-]+) is (?<conclusionRole>Harmless|Hostile)\.$/;
  const comparisonRegex =
    /^Exactly one of (?<subject1>[A-Za-z0-9._-]+) or (?<subject2>[A-Za-z0-9._-]+) is (?<role>Harmless|Hostile)\.$/;
  const groupComparisonRegex =
    /^Among (?<subject1>[A-Za-z0-9._-]+), (?<subject2>[A-Za-z0-9._-]+), and (?<subject3>[A-Za-z0-9._-]+), exactly (?<count>\d+) are (?<role>Harmless|Hostile)\.$/;

  let match = statement.match(directRegex);
  if (match) {
    return {
      type: 'direct',
      subject: match.groups.subject,
      role: match.groups.role,
    };
  }

  match = statement.match(conditionalRegex);
  if (match) {
    return {
      type: 'conditional',
      subject: match.groups.subject,
      subjectRole: match.groups.subjectRole,
      conclusion: match.groups.conclusion,
      conclusionRole: match.groups.conclusionRole,
    };
  }

  match = statement.match(comparisonRegex);
  if (match) {
    return {
      type: 'comparison',
      subjects: [match.groups.subject1, match.groups.subject2],
      role: match.groups.role,
      expectedCount: 1,
    };
  }

  match = statement.match(groupComparisonRegex);
  if (match) {
    return {
      type: 'groupComparison',
      subjects: [match.groups.subject1, match.groups.subject2, match.groups.subject3],
      role: match.groups.role,
      expectedCount: parseInt(match.groups.count, 10),
    };
  }

  throw new Error('Statement pattern not recognized: ' + statement);
}

/**
 * Evaluate the parsed AST against the puzzle assignments:
 *  - assignments is an object, e.g. { A: true, B: false } meaning A=Harmless, B=Hostile
 */
function evaluateAST(ast, assignments) {
  switch (ast.type) {
    case 'direct': {
      // "A is a Harmless module."
      const actual = assignments[ast.subject] ? 'Harmless' : 'Hostile';
      return actual === ast.role;
    }
    case 'conditional': {
      // "If A is Harmless, then B is Hostile."
      const subjectActual = assignments[ast.subject] ? 'Harmless' : 'Hostile';
      if (subjectActual === ast.subjectRole) {
        // condition is true => check conclusion
        const conclusionActual = assignments[ast.conclusion] ? 'Harmless' : 'Hostile';
        return conclusionActual === ast.conclusionRole;
      }
      // condition is false => statement is vacuously true
      return true;
    }
    case 'comparison': {
      // "Exactly one of A or B is Hostile."
      const count = ast.subjects.reduce((acc, subj) => {
        const actual = assignments[subj] ? 'Harmless' : 'Hostile';
        return acc + (actual === ast.role ? 1 : 0);
      }, 0);
      return count === ast.expectedCount;
    }
    case 'groupComparison': {
      // "Among A, B, and C, exactly 2 are Harmless."
      const count = ast.subjects.reduce((acc, subj) => {
        const actual = assignments[subj] ? 'Harmless' : 'Hostile';
        return acc + (actual === ast.role ? 1 : 0);
      }, 0);
      return count === ast.expectedCount;
    }
    default:
      throw new Error('Unknown AST type: ' + ast.type);
  }
}

// ---- Statement Generation Templates ----

// For variety, let's define a few candidate statement strings
// We include tokens like {{X}} which we'll replace with real module labels.
const directTemplates = ['{{X}} is a Harmless module.', '{{X}} is a Hostile module.'];

const conditionalTemplates = [
  'If {{X}} is Harmless, then {{Y}} is Hostile.',
  'If {{X}} is Hostile, then {{Y}} is Harmless.',
];

const comparisonTemplates = ['Exactly one of {{X}} or {{Y}} is Hostile.', 'Exactly one of {{X}} or {{Y}} is Harmless.'];

const groupComparisonTemplates = [
  'Among {{X}}, {{Y}}, and {{Z}}, exactly 2 are Harmless.',
  'Among {{X}}, {{Y}}, and {{Z}}, exactly 1 are Hostile.',
];

/**
 * Build a random statement at the given difficulty:
 * - difficulty < 3 => mostly direct statements
 * - 3 => includes conditional
 * - 4 => includes comparison
 * - 5 => includes group comparison
 */
function buildRandomStatement(difficulty, allProcesses) {
  // 1) Choose a template pool based on difficulty
  let possiblePools = [directTemplates]; // always include direct
  if (difficulty >= 3) {
    possiblePools.push(conditionalTemplates);
  }
  if (difficulty >= 4) {
    possiblePools.push(comparisonTemplates);
  }
  if (difficulty >= 5) {
    possiblePools.push(groupComparisonTemplates);
  }
  // Flatten the array
  const combined = possiblePools.flat();

  // 2) Pick one random template from combined
  const template = combined[Math.floor(Math.random() * combined.length)];

  // 3) Figure out how many placeholders we need
  //    e.g. direct statements need 1 module, conditional/comparison might need 2 or 3.
  const placeholders = template.match(/\{\{[XYZ]\}\}/g) || [];
  const uniqueNeeded = new Set(placeholders.map((ph) => ph.slice(2, 3))); // 'X', 'Y', 'Z'

  // 4) Pick that many distinct processes from allProcesses
  const chosen = [];
  while (chosen.length < uniqueNeeded.size) {
    const randIndex = Math.floor(Math.random() * allProcesses.length);
    if (!chosen.includes(allProcesses[randIndex])) {
      chosen.push(allProcesses[randIndex]);
    }
  }

  // 5) Build final statement by replacing placeholders
  //    e.g. if placeholders are {{X}}, {{Y}}, assign them to chosen[0], chosen[1]
  let filled = template;
  const labelMap = {};
  // Sort the placeholders in alphabetical order (X, then Y, then Z)
  const sortedPH = Array.from(uniqueNeeded).sort();
  sortedPH.forEach((letter, idx) => {
    const processLabel = chosen[idx].name; // e.g. 'A', 'B'
    labelMap[letter] = processLabel;
    filled = filled.replaceAll(`{{${letter}}}`, processLabel);
  });

  return filled;
}

/** Utility to build a map of { 'A': true, 'B': false, ... } */
function convertProcessArrayToAssignments(processes) {
  const map = {};
  processes.forEach((p) => {
    map[p.name] = p.isHarmless;
  });
  return map;
}

function generateIntegrityPuzzle(difficulty) {
  const diff = Number(difficulty);
  // 1) Decide how many processes
  const numProcs = Math.min(5, diff + 1);
  console.log(numProcs);

  const chosenNames = pickProcessNames(numProcs);

  // 2) Assign each module: true = Harmless, false = Hostile
  const assignment = Array.from({ length: numProcs }, () => Math.random() < 0.5);

  // 3) Build the module array
  const processes = chosenNames.map((procName, index) => ({
    name: procName,
    isHarmless: assignment[index], // boolean: true=Harmless, false=Hostile
    responses: [],
  }));

  // 4) For each module, generate statements
  const statementsCount = difficulty < 3 ? 1 : 2;

  for (let i = 0; i < numProcs; i++) {
    const speakerIsHarmless = processes[i].isHarmless;
    const responses = [];

    for (let s = 0; s < statementsCount; s++) {
      let finalStatement = null;
      let maxTries = 20; // to avoid infinite loops in worst-case scenario

      while (!finalStatement && maxTries > 0) {
        // a) Build a random statement
        const candidate = buildRandomStatement(difficulty, processes);

        // b) Parse & evaluate
        try {
          const ast = parseStatement(candidate);
          const isTrue = evaluateAST(ast, convertProcessArrayToAssignments(processes));

          // c) Check if it matches speaker's role:
          //    if speakerIsHarmless => isTrue must be "true"
          //    if speakerIsHarmless == false => isTrue must be false
          if (isTrue === speakerIsHarmless) {
            // Good match! Use this statement
            finalStatement = candidate;
          }
        } catch (err) {
          // parser error, just try again
          console.log('Parser error on candidate:', candidate, err);
        }
        maxTries--;
      }

      if (!finalStatement) {
        // fallback if we never found a match
        finalStatement = 'ERROR: Could not generate matching statement.';
      }
      responses.push(finalStatement);
    }

    processes[i].responses = responses;
  }

  return processes;
}

export default generateIntegrityPuzzle;
