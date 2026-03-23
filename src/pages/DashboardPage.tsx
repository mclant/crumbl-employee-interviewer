import { Calendar, LogOut, Users } from "lucide-react";
import { useState } from "react";
import { CalendarPlaceholder } from "@/components/dashboard/CalendarPlaceholder";
import { CandidatesList } from "@/components/dashboard/CandidatesList";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Tab = "calendar" | "candidates";

const NAV_ITEMS = [
	{ id: "calendar" as const, label: "Calendar", icon: Calendar },
	{ id: "candidates" as const, label: "Candidates", icon: Users },
];

export default function DashboardPage() {
	const [activeTab, setActiveTab] = useState<Tab>("candidates");

	const handleSignOut = async () => {
		await supabase.auth.signOut();
	};

	return (
		<div className="flex h-screen bg-background">
			<aside className="w-64 border-r border-border flex flex-col bg-card">
				<div className="p-6 border-b border-border">
					<h1 className="font-display text-lg font-semibold text-foreground tracking-tight">
						Crumbl Hiring
					</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Franchise Dashboard
					</p>
				</div>

				<nav className="flex-1 p-3 space-y-1">
					{NAV_ITEMS.map((item) => (
						<button
							type="button"
							key={item.id}
							onClick={() => setActiveTab(item.id)}
							className={cn(
								"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
								activeTab === item.id
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<item.icon className="w-4 h-4" />
							{item.label}
						</button>
					))}
				</nav>

				<div className="p-3 border-t border-border">
					<Button
						variant="ghost"
						onClick={handleSignOut}
						className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
					>
						<LogOut className="w-4 h-4" />
						Sign Out
					</Button>
				</div>
			</aside>

			<main className="flex-1 overflow-y-auto w-full flex justify-center">
				{activeTab === "calendar" && <CalendarPlaceholder />}
				{activeTab === "candidates" && <CandidatesList />}
			</main>
		</div>
	);
}
