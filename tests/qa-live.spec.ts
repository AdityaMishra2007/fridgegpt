import {test,expect,type Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {recipeResponseSchema,recipeKey} from '../lib/schemas';

test('final live refrigerator journey, preferences, basket and chef',async({page})=>{
  test.skip(process.env.FINAL_QA_LIVE!=='1','Opt in to live Gemini quota with FINAL_QA_LIVE=1');
  test.setTimeout(540000);
  page.setDefaultTimeout(12000);
  const evidence:Record<string,unknown>={fixture:'Public refrigerator photo from https://www.realhomes.com/advice/things-people-with-organized-refrigerators-never-do',stages:[]};
  const stages=evidence.stages as string[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  function record(stage:string,data?:unknown){stages.push(stage);if(data)evidence[stage]=data;writeFileSync('.tools/final-qa-live.json',JSON.stringify(evidence,null,2));console.log('LIVE PASS:',stage)}
  async function response(path:string,click:()=>Promise<unknown>){const pending=page.waitForResponse(r=>r.url().endsWith(path),{timeout:115000});await click();const r=await pending;const body=await r.json();expect(r.status(),JSON.stringify(body)).toBe(200);return {body,request:r.request().postDataJSON.bind(r.request())}}
  async function add(name:string){await page.getByRole('textbox',{name:'New ingredient'}).fill(name);await page.getByRole('button',{name:'Add ingredient',exact:true}).click()}
  try{
    await page.goto('/');await page.getByRole('button',{name:'My fridge',exact:true}).click();
    await page.locator('input[type=file]').setInputFiles('.tools/qa-fridge.jpg');
    const scanPending=page.waitForResponse(r=>r.url().endsWith('/api/scan'),{timeout:60000});await page.getByRole('button',{name:'Analyze my photo'}).click();
    await expect(page.getByRole('button',{name:'Looking for ingredients…'})).toBeDisabled();
    const scan=await scanPending;const detections=await scan.json();expect(scan.status(),JSON.stringify(detections)).toBe(200);expect(detections.ingredients.length).toBeGreaterThan(0);
    await expect(page.locator('.confirm')).toHaveCount(detections.ingredients.length);record('refrigerator recognition',detections);
    const rows=page.locator('.ingredient');
    for(let i=0;i<await rows.count();i++){const row=rows.nth(i);const name=await row.getByRole('textbox').inputValue();if(/broccoli|carrot|lettuce|pepper|tomato|milk|egg|bread|apple|strawberr|blueberr|asparagus|artichoke|cheese|pineapple|watermelon|garlic|lime/i.test(name))await row.locator('.confirm').click()}
    await add('QA temporary ingredient');await page.getByRole('button',{name:'Remove QA temporary ingredient',exact:true}).click();
    for(const name of ['Eggs','Tomatoes','Spinach','Feta','Olive oil']){
      let found=false;for(let i=0;i<await rows.count();i++){const row=rows.nth(i);if((await row.getByRole('textbox').inputValue()).toLowerCase()===name.toLowerCase()){found=true;if(await row.locator('.confirm').count())await row.locator('.confirm').click();break}}
      if(!found)await add(name);
    }
    await page.getByRole('button',{name:/^Use tomatoes soon$/i}).click();record('confirm add remove and use-soon');
    await page.getByRole('button',{name:'Recipes',exact:true}).click();
    await page.getByLabel('Cooking time').selectOption('60');await page.getByLabel('Cuisine').selectOption('Mediterranean');await page.getByLabel('Dietary preference').selectOption('Vegetarian');await page.getByLabel('WasteLess').check();
    const first=await response('/api/recipes',()=>page.getByRole('button',{name:'Generate 8 personalized recipes'}).click());
    const batch=recipeResponseSchema.parse(first.body);expect(batch.possible,batch.message).toBe(true);expect(batch.recipes).toHaveLength(8);expect(first.request().ingredients.every((i:{confirmed:boolean})=>i.confirmed)).toBe(true);expect(first.request().waste).toBe(true);
    await expect(page.locator('.recipe-card')).toHaveCount(8);record('eight personalized recipes',batch);
    const more=await response('/api/recipes',()=>page.getByRole('button',{name:'Show More Recipes'}).click());const extra=recipeResponseSchema.parse(more.body);expect(extra.possible,extra.message).toBe(true);expect(extra.recipes).toHaveLength(4);expect(more.request().previousNames).toHaveLength(8);
    expect(new Set([...batch.recipes,...extra.recipes].map(r=>recipeKey(r.title))).size).toBe(12);await expect(page.locator('.recipe-card')).toHaveCount(12);record('four appended nonduplicate recipes',extra);
    for(const r of [...batch.recipes,...extra.recipes]){expect(r.cuisine).toBe('Mediterranean');expect(r.diet).toBe('Vegetarian');expect(r.time).toBeLessThanOrEqual(60);expect(r.time).toBe(r.prepTime+r.cookTime);for(const i of r.ingredients){expect(i.quantity).toMatch(/\d/);expect(i.unit.length).toBeGreaterThan(0)}}
    await page.locator('.recipe-card').first().getByRole('button',{name:'Recipe details'}).click();const dialog=page.getByRole('dialog');
    for(const label of ['Equipment','Suggested substitutions','Approximate nutrition'])await expect(dialog).toContainText(label);
    await dialog.getByRole('button',{name:'Cooking mode',exact:true}).click();await dialog.getByRole('checkbox').first().check();
    await page.clock.install();await dialog.getByLabel('Timer duration').selectOption('60');await dialog.getByRole('button',{name:'Start',exact:true}).click();await page.clock.runFor(2100);await expect(dialog.locator('.timer h3')).toHaveText('0:58');
    await dialog.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(2100);await expect(dialog.locator('.timer h3')).toHaveText('0:58');await dialog.getByRole('button',{name:'Reset timer'}).click();await expect(dialog.locator('.timer h3')).toHaveText('5:00');record('detailed recipe cooking and timer');
    await dialog.getByRole('button',{name:'Ask AI Chef',exact:true}).click();
    for(const question of ['Explain this step','Can I air fry this?']){await page.getByLabel('Ask your AI chef').fill(question);const chef=await response('/api/chef',()=>page.getByRole('button',{name:'Ask chef',exact:true}).click());expect(chef.body.answer.length).toBeGreaterThan(20);expect(chef.request().currentStep).toBe(1);record('chef '+question,chef.body)}
    await dialog.getByRole('button',{name:'Close cooking mode'}).click();
    await page.getByLabel('Cuisine').selectOption('Indian');await page.getByLabel('Dietary preference').selectOption('Vegan');await page.getByLabel('Cooking time').selectOption('20');
    const vegan=await response('/api/recipes',()=>page.getByRole('button',{name:'Generate 8 personalized recipes'}).click());const veganBatch=recipeResponseSchema.parse(vegan.body);expect(veganBatch.possible,veganBatch.message).toBe(true);expect(veganBatch.recipes).toHaveLength(8);
    for(const r of veganBatch.recipes){expect(r.diet).toBe('Vegan');expect(r.cuisine).toBe('Indian');expect(r.time).toBeLessThanOrEqual(20);for(const i of r.ingredients){if(!/vegan|plant|coconut|almond|oat|soy|dairy.free|peanut/i.test(i.name))expect(i.name).not.toMatch(/\b(egg|eggs|feta|parmesan|chicken|beef|pork|bacon|salmon|tuna|honey|butter|yogurt|milk|cheese)\b/i)}}record('vegan Indian twenty-minute preferences',veganBatch);
    await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.tools/qa-real-mobile-recipes.png',fullPage:true});
    await page.getByLabel('Cuisine').selectOption('Any cuisine');await page.getByLabel('Dietary preference').selectOption('Vegetarian');await page.getByLabel('Cooking time').selectOption('60');await page.getByRole('button',{name:'Mystery basket',exact:true}).click();
    for(const name of ['Eggs','Tomatoes','Spinach','Feta','Olive oil'])await page.locator('.basket-items').getByRole('button',{name:new RegExp(`^${name}$`,'i')}).click();
    const basket=await response('/api/recipes',()=>page.getByRole('button',{name:'Create my challenge'}).click());expect(basket.body.possible,basket.body.message).toBe(true);expect(basket.body.recipes).toHaveLength(1);expect(basket.body.recipes[0].ingredients.map((i:{name:string})=>i.name.toLowerCase()).sort()).toEqual(['eggs','tomatoes','spinach','feta','olive oil'].sort());await expect(page.getByRole('button',{name:'Start the challenge'})).toBeVisible();record('strict five-ingredient Mystery Basket',basket.body);
    expect(errors).toEqual([]);record('no browser runtime errors');
  }catch(error){evidence.failure=error instanceof Error?error.message:String(error);writeFileSync('.tools/final-qa-live.json',JSON.stringify(evidence,null,2));await page.screenshot({path:'.tools/qa-live-failure.png'});throw error}
});
