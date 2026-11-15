import {test,expect} from '@playwright/test';

function recipe(index:number){return {
  title:`Garden idea ${index}`,description:'A practical meal for your ingredients.',time:20,prepTime:5,cookTime:15,
  servings:2,cuisine:'European',diet:'Vegetarian',difficulty:'Easy',mealType:['Breakfast','Lunch','Dinner','Snack','Creative'][index%5],
  ingredients:[{name:'Tomatoes',quantity:'2',unit:'count'},{name:'Eggs',quantity:'2',unit:'count'}],
  steps:['Wash and chop the tomatoes.','Cook tomatoes over medium heat for 5 minutes, then add eggs and cook until firm.'],
  substitutions:[{ingredient:'Tomatoes',replacement:'Bell pepper',note:'Cook until softened. Check availability.'}],
  equipment:['Skillet','Knife'],nutrition:{calories:200,protein:12,carbs:10,fat:13},tips:['Use medium heat.'],safety:'Cook eggs until whites and yolks are firm.',
}}

test('eight recipes, four appended, error recovery, and detailed cooking',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('button',{name:'Recipes',exact:true}).click();
  let calls=0;
  await page.route('**/api/recipes',async route=>{
    const data=route.request().postDataJSON();calls++;
    if(calls===1){expect(data.count).toBe(8);expect(data.previousNames).toEqual([])}
    if(calls===2){expect(data.count).toBe(4);expect(data.previousNames).toHaveLength(8)}
    if(calls===3){await route.fulfill({status:429,json:{error:'Geminiâ€™s usage limit was reached. Please wait.'}});return}
    const start=calls===1?0:8;const count=calls===1?8:4;
    await route.fulfill({json:{possible:true,message:'Fresh ideas ready.',recipes:Array.from({length:count},(_,i)=>recipe(start+i))}});
  });
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();
  await expect(page.locator('.recipe-card')).toHaveCount(8);
  await page.getByRole('button',{name:'Show More Recipes'}).click();
  await expect(page.locator('.recipe-card')).toHaveCount(12);
  await expect(page.getByRole('heading',{name:'Garden idea 0',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Show More Recipes'}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('usage limit');
  await expect(page.locator('.recipe-card')).toHaveCount(12);
  await page.locator('.recipe-card').first().getByRole('button',{name:'Recipe details'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('5 min prep');await expect(dialog).toContainText('15 min cook');
  await expect(dialog).toContainText('Approximate nutrition');await expect(dialog).toContainText('Suggested substitutions');
  await expect(dialog).toContainText('Equipment');await expect(dialog).toContainText('2 count');
  await dialog.getByRole('button',{name:'Cooking mode',exact:true}).click();
  await dialog.getByRole('checkbox').first().check();
  await expect(dialog).toContainText('1 of 2 steps complete');
  await page.screenshot({path:'.tools/preview-details-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:'.tools/preview-details-mobile.png'});
});

test('malformed additional results keep the existing collection',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('button',{name:'Recipes',exact:true}).click();let calls=0;
  await page.route('**/api/recipes',route=>route.fulfill({json:++calls===1?{possible:true,message:'Ready',recipes:Array.from({length:8},(_,i)=>recipe(i))}:calls===2?{possible:true,recipes:[{title:'broken'}]}:{possible:true,message:'Ready',recipes:[recipe(0),recipe(9),recipe(10),recipe(11)]}}));
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();await expect(page.locator('.recipe-card')).toHaveCount(8);
  await page.getByRole('button',{name:'Show More Recipes'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('incomplete');
  await expect(page.locator('.recipe-card')).toHaveCount(8);
  await page.getByRole('button',{name:'Show More Recipes'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('duplicate');
  await expect(page.locator('.recipe-card')).toHaveCount(8);
});

test('ingredient groups, local sorting, and meal filters do not call Gemini again',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('button',{name:'Recipes',exact:true}).click();let calls=0;
  const items=Array.from({length:8},(_,i)=>recipe(i));
  items[0].time=30;items[0].cookTime=25;items[1].time=10;items[1].cookTime=5;
  items[2].ingredients.push({name:'Rice',quantity:'100',unit:'g'});
  items[3].ingredients=[{name:'Rice',quantity:'100',unit:'g'},{name:'Lentils',quantity:'100',unit:'g'},{name:'Coconut milk',quantity:'100',unit:'ml'}];
  await page.route('**/api/recipes',async route=>{calls++;await route.fulfill({json:{possible:true,message:'Ready',recipes:items}})});
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();
  await expect(page.getByRole('region',{name:'Cook Now'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Almost There'})).toContainText('67% match');
  await expect(page.getByRole('region',{name:'Creative Ideas'})).toContainText('0% match');
  await page.getByLabel('Sort recipes').selectOption('time');
  await expect(page.getByRole('region',{name:'Cook Now'}).locator('.recipe-card').first()).toContainText('Garden idea 1');
  await page.getByRole('button',{name:'Breakfast',exact:true}).click();
  await expect(page.locator('.recipe-card')).toHaveCount(2);
  expect(calls).toBe(1);
});

test('ingredient matching trims whitespace consistently when extras are disabled',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('textbox',{name:'Ingredient name'}).first().fill(' Tomatoes ');
  await page.getByRole('button',{name:'Recipes',exact:true}).click();await page.getByLabel('Allow extra ingredients').uncheck();
  await page.route('**/api/recipes',route=>route.fulfill({json:{possible:true,message:'Ready',recipes:Array.from({length:8},(_,i)=>recipe(i))}}));
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();await expect(page.locator('.recipe-card')).toHaveCount(8);
  await expect(page.getByRole('region',{name:'Cook Now'})).toContainText('100% match');
});

