# Crumbl Interview — Candidate Recording App

AI-powered video interview screening for franchise partners.

## Quick Start (Hackathon)

```bash
# 1. Install deps
npm install

# 2. Copy env and fill in your Supabase creds
cp .env.example .env

# 3. Run the schema SQL in Supabase SQL Editor
#    → supabase/schema.sql

# 4. Deploy the Edge Function
supabase functions deploy analyze-response
supabase secrets set GEMINI_API_KEY=your-key

# 5. Run dev server
npm run dev
```

## Architecture

```
Candidate opens link
  → Camera preview + name/email
  → 3-2-1 countdown per question
  → 60s recording (auto-stops)
  → Upload to Supabase Storage
  → Edge Function → Gemini 1.5 Flash → scores saved as JSONB
  → Franchise partner dashboard reads scores via Realtime
```

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/InterviewPage.tsx` | Full candidate recording flow |
| `src/hooks/useMediaRecorder.ts` | Camera + MediaRecorder abstraction |
| `src/lib/questions.ts` | Hardcoded interview questions (edit these) |
| `supabase/functions/analyze-response/index.ts` | Gemini scoring Edge Function |
| `supabase/schema.sql` | Database tables + storage bucket |

## Customizing Questions

Edit `src/lib/questions.ts`. Each question has:
- `id` — unique key (used as filename for the video)
- `text` — what the candidate sees
- `timeLimit` — seconds (currently 60)
- `context` — optional helper text shown below the question
