# Lantern

Real-time chat app. Native Android via Expo (React Native), separate user and admin apps, Supabase backend (auth, Postgres, realtime).

- `supabase/001_core.sql`: schema, RLS, admin functions.
- `user-app/`, `admin-app/`: Expo projects. CI runs `expo prebuild --platform android` then Gradle (no EAS, no Expo account or token).
- Only the public Supabase publishable key is in config. No secrets in this repo.

Not end-to-end encrypted; admins can see reported content. Username+password sign-up uses a synthetic email on users.lantern.example; no password recovery in v1. Preview APKs use the standard debug signing key.
