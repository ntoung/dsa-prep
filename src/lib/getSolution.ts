import type { Language, LanguageSolution, Problem } from '../types'

// Python's fields (Problem.solutionCode/revealStages) never moved into the
// translations map - see src/data/CONTENT_SCHEMA.md for why. This is the
// one place that has to know both live in different shapes, so every
// consumer (ProblemCard, LearnFlipCard, LearnView) can just ask for
// "the solution in this language" without caring which problems have been
// translated yet.
export function getSolution(problem: Problem, language: Language): LanguageSolution {
  if (language === 'python') {
    return { code: problem.solutionCode, revealStages: problem.revealStages }
  }
  return (
    problem.translations?.[language] ?? { code: problem.solutionCode, revealStages: problem.revealStages }
  )
}
