export interface Question {
  id: string
  text: string
  timeLimit: number // seconds
  context?: string // optional subtitle/guidance shown to candidate
}

export const INTERVIEW_QUESTIONS: Question[] = [
  {
    id: 'intro',
    text: 'Tell us about yourself and why you want to work here.',
    timeLimit: 60,
    context: 'This is your chance to make a great first impression.',
  },
  {
    id: 'customer-service',
    text: 'Describe a time you went above and beyond for a customer or someone you were helping.',
    timeLimit: 60,
    context: 'Be specific — tell us what happened and what you did.',
  },
  {
    id: 'teamwork',
    text: 'How do you handle a disagreement with a coworker?',
    timeLimit: 60,
    context: 'Walk us through your approach with a real example if you can.',
  },
  {
    id: 'reliability',
    text: 'What does being reliable mean to you, and how do you show it?',
    timeLimit: 60,
    context: 'Think about consistency, punctuality, and follow-through.',
  },
]

export const PRACTICE_QUESTIONS: Question[] = [
  {
    id: 'practice-1',
    text: 'What did you have for breakfast this morning?',
    timeLimit: 30,
    context: 'Just a warm-up — say whatever comes to mind!',
  },
  {
    id: 'practice-2',
    text: 'If you could travel anywhere in the world, where would you go and why?',
    timeLimit: 30,
    context: 'Have fun with it — this is just practice.',
  },
]
