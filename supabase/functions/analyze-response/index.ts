// supabase/functions/analyze-response/index.ts
// Deploy with: supabase functions deploy analyze-response
//
// Required secrets:
//   supabase secrets set GEMINI_API_KEY=your-key-here

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SCORING_PROMPT = `You are an expert hiring interviewer evaluating a video response from a job candidate applying for a food service / retail position.

The candidate was asked: "{questionText}"

Analyze the video and evaluate the candidate on these dimensions. Score each from 1-10 and provide a brief justification.

Return ONLY valid JSON in this exact format:
{
  "scores": {
    "communication_clarity": { "score": 0, "reason": "" },
    "enthusiasm_energy": { "score": 0, "reason": "" },
    "relevance_of_answer": { "score": 0, "reason": "" },
    "professionalism": { "score": 0, "reason": "" },
    "confidence": { "score": 0, "reason": "" }
  },
  "overall_score": 0,
  "summary": "",
  "red_flags": [],
  "strengths": []
}`;

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

async function retryGeminiRequest(
	base64Video: string,
	questionText: string,
) {
	const concisePrompt = SCORING_PROMPT.replace("{questionText}", questionText) +
		"\n\nIMPORTANT: Keep each reason to ONE sentence maximum.";

	const retryResponse = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{
								inline_data: {
									mime_type: "video/webm",
									data: base64Video,
								},
							},
							{ text: concisePrompt },
						],
					},
				],
				generationConfig: {
					temperature: 0.2,
					maxOutputTokens: 8192,
					responseMimeType: "application/json",
				},
			}),
		},
	);

	if (!retryResponse.ok) {
		const errorText = await retryResponse.text();
		throw new Error(`Gemini retry API error: ${retryResponse.status} ${errorText}`);
	}

	const retryData = await retryResponse.json();
	const retryText =
		retryData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

	return JSON.parse(retryText);
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const { candidateId, questionId, questionText, videoPath } =
			await req.json();

		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

		// 1. Create a processing record
		await supabase.from("responses").insert({
			candidate_id: candidateId,
			question_id: questionId,
			video_path: videoPath,
			processing_status: "processing",
		});

		// 2. Download the video from storage
		const { data: fileData, error: downloadError } = await supabase.storage
			.from("interview-videos")
			.download(videoPath);

		if (downloadError || !fileData) {
			throw new Error(`Failed to download video: ${downloadError?.message}`);
		}

		// 3. Convert video to base64 for Gemini
		const arrayBuffer = await fileData.arrayBuffer();
		const base64Video = btoa(
			new Uint8Array(arrayBuffer).reduce(
				(data, byte) => data + String.fromCharCode(byte),
				"",
			),
		);

		// 4. Call Gemini API
		const geminiResponse = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									inline_data: {
										mime_type: "video/webm",
										data: base64Video,
									},
								},
								{
									text: SCORING_PROMPT.replace("{questionText}", questionText),
								},
							],
						},
					],
					generationConfig: {
						temperature: 0.2,
						maxOutputTokens: 4096,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (!geminiResponse.ok) {
			const errorText = await geminiResponse.text();
			throw new Error(
				`Gemini API error: ${geminiResponse.status} ${errorText}`,
			);
		}

		const geminiData = await geminiResponse.json();

		// 5. Parse the structured response, retrying once if truncated
		const candidate = geminiData.candidates?.[0];
		const responseText = candidate?.content?.parts?.[0]?.text ?? "{}";
		const finishReason = candidate?.finishReason;

		let scores;
		try {
			scores = JSON.parse(responseText);
		} catch {
			if (finishReason === "MAX_TOKENS") {
				console.warn("Gemini response truncated, retrying with higher token limit");
				const retryScores = await retryGeminiRequest(
					base64Video,
					questionText,
				);
				scores = retryScores;
			} else {
				scores = { error: "Failed to parse Gemini response", raw: responseText };
			}
		}

		// 6. Store scores in the database
		const { error: updateError } = await supabase
			.from("responses")
			.update({
				scores,
				processing_status: "complete",
				processed_at: new Date().toISOString(),
			})
			.eq("candidate_id", candidateId)
			.eq("question_id", questionId);

		if (updateError) {
			console.error("Failed to update scores:", updateError);
		}

		return new Response(JSON.stringify({ success: true, scores }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
			status: 200,
		});
	} catch (error) {
		console.error("analyze-response error:", error);
		return new Response(
			JSON.stringify({ success: false, error: (error as Error).message }),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
				status: 500,
			},
		);
	}
});
