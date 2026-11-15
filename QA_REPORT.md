# FridgeGPT final QA — November 14, 2026

## Result

The application builds and type-checks successfully. All offline/browser checks pass after three small reliability fixes. **Fresh end-to-end Gemini certification is incomplete because the provider returned HTTP 429 (usage limit).** No further provider calls were attempted after that response.

The final full regression run passed 20 tests with three opt-in live tests skipped. A subsequently added WasteLess ranking case also passed in its targeted run: **21 distinct automated checks passed in total**. Live success from earlier development sessions is not counted as fresh verification in this report.

Environment: local Windows, Next.js App Router, TypeScript, headless Microsoft Edge; app at http://127.0.0.1:3000.

## Confirmed bugs fixed

1. **Malformed scan responses could replace an existing valid inventory.** The browser now validates the complete response against `scanSchema` before changing inventory. The regression test verifies that invalid data produces a readable error and leaves six existing ingredients intact.
2. **Demo ingredient provenance was not persistent.** Ingredient source (`demo`, `photo`, or `manual`) is now retained through browser storage. Any inventory containing sample ingredients visibly states that they are demo data, not photo detections, including after reload. Existing recipe demo labels remain intact.
3. **Whitespace caused conflicting ingredient availability.** The no-extras filter now uses the same trimmed, case-insensitive availability calculation as the recipe cards and groups. Editing `Tomatoes` to ` Tomatoes ` no longer hides otherwise matching recipes.

The existing design, Gemini architecture, recipe features, timers, and chef session behavior were preserved.

## Journey coverage

| Area | Result and evidence |
| --- | --- |
| Upload a refrigerator photo | Passed with a real public refrigerator photograph. Invalid types, fake signatures, malformed multipart requests, and oversized uploads also receive errors. |
| Gemini recognition | Early live attempts returned HTTP 200 with visible-food detections; the UI kept every detection unconfirmed. A subsequent live attempt returned HTTP 429. This is one fixture, not an accuracy benchmark. |
| Confirm/add/remove/edit inventory | Passed in the live early stages and browser regression checks. Includes browser persistence and trimmed-name matching. |
| Eight personalized recipes | Browser request/count/rendering checks pass using controlled responses. A fresh live batch was blocked by provider quota. |
| Four additional recipes | Append-only behavior, previous-title context, preservation of the first eight, rejection of duplicate titles, and retention after errors pass using controlled responses. Fresh generation remains blocked. |
| Cuisine/diet/time | Indian + Vegan + 20-minute settings reach the API correctly and display consistently with controlled responses. Invalid preferences are rejected before model calls. Changing preferences discards delayed stale results. Actual new Gemini dietary content needs rechecking after quota resets. |
| Details and measurements | Units, quantities, prep/cook/total timing, numbered instructions, equipment, substitutions, approximate nutrition labeling, and missing-ingredient shopping lists render correctly. This does not verify culinary quantities or nutritional accuracy. |
| Cooking Mode | Checkboxes, progress, keyboard close, and switching views pass. |
| Timers | Simulated browser clock verifies countdown, pause, resume, completion, disabled restart at zero, and reset. Background-tab/device timing remains a manual check. |
| WasteLess | Use-soon preference reaches the API. Ranking prioritizes marked confirmed ingredients and ignores unconfirmed ones. No expiry dates or exact savings are invented by the application. |
| Mystery Basket | Exactly-five selection, disabling a sixth selection, invalid/unconfirmed input rejection, and a clear impossible-result state pass. Fresh successful Gemini generation is blocked by quota. |
| AI Chef | Context includes recipe, confirmed inventory, diet, allergies, current step, and bounded conversation history. Quick prompts wait for submission; chat survives view changes; availability/purchase labels and error recovery pass. New live answers were not obtained during this QA pass. |

## Resilience and mobile checks

- Empty inventories disable recipe generation and show clearly labeled sample inspiration.
- Malformed scan/recipe data produces errors without inventing replacement results.
- Appending after rate limits or duplicate/malformed responses preserves the collection.
- Loading buttons disable repeated submission; delayed generation is ignored after preferences change.
- Provider 429, timeout, authorization, and incomplete-response errors are mapped to readable messages without raw provider diagnostics.
- Chef concurrency and 12-requests-per-10-minute limits pass isolated checks. These remain best-effort per-instance limits, not distributed quotas.
- Populated recipe screens fit 320, 390, and 768 px widths. Home, inventory, basket navigation, recipe dialogs, and chef views receive additional mobile checks. The populated mobile screenshot was visually reviewed.
- The real provider usage-limit response was surfaced clearly. Quota was not deliberately exhausted to test this.

## API key security

- The configured key was checked without printing its value.
- It was absent from 11 browser build artifacts and the homepage HTML.
- Google SDK calls and credential reads remain in server-side code.
- `.env*` is excluded by `.gitignore`; `.env.local` is excluded from direct Vercel uploads.
- No key or credential was added to reports, fixtures, browser state, or test output.

This is a targeted application QA check, not a penetration test or a guarantee against all security issues. The hackathon app still has no authentication or durable request limits for public sharing.

## Commands executed

```sh
npm run build
npm run typecheck
npm test
```

Additional targeted checks covered new edge cases, provider errors, and WasteLess ranking. Controlled-response tests do not call Google. The live QA attempt is deliberately separate and failed on an actual provider HTTP 429; it is not included in the passing offline count.

## Remaining manual/live checks

1. When Google quota is available, rerun the complete live journey. It covers a fridge scan, inventory edits, eight recipes, four new recipes, alternate cuisine/diet/time preferences, cooking, chef questions, and a strict five-ingredient basket.
2. Review Gemini's actual dietary exclusions and substitutions, including derivatives and cross-contact. A diet label and automated ingredient checks cannot establish allergy safety.
3. Try several personal fridge photographs with poor lighting, occlusion, ambiguous packaging, and empty shelves; confirm or reject detections manually.
4. Cook selected recipes to assess quantities, practicality, taste, and timing. Nutrition remains explicitly approximate and unverified.
5. Test on a physical phone, particularly camera/HEIC handling (the supported uploads are JPG/PNG/WebP), screen locking, background timers, and keyboard/screen-reader navigation.
6. Repeat the live workflow on Vercel after deployment; local checks cannot verify hosting environment variables, quotas, function duration, or device network behavior.

To rerun the live journey on this machine (server running on port 3000):

```powershell
$env:FINAL_QA_LIVE='1'
& '.\.tools\node-v22.23.5-win-x64\node.exe' node_modules/@playwright/test/cli.js test tests/qa-live.spec.ts
```

Fixture path: `.tools/qa-fridge.jpg`. It is excluded from Git and deployment. [Photograph source: Real Homes](https://www.realhomes.com/advice/things-people-with-organized-refrigerators-never-do), downloaded only for local QA. Obtain permission before redistributing that photograph.

Detailed live-attempt diagnostics and screenshots are local ignored artifacts under `.tools/`; they do not contain the API key. The latest live-attempt record reports the quota failure rather than a false pass.
