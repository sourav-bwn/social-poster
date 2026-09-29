# Social poster

This public, approval-first project prepares drafts about Sourav's public projects. GitHub Actions runs Monday, Wednesday and Friday at 08:00 UTC (about 13:30 IST, with possible GitHub scheduling delays). It asks Gemini for draft captions, commits the draft to `pending/<draft_id>/`, and opens a review issue. It does **not** publish, and it does not send a WhatsApp message. A separate review relay must be operational to show Sourav the text and images and get his approval for the final package. Publication is a separate, manual action on Sourav's personal LinkedIn profile.

## Setup and status

- The sample AttendEase draft is a manual example, not a Gemini result or published post.
- `GEMINI_API_KEY` is required as a GitHub Actions secret. Generation fails closed if the key or API is unavailable. Check Google's current free-tier quota before use.
- GitHub Actions needs permission to commit drafts and create issues. The GitHub issue itself is not a notification to Sourav unless a separate relay is in place.
- Instagram and automatic LinkedIn publishing are on hold. No LinkedIn Page or developer app is required for this generate-only flow. There is no publishing command in this repository.
- This repository and its drafts are public. Only add projects whose facts and image contents are safe for public view.

## Image policy

For the Student Management System, the repo includes three reviewed screenshots from its public demo with sample data. A generated draft copies those to its pending folder in dashboard, students, courses order. They must still be reviewed with the caption before posting. Other catalog projects have no verified screenshots yet: their draft JSON marks the image as missing. Do not replace a missing screenshot with a typographic card or pretend that an image exists. Capture and visually review a real app view before presenting a final post.

## Development

Node 22+; no npm dependencies. Run `npm test`. `node src/cli.mjs generate --sample` makes another manual sample draft locally. To generate a Gemini draft, use the configured Actions workflow or set `GEMINI_API_KEY` locally without committing it. The catalog is restricted to verified public projects; check its source again before new claims or screenshots are published. Generated copy is a draft, not a fact check or a publishing approval.
