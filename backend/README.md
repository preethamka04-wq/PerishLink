# PerishLink backend

## Local setup

1. Create a MySQL database named `perishlink` (or set `DB_NAME` to an existing database).
2. Copy `.env.example` to `.env` and set the MySQL connection values. Set `AUTH_TOKEN_SECRET` to a private random value of at least 32 characters.
3. From this folder, run `npm install` once and then `npm run dev`.
4. In a second terminal, run `npm run dev` from the project root. Vite forwards `/api` requests to the backend on port 5000.

The backend creates its `users` and `food_listings` tables on startup. It exposes `POST /api/auth/register` and `POST /api/auth/login`; successful responses include a signed, seven-day token and a public user profile. Passwords are stored as salted scrypt hashes.

Authenticated requests send `Authorization: Bearer <token>`. `GET /api/listings` returns unexpired available offers. `POST /api/listings` creates an offer with food name, quantity and unit, pickup location and deadline, storage instructions, allergen information, and optional notes.
