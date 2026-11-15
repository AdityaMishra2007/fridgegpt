import { z } from 'zod';

const text = z.string().trim().min(1).max(120);
export const categories = ['Produce', 'Dairy & eggs', 'Pantry', 'Other'] as const;
export const ingredientSchema = z.object({
  id: text, name: text, category: z.enum(categories), confirmed: z.boolean(), soon: z.boolean(),
  source:z.enum(['demo','photo','manual']).optional(),
});
export const scanSchema = z.object({
  ingredients: z.array(z.object({name: text, category: z.enum(categories), certainty: z.enum(['likely', 'uncertain']), note: z.string().max(300)})).max(50),
  message: z.string().max(600),
});
export const requestSchema = z.object({
  ingredients: z.array(ingredientSchema).min(1).max(50),
  time: z.number().int().min(5).max(120),
  cuisine: z.enum(['Any cuisine', 'Mediterranean', 'European', 'Asian', 'Mexican', 'Indian']),
  diet: z.enum(['Any diet', 'Vegetarian', 'Vegan', 'Gluten-free']),
  extras: z.boolean(), waste: z.boolean(), allergies: z.string().trim().max(300),
  challenge: z.boolean(),
  count: z.union([z.literal(4), z.literal(8)]).default(8),
  previousNames: z.array(text).max(120).default([]),
});
export const aiRecipeSchema = z.object({
  title: text, description: z.string().min(1).max(500), time: z.number().int().min(1).max(120),
  difficulty: z.enum(['Easy', 'Medium', 'Advanced']), cuisine: text,
  prepTime: z.number().int().min(0).max(120), cookTime: z.number().int().min(0).max(120),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Creative']), servings: z.number().int().min(1).max(12),
  diet: z.enum(['Any diet', 'Vegetarian', 'Vegan', 'Gluten-free']),
  ingredients: z.array(z.object({name: text, quantity: text, unit: text})).min(1).max(25),
  steps: z.array(z.string().min(1).max(1200)).min(1).max(15),
  safety: z.string().min(1).max(1200),
  substitutions: z.array(z.object({ingredient: text, replacement: text, note: z.string().min(1).max(400)})).max(5),
  equipment: z.array(text).min(1).max(12),
  nutrition: z.object({calories: z.number().min(0).max(5000), protein: z.number().min(0).max(500), carbs: z.number().min(0).max(1000), fat: z.number().min(0).max(500)}),
  tips: z.array(z.string().min(1).max(500)).min(1).max(5),
});
export const recipeResponseSchema = z.object({
  possible: z.boolean(), message: z.string().max(1000), recipes: z.array(aiRecipeSchema).max(8),
});
export const normalize = (s: string) => s.trim().toLocaleLowerCase('en-US');
export const recipeKey = (s: string) => normalize(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

// Legacy demo recipes have fewer fields; retain their working cooking experience.
export const chefRecipeSchema = aiRecipeSchema.partial().extend({
  title: text, description: z.string().min(1).max(500), time: z.number().int().min(1).max(120),
  ingredients: z.array(z.object({name:text,quantity:text,unit:z.string().max(120).optional()})).min(1).max(25),
  steps: z.array(z.string().min(1).max(1200)).min(1).max(15),
});
export const chefRequestSchema = z.object({
  recipe: chefRecipeSchema, ingredients: z.array(ingredientSchema).max(50),
  question: z.string().trim().min(1).max(600), allergies:z.string().max(300),
  extras:z.boolean(), strictBasket:z.boolean(),
  diet:z.enum(['Any diet','Vegetarian','Vegan','Gluten-free']).default('Any diet'),
  currentStep:z.number().int().min(0).max(14).nullable().default(null),
  history: z.array(z.object({role:z.enum(['user','assistant']),text:z.string().min(1).max(3500)})).max(6),
});
export const chefDraftSchema = z.object({answer:z.string().min(1).max(3500),ingredientsMentioned:z.array(text).max(20)});
export const chefResponseSchema = z.object({answer:z.string().min(1).max(3500),availableIngredients:z.array(text).max(20),suggestedPurchases:z.array(text).max(20)});
