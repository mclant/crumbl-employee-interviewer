import { ChevronRight, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { CandidateDetail } from "@/components/dashboard/CandidateDetail";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const STATUS_VARIANT = {
	in_progress: "secondary",
	complete: "default",
	reviewed: "outline",
} as const;

const STATUS_LABEL = {
	in_progress: "In Progress",
	complete: "Complete",
	reviewed: "Reviewed",
} as const;

export function CandidatesList() {
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		const fetchCandidates = async () => {
			const { data, error } = await supabase
				.from("candidates")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Failed to fetch candidates:", error);
			} else {
				setCandidates((data as Candidate[]) ?? []);
			}
			setLoading(false);
		};

		fetchCandidates();
	}, []);

	if (selectedId) {
		const candidate = candidates.find((c) => c.id === selectedId);
		if (candidate) {
			return (
				<CandidateDetail
					candidate={candidate}
					onBack={() => setSelectedId(null)}
				/>
			);
		}
	}

	const filtered = candidates.filter(
		(c) =>
			c.name.toLowerCase().includes(search.toLowerCase()) ||
			c.email.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="p-6 space-y-6 w-full max-w-4xl">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-display text-2xl font-semibold text-foreground">
						Candidates
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{candidates.length} total candidate
						{candidates.length !== 1 ? "s" : ""}
					</p>
				</div>

				<div className="relative w-64">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search candidates..."
						className="pl-9 h-9"
					/>
				</div>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="w-6 h-6 text-primary animate-spin" />
				</div>
			) : filtered.length === 0 ? (
				<div className="text-center py-20 text-muted-foreground">
					{search ? "No candidates match your search." : "No candidates yet."}
				</div>
			) : (
				<div className="rounded-xl border border-border overflow-hidden">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border bg-muted/50">
								<th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
									Candidate
								</th>
								<th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
									Status
								</th>
								<th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
									Score
								</th>
								<th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
									Date
								</th>
								<th className="w-10" />
							</tr>
						</thead>
						<tbody>
							{filtered.map((candidate) => (
								<tr
									key={candidate.id}
									onClick={() => setSelectedId(candidate.id)}
									className="border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
								>
									<td className="px-4 py-3">
										<div className="font-medium text-foreground">
											{candidate.name}
										</div>
										<div className="text-sm text-muted-foreground">
											{candidate.email}
										</div>
									</td>
									<td className="px-4 py-3">
										<Badge
											variant={
												STATUS_VARIANT[
													candidate.status as keyof typeof STATUS_VARIANT
												] ?? "secondary"
											}
										>
											{STATUS_LABEL[
												candidate.status as keyof typeof STATUS_LABEL
											] ?? candidate.status}
										</Badge>
									</td>
									<td className="px-4 py-3">
										{candidate.overall_score != null ? (
											<span
												className={cn(
													"font-mono text-sm font-medium",
													candidate.overall_score >= 7
														? "text-emerald-400"
														: candidate.overall_score >= 4
															? "text-amber-400"
															: "text-red-400",
												)}
											>
												{candidate.overall_score.toFixed(1)}/10
											</span>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{new Date(candidate.created_at).toLocaleDateString(
											"en-US",
											{
												month: "short",
												day: "numeric",
												year: "numeric",
											},
										)}
									</td>
									<td className="px-4 py-3">
										<ChevronRight className="w-4 h-4 text-muted-foreground" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
