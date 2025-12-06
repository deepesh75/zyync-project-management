# Project Management App (Starter)

This is a minimal TypeScript Next.js starter with Prisma for building a project management app. The local database is configured to use SQLite for quick setup; switching to Postgres for production is supported in the `prisma/schema.prisma` and `.env`.

Quick start

```bash
cd "$(pwd)"
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
Seed data

Run the seed script after migrating to create sample users, a project and tasks:

```bash
npm run seed
```

Deployment

This project is built with Next.js and can be deployed quickly to Vercel (recommended) or container platforms using the included `Dockerfile`.

Production database

- For production, switch Prisma to Postgres (recommended). Update `.env` with a Postgres URL, for example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
NEXTAUTH_SECRET="a-long-random-secret"
```

- Run migrations in production using:

```bash
npx prisma migrate deploy
npx prisma generate
```

Vercel (recommended)

1. Push your repo to GitHub.
2. In Vercel, create a new project and import the GitHub repo.
3. Add environment variables in the Vercel dashboard (`DATABASE_URL`, `NEXTAUTH_SECRET`, and any other secrets).
4. Build & Output settings: default Next.js settings work fine. Vercel will run the `build` script.

CLI deploy (alternative)

Install the Vercel CLI and link the project:

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

Docker (self-hosting)

You can use the included `Dockerfile` to build an image and run the app behind a web server. Example build:

```bash
docker build -t pm-app:latest .
docker run -e DATABASE_URL='<your-prod-db>' -e NEXTAUTH_SECRET='<secret>' -p 3000:3000 pm-app:latest
```

Notes

- Secure `NEXTAUTH_SECRET` and the database credentials — do not commit secrets to the repo.
- For Postgres in Vercel, use an external DB provider (Supabase, Neon, RDS, etc.).
- If you switch from SQLite -> Postgres, you may need to re-run migrations and re-seed any sample data.

Next steps for production parity

- Add persisted sessions (NextAuth adapter) for advanced session management.
- Add monitoring and logging (Sentry / LogDNA) and configure backups for the DB.
- Configure CI to run migrations or deploy only on merge to `main`.

CI/CD (Vercel automated deploy)

This repo includes a GitHub Actions workflow to deploy to Vercel when changes are pushed to `main`.

1. Create a Vercel project and get the following values from the Vercel dashboard:
	- `VERCEL_TOKEN` (Account token)
	- `VERCEL_ORG_ID`
	- `VERCEL_PROJECT_ID`
2. In your GitHub repository, go to `Settings -> Secrets & variables -> Actions` and add the three secrets above.
3. Merge code to `main` and GitHub Actions will automatically build and deploy to Vercel.

If you prefer to keep deployments manual, set `prod: false` in `.github/workflows/deploy-vercel.yml` or remove the workflow.

API endpoints

- `GET /api/health` — health check
- `GET /api/projects` — list projects
- `POST /api/projects` — create project (JSON body: `{ "name": "My Project" }`)

Next steps

- Add authentication (NextAuth or custom)
- Expand models (Tasks, Comments, Users, Labels)
- Add frontend UI and pages
- Replace SQLite with Postgres for production
