import {
	AlertTriangle,
	ArrowLeft,
	FileText,
	Loader2,
	Play,
	Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { INTERVIEW_QUESTIONS } from "@/lib/questions";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Candidate = {
	id: string;
	name: string;
	email: string;
	status: string;
	overall_score: number | null;
	created_at: string;
};

type ScoreEntry = {
	score: number;
	reason: string;
};

type ResponseScores = {
	scores: Record<string, ScoreEntry>;
	overall_score: number;
	summary: string;
	red_flags: string[];
	strengths: string[];
};

type CandidateResponse = {
	id: string;
	candidate_id: string;
	question_id: string;
	video_path: string | null;
	scores: ResponseScores | null;
	processing_status: string;
	processed_at: string | null;
	created_at: string;
};

type CandidateDetailProps = {
	candidate: Candidate;
	onBack: () => void;
};

const SCORE_LABELS: Record<string, string> = {
	communication_clarity: "Communication",
	enthusiasm_energy: "Enthusiasm",
	relevance_of_answer: "Relevance",
	professionalism: "Professionalism",
	confidence: "Confidence",
};

function ScoreBar({
	label,
	score,
	reason,
}: {
	label: string;
	score: number;
	reason: string;
}) {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground">{label}</span>
				<span
					className={cn(
						"text-sm font-mono font-medium",
						score >= 7
							? "text-emerald-400"
							: score >= 4
								? "text-amber-400"
								: "text-red-400",
					)}
				>
					{score}/10
				</span>
			</div>
			<Progress
				value={score * 10}
				className={cn(
					"[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-muted",
					score >= 7
						? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
						: score >= 4
							? "[&_[data-slot=progress-indicator]]:bg-amber-500"
							: "[&_[data-slot=progress-indicator]]:bg-red-500",
				)}
			/>
			{reason && <p className="text-xs text-muted-foreground/70">{reason}</p>}
		</div>
	);
}

function VideoPlayer({ videoPath }: { videoPath: string }) {
	const [url, setUrl] = useState<string | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		const getUrl = async () => {
			const { data, error } = await supabase.storage
				.from("interview-videos")
				.createSignedUrl(videoPath, 3600);

			if (error || !data?.signedUrl) {
				setError(true);
			} else {
				setUrl(data.signedUrl);
			}
		};
		getUrl();
	}, [videoPath]);

	if (error) {
		return (
			<div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
				Video unavailable
			</div>
		);
	}

	if (!url) {
		return (
			<div className="rounded-lg bg-muted/50 p-8 flex items-center justify-center">
				<Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
			</div>
		);
	}

	return (
		<video
			src={url}
			controls
			className="w-full rounded-lg bg-background"
			preload="metadata"
		>
			<track kind="captions" />
		</video>
	);
}

function ResponseCard({ response }: { response: CandidateResponse }) {
	const [showVideo, setShowVideo] = useState(false);
	const question = INTERVIEW_QUESTIONS.find(
		(q) => q.id === response.question_id,
	);
	const scores = response.scores;

	return (
		<Card className="bg-card">
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div>
						<CardTitle className="text-foreground">
							{question?.text ?? response.question_id}
						</CardTitle>
						{question?.context && (
							<p className="text-sm text-muted-foreground mt-1">
								{question.context}
							</p>
						)}
					</div>

					<Badge
						variant={
							response.processing_status === "complete"
								? "default"
								: response.processing_status === "error"
									? "destructive"
									: "secondary"
						}
					>
						{response.processing_status === "complete"
							? "Scored"
							: response.processing_status === "processing"
								? "Processing"
								: response.processing_status === "error"
									? "Error"
									: "Pending"}
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{response.video_path && (
					<div>
						{showVideo ? (
							<VideoPlayer videoPath={response.video_path} />
						) : (
							<button
								type="button"
								onClick={() => setShowVideo(true)}
								className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
							>
								<Play className="w-4 h-4" />
								Watch response video
							</button>
						)}
					</div>
				)}

				{scores && response.processing_status === "complete" && (
					<>
						<div className="space-y-4">
							{Object.entries(scores.scores ?? {}).map(([key, entry]) => (
								<ScoreBar
									key={key}
									label={SCORE_LABELS[key] ?? key}
									score={entry.score}
									reason={entry.reason}
								/>
							))}
						</div>

						<div className="rounded-lg bg-muted/30 p-4 space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-foreground flex items-center gap-2">
									<FileText className="w-4 h-4" />
									AI Summary
								</span>
								<span
									className={cn(
										"font-mono text-sm font-semibold",
										scores.overall_score >= 7
											? "text-emerald-400"
											: scores.overall_score >= 4
												? "text-amber-400"
												: "text-red-400",
									)}
								>
									{scores.overall_score}/10
								</span>
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{scores.summary}
							</p>
						</div>

						{scores.strengths?.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium text-foreground flex items-center gap-2">
									<Star className="w-4 h-4 text-emerald-400" />
									Strengths
								</h4>
								<ul className="space-y-1">
									{scores.strengths.map((s) => (
										<li
											key={s}
											className="text-sm text-muted-foreground flex items-start gap-2"
										>
											<span className="text-emerald-400 mt-1">•</span>
											{s}
										</li>
									))}
								</ul>
							</div>
						)}

						{scores.red_flags?.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium text-foreground flex items-center gap-2">
									<AlertTriangle className="w-4 h-4 text-red-400" />
									Red Flags
								</h4>
								<ul className="space-y-1">
									{scores.red_flags.map((f) => (
										<li
											key={f}
											className="text-sm text-muted-foreground flex items-start gap-2"
										>
											<span className="text-red-400 mt-1">•</span>
											{f}
										</li>
									))}
								</ul>
							</div>
						)}
					</>
				)}

				{response.processing_status === "processing" && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="w-4 h-4 animate-spin" />
						AI is analyzing this response...
					</div>
				)}

				{response.processing_status === "pending" && (
					<p className="text-sm text-muted-foreground">
						Waiting for processing to begin.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function CandidateDetail({ candidate, onBack }: CandidateDetailProps) {
	const [responses, setResponses] = useState<CandidateResponse[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchResponses = async () => {
			const { data, error } = await supabase
				.from("responses")
				.select("*")
				.eq("candidate_id", candidate.id)
				.order("created_at", { ascending: true });

			if (error) {
				console.error("Failed to fetch responses:", error);
			} else {
				setResponses((data as CandidateResponse[]) ?? []);
			}
			setLoading(false);
		};

		fetchResponses();
	}, [candidate.id]);

	return (
		<div className="p-6 space-y-6 max-w-4xl w-full">
			<div>
				<Button
					variant="ghost"
					onClick={onBack}
					className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to candidates
				</Button>

				<div className="flex items-start justify-between">
					<div>
						<h2 className="font-display text-2xl font-semibold text-foreground">
							{candidate.name}
						</h2>
						<p className="text-sm text-muted-foreground mt-1">
							{candidate.email}
						</p>
					</div>

					<div className="text-right space-y-1">
						{candidate.overall_score != null && (
							<div
								className={cn(
									"text-3xl font-mono font-bold",
									candidate.overall_score >= 7
										? "text-emerald-400"
										: candidate.overall_score >= 4
											? "text-amber-400"
											: "text-red-400",
								)}
							>
								{candidate.overall_score.toFixed(1)}
								<span className="text-lg text-muted-foreground">/10</span>
							</div>
						)}
						<Badge
							variant={
								candidate.status === "complete"
									? "default"
									: candidate.status === "reviewed"
										? "outline"
										: "secondary"
							}
						>
							{candidate.status === "in_progress"
								? "In Progress"
								: candidate.status === "complete"
									? "Complete"
									: "Reviewed"}
						</Badge>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="w-6 h-6 text-primary animate-spin" />
				</div>
			) : responses.length === 0 ? (
				<p className="text-center py-20 text-muted-foreground">
					No responses recorded yet.
				</p>
			) : (
				<div className="space-y-4 pb-6">
					{responses.map((response) => (
						<ResponseCard key={response.id} response={response} />
					))}
				</div>
			)}
		</div>
	);
}
