# Game development and publication

The user wants completed Codex changes automatically reflected on the live game.

- Work in this repository and preserve existing gameplay unless the task requests a change.
- After completing a requested code change, run `npm test` and `npm run build`.
- When both pass, commit the completed changes and push to `origin/main`; the connected Vercel project deploys pushes to `main` automatically.
- Do not publish partial work, failing checks, credentials, `.env` files, local diagnostics, or generated build output.
- Respect any request to keep a change local, use another branch, or skip deployment.
- Include the live URL and any deployment failure in the final response.

Production: https://spacefrontier.vercel.app

