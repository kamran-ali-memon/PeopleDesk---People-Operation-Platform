# PeopleDesk — People operations, made simple

A beginner-friendly full-stack HR application built with Next.js, Tailwind CSS, Express, MongoDB and Mongoose. The app starts with no sample employees or attendance data. Each company registers its own isolated workspace and first Admin account.

## Requirements
- Node.js 20.9+ (recommended)
- MongoDB Atlas or a local MongoDB server
- An AI provider key is optional; core HR flows work without it

## Quick start
1. Install Node.js and make sure MongoDB is reachable.
2. Copy `backend/.env.example` to `backend/.env` and fill in `MONGODB_URI` and a long `JWT_SECRET`. Optional: add `AI_API_KEY` and `AI_BASE_URL` for an OpenAI-compatible chat-completions API.
3. From this root folder run:
   ```bash
   npm i
   npm run dev
   ```
4. Open http://localhost:3000. The first-run setup creates a company workspace and Admin login. Later teams sign up with a company name; PeopleDesk derives its workspace ID automatically.

The root workspace installs all frontend and backend dependencies in one `npm i`. No separate package installation is required.

## Production build
```bash
npm run build
```
Set `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to your deployed frontend/backend URLs. Configure environment variables in your hosting provider; never commit real secrets. Deploy the frontend and backend as separate services from the same repository. The backend start command is `npm run start -w backend`; the frontend start command is `npm run start -w frontend`.

## Roles
- **Admin:** organization setup, user management, company-wide records, payroll finalization, announcements and audit log.
- **HR:** employee operations, attendance board, leave approvals, salary structures and draft payroll.
- **Employee:** own profile, attendance, leave, payslips, notifications and scoped AI assistant.

All business data is isolated by company and role. Protected queries receive a tenant scope from the verified session; unknown or unassigned records fail closed. Existing single-company records are associated with a migrated workspace at backend startup. Passwords are hashed, JWTs are used for API authentication, and payroll finalization locks a payroll run.

## Important configuration
See `backend/.env.example`. A header-only CSV template is provided at `templates/employees-import-template.csv`. `AI_API_KEY` is optional. When absent or unavailable, AI endpoints return a friendly fallback and core features continue to work. An OpenAI-compatible provider should be configured through `AI_BASE_URL` and `AI_MODEL`.

## Current implementation notes
- Web camera/geofence attendance and face recognition are optional bonus features in the challenge brief and are not represented as completed features in this build.
- Tax calculations follow the illustrative slabs in the brief. Have payroll/tax results reviewed for the applicable jurisdiction before real-world use.
- Run `npm run build` before deployment. For an existing database, take a backup before the first startup after upgrading: the backend migrates legacy records into a single PeopleDesk workspace, replaces old global unique indexes with company-scoped indexes, and refuses to start if records remain unassigned. Test signup, sign-in and all three roles with separate workspaces.


## PeopleDesk workspace and UI
- Company name and logo appear in the signed-in workspace; Admins manage them in Organization settings.
- The interface supports light and dark themes, responsive navigation and tables, role selection at sign-in, and toast/modal feedback for actions.
- Sign-in uses the selected role and credentials. Workspace IDs are generated from company names; user email addresses may repeat across separate companies.
- The first database connection runs the tenant migration and creates scoped indexes. Back up existing data before deploying this version. Do not point a local development server at a production database.
