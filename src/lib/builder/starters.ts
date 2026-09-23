export type Starter = { label: string; prompt: string };

export const STARTERS: Starter[] = [
  {
    label: "To-do list",
    prompt:
      "Build a clean to-do list app where I can add tasks, mark them complete, and delete them, with everything saved between visits. Add priorities, deadlines, categories, search, and a dark mode toggle.",
  },
  {
    label: "Portfolio site",
    prompt:
      "Build a modern personal portfolio site with a hero, about section, projects grid, skills, testimonials, and a contact form. Include a dark mode toggle and thoughtful typography.",
  },
  {
    label: "Pomodoro timer",
    prompt:
      "Build a Pomodoro focus timer with start, pause, and reset, automatic work and break intervals, a count of completed sessions, sound on break, and a settings menu with dark mode.",
  },
  {
    label: "Expense tracker",
    prompt:
      "Build an expense tracker where I can log expenses with a category and amount, see a running total, filter by month, and view a chart of spending by category. Save everything locally.",
  },
  {
    label: "Landing page",
    prompt:
      "Build a sleek product landing page with a hero, feature highlights, pricing, testimonials, FAQ, and a strong call-to-action. Make it feel like a real SaaS homepage.",
  },
  {
    label: "Habit tracker",
    prompt:
      "Build a habit tracker where I can add daily habits, check them off each day, see a calendar grid of streaks, and keep progress saved. Add dark mode and weekly stats.",
  },
  {
    label: "Recipe book",
    prompt:
      "Build a recipe book app where I can add recipes with ingredients and steps, browse them in a card grid, filter by category, search, and save everything between visits.",
  },
  {
    label: "Kanban board",
    prompt:
      "Build a Kanban board with To Do, In Progress, and Done columns where I can add cards, drag them between columns, edit and delete them, and keep everything saved.",
  },
  {
    label: "Flashcards",
    prompt:
      "Build a flashcard study app where I can create decks with a front and back, flip through them, shuffle, track study progress, and save decks locally. Add dark mode.",
  },
  {
    label: "Memory game",
    prompt:
      "Build a memory matching card game on a grid. Flip two cards at a time to find pairs, track moves and elapsed time, and celebrate when all pairs are matched. Add a new-game button and difficulty levels.",
  },
  {
    label: "Markdown notes",
    prompt:
      "Build a markdown notes app with a list of notes, a live side-by-side editor and preview, full-text search, and everything saved between visits. Add a formatting toolbar.",
  },
  {
    label: "Quiz game",
    prompt:
      "Build a multiple-choice quiz game that shows one question at a time, gives instant feedback, tracks the score, and shows a results summary with a play-again button. Include a countdown timer.",
  },
];

export function pickStarters(n = 6): Starter[] {
  const copy = STARTERS.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}
