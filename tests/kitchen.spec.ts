import {test,expect} from '@playwright/test';

test('inventory, filters, cooking mode, and five-item basket',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button',{name:'Scan my fridge',exact:true}).first().click();
  await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
  await page.getByRole('button',{name:'Confirm?',exact:true}).click();
  await page.getByRole('textbox',{name:'New ingredient'}).fill('Olive oil');
  await page.getByRole('button',{name:'Add ingredient',exact:true}).click();
  await page.getByRole('button',{name:'Use Tomatoes soon'}).click();
  await page.getByRole('button',{name:'Recipes',exact:true}).click();
  await expect(page.locator('.recipe-card')).toHaveCount(3);
  await page.getByLabel('Allow extra ingredients').uncheck();
  await expect(page.locator('.recipe-card')).toHaveCount(2);
  await page.getByRole('button',{name:'Let’s cook',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  await expect(page.getByText('1 of 4 steps complete')).toBeVisible();
  await page.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close cooking mode'}).click();
  await page.getByRole('button',{name:'Let’s cook',exact:true}).first().click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'Mystery basket',exact:true}).click();
  for(const ingredient of ['Tomatoes','Spinach','Eggs','Feta','Bread'])await page.locator('.basket-items').getByRole('button',{name:ingredient,exact:true}).click();
  await expect(page.getByRole('button',{name:'Create my challenge'})).toBeEnabled();
  await expect(page.locator('.basket-items').getByRole('button',{name:'Olive oil',exact:true})).toBeDisabled();
  await page.reload();
  await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('invalid API requests are rejected before Gemini',async({request})=>{
  expect((await request.post('/api/recipes',{data:{}})).status()).toBe(400);
  expect((await request.post('/api/scan',{multipart:{photo:{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not an image')}}})).status()).toBe(400);
  expect((await request.post('/api/recipes',{headers:{origin:'https://other.example'},data:{}})).status()).toBe(403);
  expect((await request.post('/api/scan',{headers:{'content-type':'application/json'},data:{}})).status()).toBe(400);
  expect((await request.post('/api/recipes',{headers:{origin:'http://127.0.0.1:3000'},data:{}})).status()).toBe(400);
  expect((await request.post('/api/scan',{headers:{'content-type':'multipart/form-data; boundary=broken'},data:'invalid'})).status()).toBe(400);
});

test('mobile layout fits the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.screenshot({path:'.tools/preview-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'My fridge',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('live photo → confirmed ingredients → generated recipes → cooking',async({page})=>{
  test.skip(process.env.LIVE_GEMINI!=='1','Opt in to paid Gemini requests with LIVE_GEMINI=1');
  await page.goto('/');
  await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles('.tools/test-food.jpg');
  const scan=page.waitForResponse(r=>r.url().endsWith('/api/scan'));
  await page.getByRole('button',{name:'Analyze my photo'}).click();
  const response=await scan;
  expect(response.status(),JSON.stringify(await response.json())).toBe(200);
  await expect(page.getByRole('textbox',{name:'Ingredient name'}).first()).toBeVisible();
  while(await page.locator('.confirm').count())await page.locator('.confirm').first().click();
  await page.getByRole('button',{name:'Recipes',exact:true}).click();
  const generated=page.waitForResponse(r=>r.url().endsWith('/api/recipes'));
  await page.getByRole('button',{name:'Generate 8 personalized recipes'}).click();
  const recipes=await generated; const result=await recipes.json();
  expect(recipes.status(),JSON.stringify(result)).toBe(200);
  expect(result.possible, result.message).toBe(true);
  await expect(page.locator('.recipe-card')).toHaveCount(8);
  await page.getByRole('button',{name:'Let’s cook',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toContainText('GEMINI RECIPE');
  await expect(page.getByRole('dialog')).toContainText('Recipe safety:');
  await page.getByRole('dialog').getByRole('checkbox').first().check();
  await expect(page.getByText(/1 of \d+ steps complete/)).toBeVisible();
});

