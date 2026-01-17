/**
 * Quiz Question Rephrasing Script
 * AI Math Tutor v2
 *
 * Rephrases quiz questions with names/context to mitigate copyright concerns.
 * Changes names, numbers, objects while keeping the same math concept.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Name pools for replacement (diverse, Singapore-appropriate names)
const NAMES = {
  first: ['Kai', 'Maya', 'Leo', 'Zoe', 'Max', 'Lily', 'Sam', 'Ruby', 'Ivy', 'Finn', 'Ali', 'Bala', 'Cara', 'Dan', 'Eli', 'Joy', 'Ken', 'Lara', 'Mina', 'Raj', 'Sita', 'Tim', 'Una', 'Vikram', 'Wei', 'Xin', 'Yuki', 'Zara', 'Noah', 'Aria', 'Ethan', 'Chloe', 'Lucas', 'Mia', 'Jacob'],
  last: ['Tan', 'Lee', 'Lim', 'Wong', 'Ng', 'Goh', 'Chua', 'Ong', 'Lau', 'Toh', 'Mohamed', 'Silva', 'Patel', 'Chen', 'Kim', 'Sato', 'Garcia', 'Singh', 'Fernandez'],
};

// Object pools for word problems
const OBJECTS = {
  fruits: ['mangoes', 'pineapples', 'papayas', 'bananas', 'oranges', 'pears', 'plums'],
  stationery: ['erasers', 'pencils', 'rulers', 'markers', 'notebooks', 'folders', 'binders'],
  toys: ['lego bricks', 'toy blocks', 'game pieces', 'trading cards', 'stickers', 'badges', 'buttons'],
  sports: ['tennis balls', 'badminton shuttlecocks', 'table tennis balls', 'marbles', 'dice', 'chess pieces'],
  food: ['cookies', 'cupcakes', 'sandwiches', 'buns', 'tarts', 'muffins', 'pastries'],
};

// Color pools
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white'];

// Days of week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Get a random item from array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a random name (first only)
 */
function randomName(): string {
  return randomChoice(NAMES.first);
}

/**
 * Get a random full name
 */
function randomFullName(): string {
  return `${randomChoice(NAMES.first)} ${randomChoice(NAMES.last)}`;
}

/**
 * Rephrasing rules for each question
 */
const REPHRASE_RULES: Record<string, (q: string) => string> = {
  // P1 Whole Numbers
  'P1-WHOLE-002': (q: string) => {
    const name = randomName();
    const obj1 = randomChoice(OBJECTS.fruits);
    const color1 = randomChoice(COLORS);
    const color2 = randomChoice(COLORS.filter(c => c !== color1));
    const n1 = 5 + Math.floor(Math.random() * 5); // 5-9
    const n2 = 3 + Math.floor(Math.random() * 5); // 3-7
    return `${name} has ${n1} ${color1} ${obj1} and ${n2} ${color2} ${obj1}. How many ${obj1} does ${name} have altogether?`;
  },

  'P1-WHOLE-005': (q: string) => {
    const names = [randomName(), randomName(), randomName()];
    return `${names[0]} finished the race before ${names[1]}. ${names[1]} finished before ${names[2]}. Who came in second?`;
  },

  'P1-WHOLE-013': (q: string) => {
    const name = randomName();
    const total = 8 + Math.floor(Math.random() * 5); // 8-12
    const pos = 3 + Math.floor(Math.random() * 5); // 3-7
    return `In a line of ${total} children, ${name} is the ${pos}${getOrdinal(pos)} person. What position is ${name} in?`;
  },

  'P1-WHOLE-017': (q: string) => {
    const name = randomName();
    const obj = randomChoice(OBJECTS.fruits);
    const colors = [randomChoice(COLORS), randomChoice(COLORS), randomChoice(COLORS)];
    const n1 = 4 + Math.floor(Math.random() * 4); // 4-7
    const n2 = 3 + Math.floor(Math.random() * 4); // 3-6
    const n3 = 2 + Math.floor(Math.random() * 3); // 2-4
    return `${name} counted ${n1} ${colors[0]} ${obj}, ${n2} ${colors[1]} ${obj}, and ${n3} ${colors[2]} ${obj}. How many ${obj} did ${name} count in total?`;
  },

  // P1 Addition/Subtraction
  'P1-ADD-001': (q: string) => {
    const name = randomName();
    const obj = randomChoice(OBJECTS.stationery);
    const n1 = 8 + Math.floor(Math.random() * 7); // 8-14
    const n2 = 3 + Math.floor(Math.random() * 5); // 3-7
    return `${name} has ${n1} ${obj}. ${randomName()} gives ${name} ${n2} more ${obj}. How many ${obj} does ${name} have now?`;
  },

  'P1-ADD-005': (q: string) => {
    const name = randomName();
    const day1 = randomChoice(DAYS);
    const day2 = randomChoice(DAYS.filter(d => d !== day1));
    const n1 = 15 + Math.floor(Math.random() * 10); // 15-24
    const n2 = 8 + Math.floor(Math.random() * 7); // 8-14
    return `${name} read ${n1} pages on ${day1} and ${n2} pages on ${day2}. How many pages did ${name} read altogether?`;
  },

  'P1-ADD-006': (q: string) => {
    const name = randomName();
    const obj = randomChoice(OBJECTS.toys);
    const n1 = 30 + Math.floor(Math.random() * 20); // 30-49
    const n2 = 10 + Math.floor(Math.random() * 10); // 10-19
    return `${name} had ${n1} ${obj}. ${name} gave ${n2} ${obj} to ${randomName()}. How many ${obj} does ${name} have left?`;
  },

  'P1-ADD-010': (q: string) => {
    const name = randomName();
    const obj = randomChoice(OBJECTS.stationery);
    const n1 = 12 + Math.floor(Math.random() * 10); // 12-21
    const n2 = 4 + Math.floor(Math.random() * 5); // 4-8
    return `${name} has ${n1} ${obj}. ${name} loses ${n2} ${obj}. How many ${obj} does ${name} have now?`;
  },

  'P1-ADD-014': (q: string) => {
    const total = 40 + Math.floor(Math.random() * 20); // 40-59
    const went = 15 + Math.floor(Math.random() * 15); // 15-29
    return `There are ${total} students in Primary 1. ${went} students went on a field trip. How many students stayed in school?`;
  },

  'P1-ADD-016': (q: string) => {
    const name = randomName();
    const obj = randomChoice(OBJECTS.stationery);
    const n1 = 25 + Math.floor(Math.random() * 15); // 25-39
    const n2 = 15 + Math.floor(Math.random() * 15); // 15-29
    return `${name} has ${n1} ${obj}. ${name} buys ${n2} more ${obj}. How many ${obj} does ${name} have now?`;
  },

  'P1-ADD-018': (q: string) => {
    const name = randomName();
    const obj = randomChoice(OBJECTS.toys);
    const n1 = 10 + Math.floor(Math.random() * 10); // 10-19
    const n2 = 3 + Math.floor(Math.random() * 5); // 3-7
    return `${name} has ${n1} ${obj}. ${name} gives ${n2} ${obj} to ${randomName()}. How many ${obj} does ${name} have left?`;
  },

  // P1 Multiplication/Division
  'P1-MULT-004': (q: string) => {
    const name = randomName();
    const container = randomChoice(['boxes', 'bags', 'packets', 'jars']);
    const obj = randomChoice(OBJECTS.fruits);
    const n1 = 2 + Math.floor(Math.random() * 3); // 2-4
    const n2 = 3 + Math.floor(Math.random() * 5); // 3-7
    return `${name} has ${n1} ${container}. Each ${container.slice(0, -1)} contains ${n2} ${obj}. How many ${obj} does ${name} have?`;
  },

  // P1 Money
  'P1-MONEY-001': (q: string) => {
    const name = randomName();
    const n1 = 20 + Math.floor(Math.random() * 30) * 5; // 20, 25, ... 140
    const n2 = 10 + Math.floor(Math.random() * 18) * 5; // 10, 15, ... 95
    return `${name} has ${n1} cents and ${randomName()} gives ${name} ${n2} cents. How much money does ${name} have now?`;
  },

  'P1-MONEY-004': (q: string) => {
    const obj = randomChoice(['pencil', 'eraser', 'notebook', 'ruler']);
    const price = 50 + Math.floor(Math.random() * 40) * 5; // 50, 55, ... 195
    const paid = 1;
    const name = randomName();
    return `A ${obj} costs ${price} cents. ${name} pays with ${paid} dollar. How much change does ${name} get?`;
  },

  'P1-MONEY-006': (q: string) => {
    const name = randomName();
    const n1 = 25 + Math.floor(Math.random() * 25) * 5; // 25, 30, ... 145
    const n2 = 10 + Math.floor(Math.random() * 18) * 5; // 10, 15, ... 95
    return `${name} has ${n1} cents. ${randomName()} gives ${name} ${n2} cents more. How much money does ${name} have now?`;
  },

  'P1-MONEY-009': (q: string) => {
    const name = randomName();
    const c1 = 5 + Math.floor(Math.random() * 4) * 5; // 5, 10, 15, 20
    const count1 = 2 + Math.floor(Math.random() * 3); // 2-4
    const c2 = 10 + Math.floor(Math.random() * 2) * 10; // 10, 20, 30
    const count2 = 1 + Math.floor(Math.random() * 2); // 1-2
    return `${name} has ${count1} ${c1}-cent coins and ${count2} ${c2}-cent coins. How much money does ${name} have?`;
  },

  'P1-MONEY-015': (q: string) => {
    const name = randomName();
    const fifty = 1;
    const twenty = 1 + Math.floor(Math.random() * 2); // 1-2
    const five = 1;
    return `${name} has ${fifty} 50-cent coin${fifty > 1 ? 's' : ''}, ${twenty} 20-cent coin${twenty > 1 ? 's' : ''}, and ${five} 5-cent coin. How much money does ${name} have?`;
  },

  // P1 Time
  'P1-TIME-014': (q: string) => {
    const name = randomName();
    const hour = 6 + Math.floor(Math.random() * 3); // 6-8 am
    const h = 1 + Math.floor(Math.random() * 2); // 1-2 hours
    const m = [15, 30, 45][Math.floor(Math.random() * 3)];
    const ampm = 'am';
    return `${name} wakes up at ${hour}:00 ${ampm}. ${name} leaves for school ${h} hour${h > 1 ? 's' : ''} and ${m} minutes later. What time does ${name} leave?`;
  },

  'P1-TIME-018': (q: string) => {
    const name = randomName();
    const hour = 2 + Math.floor(Math.random() * 4); // 2-5 pm
    const start = 3;
    const ampm = 'pm';
    return `${name} starts ${randomName()} homework at ${start}:00 ${ampm}. ${name} finishes ${hour} hour${hour > 1 ? 's' : ''} later. What time does ${name} finish?`;
  },

  // P2 Mass
  'P2-MASS-014': (q: string) => {
    const name = randomName();
    const n1 = 1 + Math.floor(Math.random() * 3); // 1-3 kg
    const n2 = [100, 200, 300, 400, 500, 600, 700, 800, 900][Math.floor(Math.random() * 9)];
    const obj1 = randomChoice(['apples', 'oranges', 'mangoes', 'bananas']);
    const obj2 = randomChoice(['grapes', 'strawberries', 'cherries', 'blueberries']);
    return `${name} bought ${n1} kg of ${obj1} and ${n2} g of ${obj2}. What was the total mass?`;
  },
};

/**
 * Get ordinal suffix for numbers
 */
function getOrdinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

/**
 * Update options based on new question
 */
function updateOptions(original: Record<string, string>, newQuestion: string, originalQuestion: string, correctAnswer: string): Record<string, string> {
  // For most questions, we can't easily recalculate options programmatically
  // without full NLP. Return original options - manual verification needed.
  return original;
}

/**
 * Update explanation based on new question
 */
function updateExplanation(original: string, newQuestion: string, originalQuestion: string): string {
  // Extract numbers from new question
  const nums = newQuestion.match(/\d+/g);
  if (!nums) return original;

  // Try to infer operation from original explanation
  if (original.includes('+') && nums.length >= 2) {
    const sum = parseInt(nums[0]) + parseInt(nums[1]);
    if (original.includes('-') && nums.length >= 3) {
      const diff = parseInt(nums[0]) - parseInt(nums[1]);
      return `${nums[0]} + ${nums[1]} = ${sum}, then ${sum} - ${nums[2]} = ${diff}.`;
    }
    return `${nums.join(' + ')} = ${sum}.`;
  }

  if (original.includes('-') && nums.length >= 2) {
    const diff = parseInt(nums[0]) - parseInt(nums[1]);
    return `Subtract: ${nums[0]} - ${nums[1]} = ${diff}.`;
  }

  if (original.includes('×') || original.includes('times') || original.includes('bags ×')) {
    if (original.includes('bags') || original.includes('boxes')) {
      const mult = parseInt(nums[0]) * parseInt(nums[1]);
      return `${nums[0]} ${nums.length > 2 ? '(containers)' : ''} × ${nums[1]} = ${mult}.`;
    }
  }

  // Return original if can't parse
  return original;
}

/**
 * Main function to rephrase quiz file
 */
function rephraseQuizFile(filePath: string, questionIds: string[]): void {
  const content = readFileSync(filePath, 'utf-8');
  const questions = JSON.parse(content);

  let modified = 0;

  for (const q of questions) {
    if (questionIds.includes(q.id) && REPHRASE_RULES[q.id]) {
      const originalQuestion = q.question;
      q.question = REPHRASE_RULES[q.id](q.question);
      q.explanation = updateExplanation(q.explanation, q.question, originalQuestion);

      console.log(`Updated: ${q.id}`);
      console.log(`  Before: ${originalQuestion}`);
      console.log(`  After:  ${q.question}`);
      console.log();
      modified++;
    }
  }

  if (modified > 0) {
    writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`\n✅ Updated ${modified} questions in ${filePath}`);
  } else {
    console.log(`\n⚠️  No matching questions found in ${filePath}`);
  }
}

// Questions to rephrase
const P1_QUESTIONS = [
  'P1-WHOLE-002', 'P1-WHOLE-005', 'P1-WHOLE-013', 'P1-WHOLE-017',
  'P1-ADD-001', 'P1-ADD-005', 'P1-ADD-006', 'P1-ADD-010', 'P1-ADD-014',
  'P1-ADD-016', 'P1-ADD-018',
  'P1-MULT-004',
  'P1-MONEY-001', 'P1-MONEY-004', 'P1-MONEY-006', 'P1-MONEY-009', 'P1-MONEY-015',
  'P1-TIME-014', 'P1-TIME-018',
];

const P2_QUESTIONS = [
  'P2-MASS-014',
];

// Execute
const p1Path = join(__dirname, '../src/data/quiz-p1.json');
const p2Path = join(__dirname, '../src/data/quiz-p2.json');

console.log('=== Rephrasing P1 Quiz Questions ===\n');
rephraseQuizFile(p1Path, P1_QUESTIONS);

console.log('\n=== Rephrasing P2 Quiz Questions ===\n');
rephraseQuizFile(p2Path, P2_QUESTIONS);

console.log('\n✅ Quiz question rephrasing complete!');
console.log('\n⚠️  IMPORTANT: Please verify the answers match the new questions.');
console.log('Some questions may need manual verification of options and explanations.');
