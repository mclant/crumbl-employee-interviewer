import {
	AlertCircle,
	CheckCircle2,
	ChevronRight,
	Clock,
	Loader2,
	Play,
	SkipForward,
	X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import {
	INTERVIEW_QUESTIONS,
	PRACTICE_QUESTIONS,
	type Question,
} from "@/lib/questions";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type InterviewStage =
	| "intro"
	| "countdown"
	| "recording"
	| "uploading"
	| "complete";

// ── Candidate info form (shown before camera) ──────────────────────────
function CandidateForm({
	onSubmit,
}: {
	onSubmit: (name: string, email: string) => void;
}) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const nameId = useId();
	const emailId = useId();

	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-6 animate-fade-up">
			<Card className="max-w-md w-full bg-transparent border-none ring-0 shadow-none">
				<CardHeader className="text-center pb-2">
					<CardTitle className="font-display text-5xl italic text-foreground tracking-tight">
						Welcome
					</CardTitle>
					<CardDescription className="text-muted-foreground text-lg font-light">
						You're about to begin a short video interview.
						<br />
						It only takes a few minutes.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={nameId} className="text-muted-foreground">
								Full Name
							</Label>
							<Input
								id={nameId}
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Jane Smith"
								className="h-12 bg-secondary border-border rounded-xl px-4
                           text-foreground placeholder:text-muted-foreground
                           focus-visible:border-primary focus-visible:ring-primary/30"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={emailId} className="text-muted-foreground">
								Email
							</Label>
							<Input
								id={emailId}
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="jane@email.com"
								className="h-12 bg-secondary border-border rounded-xl px-4
                           text-foreground placeholder:text-muted-foreground
                           focus-visible:border-primary focus-visible:ring-primary/30"
							/>
						</div>
					</div>

					<Button
						onClick={() => onSubmit(name, email)}
						disabled={!name.trim() || !email.trim()}
						className={cn(
							"w-full h-14 rounded-xl text-lg font-semibold transition-all duration-300",
							name.trim() && email.trim()
								? "bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30"
								: "bg-muted text-muted-foreground",
						)}
					>
						Continue
					</Button>

					<p className="text-center text-muted-foreground text-sm">
						{INTERVIEW_QUESTIONS.length} questions ·{" "}
						{INTERVIEW_QUESTIONS[0].timeLimit}s each
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

// ── Countdown overlay (3-2-1) ──────────────────────────────────────────
function CountdownOverlay({
	count,
	question,
}: {
	count: number;
	question: Question;
}) {
	return (
		<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
			<p className="text-muted-foreground text-lg mb-4 max-w-lg text-center px-6 animate-fade-up">
				{question.text}
			</p>
			<div className="relative">
				<span className="text-8xl font-display text-foreground tabular-nums">
					{count}
				</span>
				<div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-pulse-ring" />
			</div>
			<p className="text-muted-foreground mt-6 text-sm tracking-wide uppercase">
				Get ready to answer
			</p>
		</div>
	);
}

// ── Timer bar ──────────────────────────────────────────────────────────
function TimerBar({
	secondsLeft,
	totalSeconds,
}: {
	secondsLeft: number;
	totalSeconds: number;
}) {
	const pct = (secondsLeft / totalSeconds) * 100;
	const isLow = secondsLeft <= 10;

	return (
		<Progress
			value={pct}
			className={cn(
				"w-full",
				"[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-muted",
				"[&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-1000 [&_[data-slot=progress-indicator]]:ease-linear",
				isLow
					? "[&_[data-slot=progress-indicator]]:bg-red-500"
					: "[&_[data-slot=progress-indicator]]:bg-primary",
			)}
		/>
	);
}

// ── Upload/processing indicator between questions ──────────────────────
function UploadingOverlay({
	questionIndex,
	totalQuestions,
	isPractice,
}: {
	questionIndex: number;
	totalQuestions: number;
	isPractice: boolean;
}) {
	const isLast = questionIndex >= totalQuestions - 1;
	return (
		<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
			<Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
			<p className="text-muted-foreground text-lg">
				{isPractice
					? isLast
						? "Wrapping up practice..."
						: "Moving on..."
					: isLast
						? "Submitting your responses..."
						: "Saving response..."}
			</p>
		</div>
	);
}

// ── Complete screen ────────────────────────────────────────────────────
function CompleteScreen({
	isPractice,
	onStartRealInterview,
}: {
	isPractice: boolean;
	onStartRealInterview: () => void;
}) {
	if (isPractice) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen px-6 animate-fade-up">
				<Card className="max-w-md bg-transparent border-none ring-0 shadow-none text-center">
					<CardHeader className="items-center pb-2">
						<div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
							<CheckCircle2 className="w-8 h-8 text-primary" />
						</div>
						<CardTitle className="font-display text-5xl italic text-foreground tracking-tight">
							Nice work!
						</CardTitle>
						<CardDescription className="text-muted-foreground text-lg font-light leading-relaxed">
							You're all warmed up.
							<br />
							Ready to start the real interview?
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 pt-4">
						<Button
							onClick={onStartRealInterview}
							className="w-full h-14 rounded-xl text-lg font-semibold transition-all duration-300
                         bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg shadow-primary/20
                         hover:shadow-primary/30"
						>
							Start the Real Interview
							<ChevronRight className="inline-block ml-2 w-5 h-5" />
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-6 animate-fade-up">
			<Card className="max-w-md bg-transparent border-none ring-0 shadow-none text-center">
				<CardHeader className="items-center pb-2">
					<div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
						<CheckCircle2 className="w-8 h-8 text-emerald-400" />
					</div>
					<CardTitle className="font-display text-5xl italic text-foreground tracking-tight">
						All done!
					</CardTitle>
					<CardDescription className="text-muted-foreground text-lg font-light leading-relaxed">
						Thank you for completing your interview.
						<br />
						Your responses have been submitted and will be reviewed shortly.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm pt-4">
						You can close this tab now.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

// ── Main Interview Page ────────────────────────────────────────────────
export default function InterviewPage() {
	const {
		videoRef,
		isStreamReady,
		isRecording,
		error: cameraError,
		startCamera,
		startRecording,
		stopRecording,
		stopCamera,
	} = useMediaRecorder();

	const [stage, setStage] = useState<InterviewStage>("intro");
	const [candidateInfo, setCandidateInfo] = useState<{
		name: string;
		email: string;
	} | null>(null);
	const [candidateId, setCandidateId] = useState<string | null>(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [countdown, setCountdown] = useState(3);
	const [secondsLeft, setSecondsLeft] = useState(0);
	const [isPracticeMode, setIsPracticeMode] = useState(false);
	const [showSkipConfirm, setShowSkipConfirm] = useState(false);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const questions = isPracticeMode ? PRACTICE_QUESTIONS : INTERVIEW_QUESTIONS;
	const currentQuestion = questions[currentQuestionIndex];
	const isLastQuestion = currentQuestionIndex >= questions.length - 1;

	// ── Handle candidate form submission ─────────────────────────
	const handleCandidateSubmit = useCallback(
		async (name: string, email: string) => {
			setCandidateInfo({ name, email });

			// Create candidate record in Supabase
			try {
				const { data, error } = await supabase
					.from("candidates")
					.insert({ name, email, status: "in_progress" })
					.select("id")
					.single();

				if (data) setCandidateId(data.id);
				if (error) console.error("Failed to create candidate:", error);
			} catch (err) {
				console.error("Supabase error:", err);
				// Continue anyway for hackathon — don't block the flow
			}

			await startCamera();
		},
		[startCamera],
	);

	// ── Begin the interview (first question) ─────────────────────
	const handleBeginInterview = useCallback((practice = false) => {
		setIsPracticeMode(practice);
		setCurrentQuestionIndex(0);
		setShowSkipConfirm(false);
		setStage("countdown");
		setCountdown(3);
	}, []);

	// ── Return to intro after practice ──────────────────────────
	const handleExitPractice = useCallback(async () => {
		setIsPracticeMode(false);
		setCurrentQuestionIndex(0);
		setShowSkipConfirm(false);
		setStage("intro");
		await startCamera();
	}, [startCamera]);

	// ── Countdown 3-2-1 then start recording ─────────────────────
	useEffect(() => {
		if (stage !== "countdown") return;
		setShowSkipConfirm(false);

		if (countdown <= 0) {
			setStage("recording");
			setSecondsLeft(currentQuestion.timeLimit);
			startRecording();
			return;
		}

		const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [stage, countdown, currentQuestion, startRecording]);

	// ── Recording timer ──────────────────────────────────────────
	useEffect(() => {
		if (stage !== "recording") return;

		timerRef.current = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					// Time's up — stop recording
					clearInterval(timerRef.current!);
					handleFinishQuestion();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Finish a question: stop recording, upload, advance ───────
	const handleFinishQuestion = useCallback(async () => {
		if (timerRef.current) clearInterval(timerRef.current);
		setShowSkipConfirm(false);
		setStage("uploading");

		const blob = await stopRecording();

		if (blob && !isPracticeMode) {
			const filePath = `interviews/${candidateId || "unknown"}/${currentQuestion.id}.webm`;

			try {
				const { error: uploadError } = await supabase.storage
					.from("interview-videos")
					.upload(filePath, blob, {
						contentType: "video/webm",
						upsert: true,
					});

				if (uploadError) {
					console.error("Upload error:", uploadError);
				} else {
					supabase.functions
						.invoke("analyze-response", {
							body: {
								candidateId,
								questionId: currentQuestion.id,
								questionText: currentQuestion.text,
								videoPath: filePath,
							},
						})
						.then(({ error }) => {
							if (error) console.error("Edge function error:", error);
						});
				}
			} catch (err) {
				console.error("Upload failed:", err);
			}
		}

		if (isLastQuestion) {
			stopCamera();

			if (!isPracticeMode && candidateId) {
				supabase
					.from("candidates")
					.update({ status: "complete" })
					.eq("id", candidateId)
					.then(({ error }) => {
						if (error) console.error("Status update error:", error);
					});
			}

			setStage("complete");
		} else {
			setCurrentQuestionIndex((i) => i + 1);
			setCountdown(3);
			setStage("countdown");
		}
	}, [
		stopRecording,
		candidateId,
		currentQuestion,
		isLastQuestion,
		stopCamera,
		isPracticeMode,
	]);

	// ── Render ───────────────────────────────────────────────────

	// Form stage
	if (!candidateInfo) {
		return <CandidateForm onSubmit={handleCandidateSubmit} />;
	}

	// Complete stage
	if (stage === "complete") {
		return (
			<CompleteScreen
				isPractice={isPracticeMode}
				onStartRealInterview={handleExitPractice}
			/>
		);
	}

	// Camera / recording stages
	return (
		<div className="flex flex-col h-screen w-screen bg-background">
			{/* Video zone — padded with rounded corners */}
			<div className="relative flex-shrink-0 mx-4 mt-4 rounded-2xl overflow-hidden h-[65vh]">
				<video
					ref={videoRef}
					className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
					playsInline
					muted
				/>

				<div className="absolute inset-0 z-10 bg-gradient-to-t from-background/40 via-transparent to-background/20 pointer-events-none" />

				{stage === "countdown" && (
					<CountdownOverlay count={countdown} question={currentQuestion} />
				)}

				{stage === "uploading" && (
					<UploadingOverlay
						questionIndex={currentQuestionIndex}
						totalQuestions={questions.length}
						isPractice={isPracticeMode}
					/>
				)}

				{!isStreamReady && (
					<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background rounded-2xl">
						{cameraError ? (
							<div className="text-center space-y-4 px-6 max-w-md">
								<Alert
									variant="destructive"
									className="bg-transparent border-none text-center [&>svg]:static [&>svg]:mx-auto [&>svg]:mb-2 [&>svg]:w-12 [&>svg]:h-12 grid-cols-1"
								>
									<AlertCircle />
									<AlertDescription className="text-muted-foreground text-lg">
										{cameraError}
									</AlertDescription>
								</Alert>
								<Button
									onClick={startCamera}
									className="px-6 h-12 bg-primary hover:bg-primary/80 rounded-xl text-primary-foreground font-medium"
								>
									Try Again
								</Button>
							</div>
						) : (
							<div className="text-center space-y-4">
								<Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
								<p className="text-muted-foreground">Accessing camera...</p>
							</div>
						)}
					</div>
				)}

				{stage === "recording" && (
					<div className="absolute inset-x-0 top-0 z-20 p-4 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Badge
									variant="destructive"
									className="h-auto bg-background/50 backdrop-blur-md rounded-full px-4 py-2 gap-2 border-none"
								>
									<div className="relative">
										<div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
										<div className="absolute inset-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
									</div>
									<span className="text-red-400 text-sm font-medium">REC</span>
								</Badge>

								<Badge
									variant="secondary"
									className="h-auto bg-background/50 backdrop-blur-md rounded-full px-4 py-2 border-none"
								>
									<span className="text-foreground/80 text-sm">
										{isPracticeMode ? "Practice" : "Question"}{" "}
										{currentQuestionIndex + 1}
										<span className="text-muted-foreground">
											{" "}
											/ {questions.length}
										</span>
									</span>
								</Badge>
							</div>

							<Badge
								variant={secondsLeft <= 10 ? "destructive" : "secondary"}
								className={cn(
									"h-auto rounded-full px-4 py-2 gap-2 border-none backdrop-blur-md",
									secondsLeft <= 10 ? "bg-red-500/20" : "bg-background/50",
								)}
							>
								<Clock
									className={cn(
										"w-4 h-4",
										secondsLeft <= 10
											? "text-red-400"
											: "text-muted-foreground",
									)}
								/>
								<span
									className={cn(
										"text-sm font-mono tabular-nums font-medium",
										secondsLeft <= 10 ? "text-red-400" : "text-foreground/80",
									)}
								>
									{secondsLeft}s
								</span>
							</Badge>
						</div>

						<TimerBar
							secondsLeft={secondsLeft}
							totalSeconds={currentQuestion.timeLimit}
						/>
					</div>
				)}
			</div>

			{/* Bottom text zone — solid background for readability */}
			<div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-y-auto">
				{isStreamReady && stage === "intro" && (
					<div className="text-center space-y-6 animate-fade-up max-w-md w-full">
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm tracking-wide uppercase">
								Camera is ready
							</p>
							<p className="text-muted-foreground text-sm">
								Make sure you're in a quiet, well-lit space
							</p>
						</div>

						<div className="space-y-3">
							<Button
								onClick={() => handleBeginInterview(false)}
								size="lg"
								className="group w-full px-10 h-14 bg-primary hover:bg-primary/80 rounded-2xl
                           text-primary-foreground text-lg font-semibold transition-all duration-300
                           shadow-lg shadow-primary/20 hover:shadow-primary/40
                           hover:scale-[1.02] active:scale-[0.98]"
							>
								Begin Interview
								<ChevronRight className="inline-block ml-2 w-5 h-5 transition-transform group-hover/button:translate-x-1" />
							</Button>

							<Button
								onClick={() => handleBeginInterview(true)}
								variant="secondary"
								size="lg"
								className="group w-full px-10 h-12 rounded-2xl bg-secondary
                           hover:bg-secondary/80 text-foreground/80 text-base font-medium
                           transition-all duration-300 border-none"
							>
								<Play className="mr-2 w-4 h-4" />
								Practice First
							</Button>
						</div>

						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">
								{INTERVIEW_QUESTIONS.length} questions ·{" "}
								{INTERVIEW_QUESTIONS[0].timeLimit}s each · no do-overs
							</p>
							<p className="text-muted-foreground/60 text-xs">
								Try a few warm-up questions first — nothing is recorded.
							</p>
						</div>
					</div>
				)}

				{stage === "recording" && (
					<div className="max-w-2xl w-full text-center space-y-2 animate-fade-up">
						<p className="text-foreground text-2xl font-display italic leading-snug">
							"{currentQuestion.text}"
						</p>
						{currentQuestion.context && (
							<p className="text-muted-foreground text-sm font-light">
								{currentQuestion.context}
							</p>
						)}
						{!showSkipConfirm ? (
							<Button
								onClick={() => setShowSkipConfirm(true)}
								variant="secondary"
								className="mt-2 px-6 h-11 rounded-xl bg-secondary hover:bg-secondary/80
                           text-foreground text-sm font-medium
                           transition-all duration-200 border-none"
							>
								{isLastQuestion ? "Finish Interview" : "Next Question"}
								<SkipForward className="ml-2 w-4 h-4" />
							</Button>
						) : (
							<div className="mt-2 space-y-2 animate-fade-up">
								<p className="text-muted-foreground text-sm font-medium">
									Are you sure? You can't redo this question.
								</p>
								<div className="flex items-center justify-center gap-3">
									<Button
										onClick={() => setShowSkipConfirm(false)}
										variant="secondary"
										className="px-5 h-10 rounded-xl bg-secondary hover:bg-secondary/80
                               text-muted-foreground text-sm font-medium
                               transition-all duration-200 border-none"
									>
										<X className="mr-1.5 w-3.5 h-3.5" />
										Cancel
									</Button>
									<Button
										onClick={handleFinishQuestion}
										className="px-5 h-10 rounded-xl bg-primary hover:bg-primary/80
                               text-primary-foreground text-sm font-medium
                               transition-all duration-200 border-none"
									>
										Yes, move on
										<SkipForward className="ml-1.5 w-3.5 h-3.5" />
									</Button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
