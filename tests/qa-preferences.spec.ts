import {test,expect} from '@playwright/test';
test('diet, cuisine, time and WasteLess preferences reach the API and display consistently',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('button',{name:'Use Tomatoes soon',exact:true}).click();await page.getByRole('button',{name:'Recipes',exact:true}).click();
  await page.getByLabel('Cuisine').selectOption('Indian');await page.getByLabel('Dietary preference').selectOption('Vegan');await page.getByLabel('Cooking time').selectOption('20');await page.getByLabel('WasteLess').check();
  await page.route('**/api/recipes',async route=>{
    const data=route.request().postDataJSON();expect(data.diet).toBe('Vegan');expect(data.cuisine).toBe('Indian');expect(data.time).toBe(20);expect(data.waste).toBe(true);expect(data.ingredients.find((i:{name:string})=>i.name==='Tomatoes').soon).toBe(true);
    await route.fulfill({json:{possible:true,message:'Ready',recipes:Array.from({length:8},(_,i)=>({title:`Tomato chickpea idea ${i}`,description:'A vegan test recipe.',time:20,prepTime:5,cookTime:15,servings:2,cuisine:'Indian',diet:'Vegan',difficulty:'Easy',mealType:'Dinner',ingredients:[{name:'Tomatoes',quantity:'2',unit:'count'},{name:'Chickpeas',quantity:'200',unit:'g'}],steps:['Wash and dice tomatoes.','Simmer tomatoes and chickpeas for 15 minutes until hot.'],equipment:['Skillet'],nutrition:{calories:200,protein:10,carbs:35,fat:2},tips:['Stir occasionally.'],substitutions:[],safety:'Wash produce.'}))}})
  });
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();await expect(page.locator('.recipe-card')).toHaveCount(8);await expect(page.locator('.recipe-card').first()).toContainText('Vegan');await expect(page.locator('.recipe-card').first()).toContainText('Chickpeas');
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
  await page.setViewportSize({width:320,height:740});await page.screenshot({path:'.tools/qa-populated-mobile.png',fullPage:true});
  await page.locator('.recipe-card').first().getByRole('button',{name:'Recipe details'}).click();await expect(page.getByRole('dialog')).toContainText('200 g');await expect(page.getByRole('dialog').locator('.shopping-note')).toContainText('Chickpeas');await page.getByRole('button',{name:'Close cooking mode'}).click();
  await page.getByLabel('Cuisine').selectOption('European');await expect(page.locator('.recipe-card')).toHaveCount(0);await expect(page.getByText('SAMPLE RECIPES · These are inspiration, not personalized results.')).toBeVisible();
});

test('delayed generation is not applied after preferences change',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);await page.getByRole('button',{name:'Recipes',exact:true}).click();
  let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r});
  await page.route('**/api/recipes',async route=>{await gate;await route.fulfill({json:{possible:false,message:'Old request result',recipes:[]}})});
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();await expect(page.getByRole('button',{name:'Creating your recipes…'})).toBeDisabled();await page.getByLabel('Dietary preference').selectOption('Vegan');release();
  await expect(page.getByText('Your ingredients or preferences changed. Generate again to use the latest settings.')).toBeVisible();await expect(page.getByText('Old request result')).toHaveCount(0);
});
