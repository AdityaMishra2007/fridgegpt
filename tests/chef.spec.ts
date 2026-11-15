import {test,expect} from '@playwright/test';

test('chef uses recipe and confirmed inventory, waits for submit, and keeps conversation on errors',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('button',{name:'Recipes',exact:true}).click();
  await page.getByPlaceholder('e.g. peanuts, shellfish, sesame').fill('peanuts');
  await page.locator('.recipe-card').first().getByRole('button',{name:'Recipe details'}).click();
  await page.getByRole('button',{name:'Ask AI Chef',exact:true}).click();
  let calls=0;
  await page.route('**/api/chef',async route=>{
    const data=route.request().postDataJSON();calls++;
    expect(data.recipe.title).toBeTruthy();expect(data.ingredients).toHaveLength(5);expect(data.allergies).toBe('peanuts');
    expect(data.diet).toBe('Any diet');expect(data.currentStep).toBe(calls===1?null:1);
    expect(data.ingredients.every((i:{confirmed:boolean})=>i.confirmed)).toBe(true);
    if(calls===2){expect(data.history).toHaveLength(2);await route.fulfill({status:429,json:{error:'Usage limit reached. Try again shortly.'}});return}
    await route.fulfill({json:{answer:'Use your confirmed spinach for extra greens. Check the labels of any replacement for peanut cross-contact.',availableIngredients:['Spinach'],suggestedPurchases:['Chili flakes']}});
  });
  const chef=page.getByRole('region',{name:'AI Chef assistant'});
  await chef.getByRole('button',{name:'Make it spicier',exact:true}).click();
  expect(calls).toBe(0);
  await chef.getByRole('button',{name:'Ask chef',exact:true}).click();
  await expect(chef.locator('.chef-message.assistant')).toContainText('confirmed spinach');
  await page.getByRole('dialog').getByRole('button',{name:'Cooking mode',exact:true}).click();
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  await page.getByRole('button',{name:'Ask AI Chef',exact:true}).click();
  await expect(chef.locator('.chef-message.assistant')).toBeVisible();
  await chef.getByLabel('Ask your AI chef').fill('Can I use an air fryer?');
  await chef.getByRole('button',{name:'Ask chef',exact:true}).click();
  await expect(chef.getByRole('alert')).toContainText('Usage limit');
  await expect(chef.locator('.chef-message.assistant')).toHaveCount(1);
  await expect(chef).toContainText('In your fridge');await expect(chef).toContainText('Suggested purchases');
  await page.setViewportSize({width:390,height:844});
  expect(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});

test('chef validates inputs and cross-origin requests',async({request})=>{
  expect((await request.post('/api/chef',{data:{}})).status()).toBe(400);
  expect((await request.post('/api/chef',{headers:{origin:'https://other.example'},data:{}})).status()).toBe(403);
});
