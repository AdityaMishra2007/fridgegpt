import {test,expect} from '@playwright/test';

async function demo(page:import('@playwright/test').Page){await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();await page.getByRole('button',{name:/load clearly labeled demo ingredients/i}).click();await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6)}
test('invalid scan responses preserve inventory and explain the problem',async({page})=>{
  await demo(page);await page.locator('input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await page.route('**/api/scan',route=>route.fulfill({json:{ingredients:[{name:'Broken'}],message:''}}));
  await page.getByRole('button',{name:'Analyze my photo'}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('incomplete');
  await expect(page.getByRole('textbox',{name:'Ingredient name'})).toHaveCount(6);
});
test('demo ingredient provenance is clearly labeled',async({page})=>{
  await demo(page);await expect(page.getByText('Contains sample demo ingredients. These are not photo detections.')).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await expect(page.getByText('Contains sample demo ingredients. These are not photo detections.')).toBeVisible();
});
test('empty inventories, invalid uploads and small mobile widths',async({page,request})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/');
  await page.getByRole('button',{name:'Recipes',exact:true}).click();
  await expect(page.getByRole('button',{name:'Generate 8 personalized recipes'})).toBeDisabled();
  await expect(page.getByText('SAMPLE RECIPES · These are inspiration, not personalized results.')).toBeVisible();
  for(const name of ['My fridge','Mystery basket','Overview']){await page.getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
  await page.getByRole('button',{name:'My fridge',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('no image')});
  await expect(page.locator('main').getByRole('alert')).toContainText('JPG');
  await page.locator('input[type=file]').setInputFiles({name:'large.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(3*1024*1024+1)});
  await expect(page.locator('main').getByRole('alert')).toContainText('too large');
  expect((await request.post('/api/recipes',{data:{ingredients:[],time:30,cuisine:'Any cuisine',diet:'Vegan',extras:true,waste:false,allergies:'',challenge:false}})).status()).toBe(400);
});

test('timer counts down, pauses, completes and resets',async({page})=>{
  await demo(page);await page.getByRole('button',{name:'Recipes',exact:true}).click();await page.locator('.recipe-card').first().getByRole('button',{name:'Let’s cook',exact:true}).click();
  const dialog=page.getByRole('dialog');await page.clock.install();await dialog.getByLabel('Timer duration').selectOption('60');await dialog.getByRole('button',{name:'Start',exact:true}).click();
  await page.clock.runFor(1100);await expect(dialog.locator('.timer h3')).toHaveText('0:59');await dialog.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(5000);await expect(dialog.locator('.timer h3')).toHaveText('0:59');
  await dialog.getByRole('button',{name:'Start',exact:true}).click();await page.clock.runFor(60000);await expect(dialog.getByText('Timer finished. Check your food.')).toBeVisible();await expect(dialog.getByRole('button',{name:'Start',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Reset timer'}).click();await expect(dialog.locator('.timer h3')).toHaveText('5:00');
});

test('impossible Mystery Basket explains constraints without inventing a dish',async({page})=>{
  await demo(page);await page.getByRole('button',{name:'Mystery basket',exact:true}).click();
  for(const name of ['Tomatoes','Spinach','Eggs','Feta','Bread'])await page.locator('.basket-items').getByRole('button',{name,exact:true}).click();
  await page.route('**/api/recipes',route=>route.fulfill({json:{possible:false,message:'These five ingredients cannot make a practical dish under the selected restrictions.',recipes:[]}}));
  await page.getByRole('button',{name:'Create my challenge'}).click();await expect(page.getByText('These five ingredients cannot make a practical dish under the selected restrictions.')).toBeVisible();await expect(page.getByRole('button',{name:'Start the challenge'})).toHaveCount(0);
});

test('API rejects invalid dietary preferences, counts and cooking steps before model calls',async({request})=>{
  const data={ingredients:[{id:'1',name:'Tomatoes',category:'Produce',confirmed:true,soon:false}],time:20,cuisine:'Any cuisine',diet:'Vegan',extras:true,waste:false,allergies:'',challenge:false};
  for(const bad of [{diet:'Unknown diet'},{time:0},{cuisine:'Atlantis'},{count:3}])expect((await request.post('/api/recipes',{data:{...data,...bad}})).status()).toBe(400);
  const chef={recipe:{title:'Tomatoes',description:'Tomatoes only',time:5,ingredients:[{name:'Tomatoes',quantity:'1'}],steps:['Wash the tomato.']},ingredients:data.ingredients,question:'Explain this step',diet:'Vegan',allergies:'',extras:false,strictBasket:false,history:[],currentStep:1};
  expect((await request.post('/api/chef',{data:chef})).status()).toBe(400);
});
