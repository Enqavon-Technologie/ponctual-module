# CLAUDE.md — Ponctuel (Bloom Buddies) project state

## Repos (two, both cloned locally)
- **Frontend** `~/ponctual-module` (React 19 + Vite + Tailwind v4, TS). This repo. Public GitHub `Enqavon-Technologie/ponctual-module`.
- **Backend** `~/ponctual_tourist_laravel` (Laravel 10/11, PHP 8.3, Sanctum). Private GitHub `Enqavon-Technologie/ponctual_tourist_laravel`.
- Frontend talks to backend via `VITE_API_BASE_URL`. **Prod backend** = `https://ponctuel.bloom-buddies.fr/backend/public/api`. The **live prod backend differs from the repo** (has manually-added DB columns + allows `ponctuel@` admin login) — repo migrations were incomplete.

## Architecture
- Parent booking flow (`src/App.tsx`): now **3 steps** (was 4). Step3 = price quote → confirm modal → `acceptPriceQuote` → dashboard. Routes: `/price/:id`, `/contract/:id`, `/match/:id`, `/cmg/:id`. View state machine: `booking|profile|login|admin-dashboard|contract|match`.
- Admin back office (`src/components/AdminDashboard.tsx`, ~4k lines): sidebar pages. Key: **Pending Requests** (`/new-requests`, FE-filtered `quote_status!=1`), **Requests in Matching** (`/matching-requests`, `quote_status=1` & no final_choice), **Pending Signature & Payment** (`/pending-signature-requests`, has final_choice + unsigned contract).
- Auth = Sanctum bearer token in `localStorage.auth_token` + `auth_role`. `checkAuth` (App.tsx) optimistically restores from `auth_role` and **never auto-logs-out on 401** (persistence fix). Admin email `ponctuel@bloom-buddies.fr`.

## Current task: the MATCHING feature (admin proposes → family picks → final choice)
Flow: admin **proposes 3-5** candidates (external dir `bloom-buddies.fr/api/all-bs-for-api`) → family emailed `/match/:id` → family **selects + schedules video interviews** → admin **makes final choice** (creates contract) → request moves to Pending Signature.
- Choice lifecycle via `parent_babysitter_choices.status`: `proposed`→`selected`→`rejected`; `final_choice=1` = hired.
- Key FE components: `MatchSelectionView` (parent `/match/:id`), `MatchPicksContent` (admin inline candidate panel), `ProposeCandidatesModal`, `InterviewScheduler` (shared, date+time inputs, video-interview), `src/utils/requestDetails.ts` (copy-details text + 13.22€/h gross salary).
- Key BE endpoints (`ParentBabysitterChoiceController` + `ParentRequestController`): `matchingRequests`, `proposeCandidates`, `proposedCandidates`/`selectCandidates` (parent), `pendingSignatureRequests`, `scheduleInterview` (admin reschedule), `updateFinalChoice` (creates contract+emails).
- **Video interviews = Agora** (replaced Zoom). Deterministic channel `interview_{choiceId}`; FE room at `/interview/:channel` (standalone, rendered in `main.tsx`, no account) using `agora-rtc-sdk-ng` (`src/components/InterviewRoom.tsx`); link built FE-side via `src/utils/interview.ts` (`interviewRoomUrl`) from `window.location.origin`, BE-side via `interviewRoomLink()` from `APP_URL` (for emails). First to open the link creates the room. **Token auth required** (project has App Certificate): BE token server `AgoraTokenController@token` (`GET /api/agora/token`, public) using vendored `app/Agora/RtcTokenBuilder2.php` (AccessToken2 007, uid 0 wildcard, publisher). Creds: BE `.env` `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` (+`config/services.php` `services.agora`). DB column kept as `zoom_meeting_link` (now holds the Agora URL) to avoid a risky prod rename. **BLOCKER: provided App ID + Certificate don't validate together → Agora "invalid vendor key, can not find appid"; need a matching pair from the same Agora project.**

## Works (verified locally end-to-end)
Admin login (role-based), Requests-in-Matching card UI, propose, parent `/match/:id` select + interview (time input, auto-opens scheduler on select), select-candidates save, final choice, admin schedule/reschedule + copy invitation, real profile pics, persistent login.

## Broken / gaps
- **Nothing is deployed to prod backend** → all new pages are empty on the live site until backend PRs deploy + `php artisan migrate`. This is THE blocker.
- Zoom not configured locally (handled: `createZoomMeeting` is now non-fatal, returns `[]`). Stripe not configured → `getUser` (`/auth/user`) 500s locally (harmless; persistence keeps admin in).
- `getUser` calls Stripe `PaymentMethod::all` — 500 if user has no `stripe_customer_id`.
- Frontend `MatchPicksModal.tsx` is now DEAD (replaced by inline `MatchPicksContent`) — delete on commit.
- `InterviewScheduler` duplicated (shared file + inline copy still in `MatchSelectionView`) — dedupe.

## Local dev run
- Backend: `cd ~/ponctual_tourist_laravel && php artisan serve --port=8000` (SQLite, `.env` set, `database/database.sqlite`). Seeder: `php artisan db:seed --class=LocalTestSeeder` (admin `ponctuel@bloom-buddies.fr`/`password`, family Jane Doe req#1 `quote_status=1`).
- Frontend `.env` currently points `VITE_API_BASE_URL=http://localhost:8000/api` (**restore to prod URL before deploying FE**). Run via preview/vite.
- Admin token for quick login (paste in console): `localStorage.setItem('auth_token','<from seeder>');localStorage.setItem('auth_role','admin');location.href='/'`

## Git / PRs (stacked branches)
- FE branches off `main`: `feature/booking-matching-overhaul`(P1,PR#17) → `feature/matching-phase2`(PR#18) → `phase3`(PR#19) → `phase4`(PR#20) → `feature/persistent-login`(PR#21).
- BE branches: `feature/manual-payment-proof`(PR#1), `feature/matching-phase1`(PR#2) → `phase2`(PR#3) → `phase4`(PR#4, has parity migration fixes).
- **UNCOMMITTED** — FE on branch `feature/persistent-login`: card redesign of Requests-in-Matching, video scheduler (time input)+auto-open-on-select, admin schedule/reschedule+invite, copy-details-on-row, `LoginScreen` real-error fix, new `InterviewScheduler.tsx`/`MatchPicksContent.tsx`/`utils/requestDetails.ts`. BE on branch `feature/matching-phase4`: `babysitter_pic` parity col, role-based admin login (`AuthController@login`), Zoom-non-fatal (`createZoomMeeting`), `schedule-interview` endpoint, `LocalTestSeeder`, migration parity fixes. **Local `.env`/`database.sqlite` are git-ignored (won't commit).**

## Immediate next steps
1. **Commit** the uncommitted batch (FE + BE), delete dead `MatchPicksModal.tsx`, dedupe `InterviewScheduler`, push, update/open PRs.
2. **Deploy backend** to prod (merge PRs → `git pull` on server → `php artisan migrate` → cache clear). This unblocks everything.
3. Restore FE `.env` `VITE_API_BASE_URL` to prod before FE deploy.
4. Security follow-up (separate): repo `d5da707` history had an RCE backdoor (removed in FE commit `ca9430a` but still in older history) — purge history (`git filter-repo`) + rotate the admin password (shared in old chat) & any tokens.
