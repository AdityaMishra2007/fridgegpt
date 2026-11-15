# FridgeGPT 2.0

**Scan it. Cook it. Save it.** A Gemini-powered kitchen assistant built with Next.js App Router, TypeScript, React, Tailwind CSS, Lucide, and the official Google Gen AI SDK. No database or authentication.

## Run locally

Use Node.js 22 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, and fill in your private key:

```env
GEMINI_API_KEY=your_private_key
# Optional model override:
GEMINI_MODEL=gemini-3.6-flash
```

Run `npm run dev` and open **http://127.0.0.1:3000**. Restart the server after changing environment variables. A portable Windows Node runtime is also present locally under `.tools/node-v22.23.5-win-x64` and is ignored by Git.

## Try the full workflow

1. In **My fridge**, upload or drag in a JPG, PNG, or WebP under **3 MB**, then click **Analyze my photo**.
2. Review and confirm detections. Unclear items are flagged uncertain, and every AI detection requires confirmation. Edit names, remove mistakes, or manually add missing foods. A new scan replaces your inventory.
3. Mark ingredients you want to use soon with the leaf icon. This is your preference, not an inferred expiry date.
4. Open **Recipes**. Choose time, cuisine, diet, allergies, and whether extras are allowed. Enable **WasteLess** to prioritize ingredients marked use soon. Generate eight diverse recipes. Use **Show More Recipes** to append four new ideas without replacing the collection. Previous titles are sent to Gemini, and duplicate title variants are rejected on both server and client.
5. Cards show ingredient-match percentages and missing ingredients separately. Open **Recipe details** for prep/cook/total times, servings, exact quantities and units, numbered instructions, substitutions, equipment, approximate per-serving nutrition, and tips. **Let's cook** opens the cooking checklist and timers.
6. In **Mystery basket**, select exactly five confirmed ingredients and create a challenge. All five must be used, with no assumed oil, salt, water, or pantry staples. If a practical recipe cannot meet the constraints, the app explains why. Recipe time, cuisine, dietary, and allergy settings also apply.

Sample inventory and recipes remain explicitly labeled. Gemini failures never silently substitute demo results. Generated cards use decorative illustrations rather than pretending stock photography depicts the generated dish.

## Privacy and safety

- Your API key is used only on the server and excluded from Git. Never prefix it with NEXT_PUBLIC_.
- Upload previews remain in your browser. Clicking Analyze sends the image to the server and Google Gemini. The app does not store photos or responses in a database. Google's API data terms apply.
- Ingredient inventory persists in this browser's localStorage. Generated recipes, preferences, photos, and basket selections reset on reload. Editing ingredients or preferences clears generated results to avoid stale recommendations.
- A photo cannot establish freshness, expiration, hidden contents, or food safety. No exact environmental savings are claimed.
- Dietary and allergy preferences guide generation but cannot guarantee allergen safety. Check labels, derivatives, and cross-contact. Use a thermometer where relevant; timers do not establish doneness.

## Implementation

- `app/api/scan/route.ts`: bounded request body, MIME/file signature checks, Gemini vision, validated JSON detections.
- `app/api/recipes/route.ts`: confirmed-ingredient validation, recipe and challenge generation, server checks for time, cuisine, diet, and exact ingredient constraints.
- `lib/gemini.ts`: official SDK, request timeouts (90 seconds for recipe batches, 45 seconds for scanning, 35 seconds for chef questions), same-origin browser request checks, and safe errors that do not expose credentials or raw provider diagnostics.
- `lib/schemas.ts`: shared Zod validation and structured-output JSON schemas.
- `components/kitchen.tsx`: frontend and cooking mode.

The default model is `gemini-3.6-flash`, documented as supporting image input and structured output. See [Google model documentation](https://aistudio.google.com/docs/models/gemini-3.6-flash) and [structured outputs](https://aistudio.google.com/docs/structured-output).

## Verify

```sh
npm run typecheck
npm run build
npm test
```

Browser tests require the dev server running on port 3000 and Microsoft Edge. They check inventory persistence, filters, cooking mode, timer, mobile width, and invalid API inputs. Live tests are opt-in because they use your Gemini quota:

```powershell
# Fixture: a public, illustrative food photo, not a private fridge photo.
Invoke-WebRequest 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=75' -OutFile '.tools/test-food.jpg'
$env:LIVE_GEMINI='1'
npm test
```

Create `.tools` first if it is not present. Live tests cover photo recognition, confirmation, personalized recipes, cooking, and the exact five-ingredient rule. Live outputs vary; quota, permission, model availability, or network errors can fail these checks.

## Deploy to Vercel

1. Put the project in your own GitHub repository, preserving `.gitignore`. Do not include `.env.local`, `.tools`, logs, or dependency/build folders.
2. In Vercel choose **Add New > Project**, import the repository, and keep the detected **Next.js** framework and default build settings.
3. Add `GEMINI_API_KEY` as a private environment variable for Production and any desired Preview environments. Optionally add `GEMINI_MODEL`.
4. Deploy, open the Vercel URL, and repeat the photo-to-recipe workflow. API routes use Node.js. Recipe batches declare a 120-second maximum duration; scan and chef routes declare 60 seconds. Check that your Vercel plan supports these durations.

Uploads are limited to 3 MB to fit Vercel function payload limits. Google API usage is charged to your project as applicable. This hackathon app has no authentication or durable rate limiting; set provider quotas before public sharing. Vercel account authorization and deployment have not been performed.

## Troubleshooting

- **Authorization error:** check the key in `.env.local`, restart the server, and confirm your Google AI Studio project permissions.
- **Usage limit reached:** wait or check Google API quota and billing.
- **Model unavailable:** set GEMINI_MODEL to a model available to your project.
- **Timed out:** retry with a smaller photo or fewer ingredients.
- **Ingredient constraint error:** Gemini returned a recipe outside your restrictions; it was rejected. Regenerate or adjust constraints.

Food photography: Unsplash, used as illustrative imagery.

## Deeper discovery (A–D)

- Initial generation requests exactly eight recipes; Show More requests only four additional recipes, with a collection limit of 120. No automatic retries or background generation spend API quota. Failed additional requests preserve existing results.
- Meal types cover breakfast, lunch, dinner, snacks, and creative ideas when practical within the constraints. Severe constraints may make a full diverse batch impossible; the app explains that rather than inventing recipes.
- Cook Now means every listed ingredient is confirmed; Almost There means at least 60% matched with no more than two missing ingredients; Creative Ideas contains the remaining recipes. Counts describe ingredient types, not stock quantities.
- Local meal filters and sorting by time, match, or difficulty make no API calls. Sorting applies within the three ingredient groups. WasteLess prioritizes manually marked use-soon ingredients.
- AI Chef is available in Details and Cooking Mode. Suggested prompts fill the question box; only submitting sends a request. The server receives the selected recipe, confirmed inventory, allergy exclusions, pantry preference, basket restrictions, and a bounded conversation history. Closing the dialog cancels the browser request.
- Nutrition is an unverified approximation per serving. Optional substitutions are suggestions and may require shopping; the app never silently treats them as available.
- Recipe batches are structured and validated in full. Wrong counts, malformed JSON, repeated title variants, inconsistent times, and disallowed required ingredients are rejected. Semantic dish duplication is discouraged through prompting; title matching cannot guarantee detection of every renamed variation.
- The optional meal planner/shopping consolidation (Phase E) is deferred. Per-recipe missing ingredient shopping lists remain available.

New files: `components/recipe-dialog.tsx`, `components/recipe-results.tsx`, `components/chef-panel.tsx`, `lib/discovery.ts`, and `app/api/chef/route.ts`.

The browser regression tests cover eight-plus-four append behavior, retention after rate limits/malformed responses, ingredient groups, local sort/meal filters, and the chef's context and error recovery. Live verification during development returned eight complete recipes, four additional unique recipes, and a contextual chef answer.

## Ask AI Chef: recipe-session chat

Open Recipe details or Cooking Mode, then choose **Ask AI Chef**. The dedicated chat matches the existing cream and green design. The four quick prompts are **Find a substitute**, **Make it spicier**, **Explain this step**, and **Can I air fry this?** A prompt fills the input; click **Ask chef** to submit.

Each request sends the selected recipe, confirmed inventory only, selected dietary preference, allergies, pantry/basket restrictions, and (in Cooking Mode) the first unfinished cooking step. The server derives the actual step instruction from the recipe and rejects invalid step indices. Mark a step complete before returning to chat to advance that context. Details mode has no active step, and the chef asks for clarification if necessary.

Conversation remains visible while switching between the three views during the current recipe dialog session. Closing the recipe dialog ends that chat session. Recent turns are sent to Gemini; the full session remains visible locally. New suggestions never edit inventory or the recipe automatically.

Ingredient badges distinguish **In your fridge** from **Suggested purchases**. The server classifies Gemini's mentioned ingredients against confirmed inventory using exact names; unconfirmed or unrecognized foods are never labeled available. Check suggested replacements for allergens and dietary suitability.

Chef request safeguards: 600-character questions, bounded recipe/inventory/history payloads, a 35-second provider timeout, one in-flight request per client, and 12 attempted questions per client per 10-minute window. These are best-effort per-server-instance limits keyed by a hash of the client address; they are not distributed quotas or authentication. Provider quotas still apply. No automatic retries spend additional quota. Gemini credentials remain exclusively in the existing server-side integration.

Validation includes browser checks for both entry points, current-step/diet context, conversation retention, rate-limit errors, inventory/purchase labels, and mobile width; an isolated test verifies concurrency and the 12-request window. Five live cooking questions cover substitution, spice adjustment, step explanation, air frying, and a vegan adaptation with a peanut allergy constraint.

Final QA results and remaining live/manual checks: [QA_REPORT.md](QA_REPORT.md).
