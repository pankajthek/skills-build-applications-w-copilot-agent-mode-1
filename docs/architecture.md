# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep React components focused on rendering and user interaction; use the shared API client for all `/api` requests, with visible loading, empty, and error states.
- Logic tier decision: Keep request validation and capability behavior in the Express service layer; routes should remain thin and translate service results into the existing response shapes.
- Data tier decision: Add required Mongoose validation and defaults to the existing models; keep seed operations idempotent and preserve unrelated records.
- Activity tracking approach: Validate submitted IDs and required fields before writing, confirm the referenced user and team exist, then compute points and set `occurredAt` in the service.
- Team management approach: Require a team name, preserve mascot and members, and rely on the model's empty members default when none are submitted.
- Leaderboard approach: Aggregate activity points by team, sort highest total first, and assign 1-based ranks.
- Workout suggestions approach: Find the user by email, use their goal and recent activities to rank matching workouts, and include a short reason; return a deliberate 4xx for an unknown user.

## Suggested implementation order

1. Complete and test the data tier first: implement model validation/defaults and verify the idempotent seed behavior with `npm run test:data --prefix octofit-tracker/backend`.
2. Implement activity and team service behavior using the validated models; verify request validation and persistence with `npm run test:api --prefix octofit-tracker/backend`.
3. Implement the leaderboard aggregation and personalized workout suggestions in the service layer; rerun the API contract tests.
4. Connect each presentation component through the shared API client and implement loading, empty, success, and error states; run `npm test --prefix octofit-tracker/frontend`.
5. Run both build checks and rerun the data, API, and frontend tests to verify the integrated app without changing the documented tier boundaries or port configuration.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
