# Social poster

An approval-first, no-paid-image-API bot for Sourav's public project portfolio. GitHub Actions prepares LinkedIn and Instagram captions with Gemini and renders a 1080px PNG card in headless Chrome. **It never publishes on the schedule.** Each draft is publicly visible under `pending/<draft_id>/post.json` and `card.png` in this public repository. Never put private project details or secrets in the catalog or drafts.

## Status

The first draft is a **manual example**, not generated with Gemini and not posted. Its source is the public AttendEase README. Review its captions and PNG before any publication. GitHub Actions generation needs a Gemini key, and publishing needs independently set-up LinkedIn and Instagram developer credentials. No accounts are connected by this repository alone. All integrations can have quota or approval restrictions: check the live free-tier limits and app access before enabling them; a free GitHub repo does not guarantee all external API access.

## Setup

1. Set GitHub Actions repository secret `GEMINI_API_KEY` from Google's free-tier project. Do not commit it. The scheduled job will fail closed with no key, rather than fabricate AI text. Check the current Gemini pricing and quotas before enabling scheduling.
2. Enable Actions and permit `GITHUB_TOKEN` **read/write** for this repository if required by your GitHub repo settings, so it can commit pending drafts and create review issues. Keep the repository public, since Instagram's API requires a public image URL. Schedule is Monday, Wednesday, Friday at 08:00 UTC (13:30 IST, subject to GitHub scheduling delay). Scheduled draft generation is inactive until the workflow and Gemini key are set.
3. Arrange an owner-controlled review notification for the new GitHub issue or draft. The workflow creates a GitHub issue for each draft; it **does not send WhatsApp messages**. Someone must relay the exact draft to Sourav and record his approval of the final text and card before triggering Publish.
4. For LinkedIn, create an app with the permission needed for member posting, get a member token and person URN, and set secrets `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN`. App access and token refresh are separate setup; tokens expire. LinkedIn API version defaults to `202609` (override with `LINKEDIN_VERSION` if required). See [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) and [Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api).
5. For Instagram, use an eligible professional account and Meta developer app with publishing permission. Set secrets `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID`; token expiry/refresh is separate setup. The current Graph API version defaults to `v23.0` (override with `META_API_VERSION` if required). Meta downloads `card.png` from the public repo for container creation. See [Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/). Check the current account type, required connected Page, permissions and app review for your chosen login flow.

## Review and publish

Open Actions > "Social poster - approval first" > Run workflow. For an extra draft choose `generate`. For a reviewed draft choose `publish`, enter the **exact** pending folder ID, select `both` or one platform, and mark `approval_confirmed=yes` **only after Sourav has reviewed the final captions and image together**. That dispatch checkbox is a process reminder, not proof of his authorization. Publishing fails closed without tokens. Once a platform succeeds, the workflow records its post ID in `post.json`. If an API times out after receiving a publish request, **check the platform manually before retrying**, because it may already be live. Never run two publish dispatches concurrently. GitHub Actions serializes workflow runs with a concurrency group, but manual authorization is still required.

The pending directory is a transparent audit trail, not a private approval inbox. A public draft may be modified by a repo writer; review what is on `main` immediately before dispatch. Better safeguards (e.g. protected environments and approval records) are required before scaling this beyond a single owner-operated repo.

## Development

Node 22+, Chrome/Chromium installed. No npm packages and no paid API needed for cards. `npm test`; `CHROME_BIN=/usr/bin/google-chrome-stable node src/cli.mjs generate --sample` creates a **manual example**, and `GEMINI_API_KEY=... npm run generate` calls Gemini. Sample generation produces a new draft directory each time. The catalog in `projects/catalog.json` is deliberately limited to publicly verifiable projects. Add another only after verifying its claims from the live public repo. Do not add any private repo's source or unverified achievements.
