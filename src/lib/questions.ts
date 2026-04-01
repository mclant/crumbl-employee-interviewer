export interface Question {
	id: string;
	text: string;
	timeLimit: number; // seconds
	context?: string; // optional subtitle/guidance shown to candidate
}

export const INTERVIEW_QUESTIONS: Question[] = [
	{
		id: "why-crumbl",
		text: "Why do you want to work at Crumbl?",
		timeLimit: 60,
		context:
			"Tell us what draws you to Crumbl and what excites you about working here.",
	},
	{
		id: "disagreement",
		text: "How do you handle a disagreement with a coworker?",
		timeLimit: 60,
		context: "Walk us through your approach with a real example if you can.",
	},
];

export const PRACTICE_QUESTIONS: Question[] = [
	{
		id: "practice-1",
		text: "Why is Crumbl a place you want to work?",
		timeLimit: 30,
		context: "Just a warm-up — say whatever comes to mind!",
	},
	{
		id: "practice-2",
		text: "Give me an example of where you hustled to get things done in a stressful environment.",
		timeLimit: 30,
		context: "Have fun with it — this is just practice.",
	},
];
