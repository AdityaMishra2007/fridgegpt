import { AppError, apiError, generate, readBody, sameOrigin } from '@/lib/gemini';
import { normalize, recipeKey, recipeResponseSchema, requestSchema } from '@/lib/schemas';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = requestSchema.parse(JSON.parse((await readBody(request, 48000)).toString('utf8')));
    if (input.ingredients.some(i=>!i.confirmed)) throw new AppError(400, 'Confirm all ingredients you want to use first.');
    const names = new Set(input.ingredients.map(i=>normalize(i.name)));
    if (names.size !== input.ingredients.length) throw new AppError(400, 'Remove duplicate ingredient names before generating.');
    if (input.challenge && names.size !== 5) throw new AppError(400, 'Choose exactly five different confirmed ingredients.');
    const count = input.challenge ? 1 : input.count;
    const result = await generate(recipeResponseSchema, `Create ${input.challenge?'one practical mystery basket recipe using ALL five selected ingredients':`${count} distinct practical recipes for two servings`}. User data: ${JSON.stringify(input)}.
    Do not repeat ANY previousNames, including punctuation variants or the same dish with a cosmetic rename. Each new dish must use a different cooking technique, format, or main ingredient combination. ${!input.challenge && count===8?'Include Breakfast, Lunch, Dinner, Snack, and Creative meal types, with diverse practical ideas.':'Vary meal types where practical.'}
    Provide total time in time, prepTime, and cookTime as minutes, with time=prepTime+cookTime. Include actual servings, difficulty, cuisine, mealType, exact ingredient quantities (quantity as a numerical string or fraction) and explicit unit (g, ml, cup, tbsp, tsp, count etc). Give detailed sequential cooking steps with heat settings, durations, and doneness cues; each step must be a complete useful instruction. Include required equipment, 1-3 useful cooking tips, sensible optional substitutions with notes about availability and allergy/diet suitability, and APPROXIMATE per-serving nutrition: calories in kcal, protein/carbs/fat in grams. Nutrition is an estimate, never a precise or verified claim. Optional substitutions must never appear as required recipe ingredients or instructions; for a mystery basket return substitutions=[] to preserve its strict rules.
    Every recipe must respect the maximum total cooking time, cuisine (use exact selected cuisine string unless Any cuisine), diet (use exact selected diet string unless Any diet), and allergy exclusions including derivatives. When waste=true prioritize soon=true ingredients. Use ingredient names exactly as listed in inventory when using an available ingredient; list every food used in instructions with explicit quantity in ingredients. Never assume oil, salt, spices, butter or pantry staples are available. ${input.challenge?'Use ONLY the five ingredients; no additional food, oil, salt, water, or garnishes, even if extras=true. All five must appear in ingredients. Cooking equipment and heat are allowed.':input.extras?'Additional ingredients are allowed but keep shopping minimal.':'Use ONLY the inventory ingredients, with no unlisted oil, salt, water, spices or garnishes.'}
    If you cannot create the requested number of distinct practical recipes within the constraints, set possible=false, give a specific explanation, and return recipes=[]. Never fabricate a feasible dish. If possible=true return exactly ${count} recipes. Use conservative, practical cooking times. Include appropriate safe handling guidance and thermometer temperatures where relevant in safety; avoid unsafe raw meat, fish, flour, or eggs. Do not claim allergy safety. Do not infer stock quantities. Do not include image URLs. Keep prose concise enough to finish the entire batch.`, undefined, {timeout:90000,tokens:24000});
    if (!result.possible) return Response.json({...result, message: result.message || 'A practical recipe could not be made within these ingredient and preference constraints. Try changing your basket or preferences.', recipes: []});
    const validCount = count;
    if (result.recipes.length !== validCount) throw new AppError(502, 'Gemini didn’t finish all the recipes. Please try again.');
    for (const recipe of result.recipes) {
      if (recipe.time !== recipe.prepTime + recipe.cookTime) throw new AppError(502, 'A recipe has inconsistent timing. Please try again.');
      if (recipe.time > input.time || (input.cuisine !== 'Any cuisine' && recipe.cuisine !== input.cuisine) || (input.diet !== 'Any diet' && recipe.diet !== input.diet)) throw new AppError(502, 'Gemini returned a recipe outside your preferences. Please try again.');
      if ((input.challenge || !input.extras) && recipe.ingredients.some(i=>!names.has(normalize(i.name)))) throw new AppError(502, 'Gemini added an ingredient you didn’t allow. Please try again.');
      if (input.challenge && (new Set(recipe.ingredients.map(i=>normalize(i.name))).size !== 5 || [...names].some(n=>!recipe.ingredients.some(i=>normalize(i.name)===n)))) throw new AppError(502, 'Gemini didn’t use all five basket ingredients. Please try again.');
    }
    const keys = result.recipes.map(r=>recipeKey(r.title));
    const previous = new Set(input.previousNames.map(recipeKey));
    if (new Set(keys).size !== keys.length || keys.some(k=>previous.has(k))) throw new AppError(502, 'Gemini repeated a recipe. Your existing recipes are safe; try Show More again for fresh ideas.');
    return Response.json(result);
  } catch(error) { return apiError(error); }
}
