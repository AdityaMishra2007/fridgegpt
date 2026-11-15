import {test,expect} from '@playwright/test';

test('live mystery basket uses only all five selected ingredients',async({request})=>{
  test.skip(process.env.LIVE_GEMINI!=='1','Opt in to Gemini usage with LIVE_GEMINI=1');
  const names=['Eggs','Tomatoes','Spinach','Feta','Olive oil'];
  const ingredients=names.map((name,i)=>({id:String(i),name,category:'Other',confirmed:true,soon:false}));
  const response=await request.post('/api/recipes',{data:{ingredients,time:30,cuisine:'Any cuisine',diet:'Vegetarian',extras:false,waste:false,allergies:'peanuts',challenge:true},timeout:60000});
  const result=await response.json();
  expect(response.status(),JSON.stringify(result)).toBe(200);
  expect(result.possible,result.message).toBe(true);
  expect(result.recipes).toHaveLength(1);
  expect(result.recipes[0].ingredients.map((i:{name:string})=>i.name).sort()).toEqual([...names].sort());
});

test('a four-item challenge and unconfirmed ingredients are rejected',async({request})=>{
  const ingredients=['Eggs','Tomatoes','Spinach','Feta'].map((name,i)=>({id:String(i),name,category:'Other',confirmed:true,soon:false}));
  const data={ingredients,time:30,cuisine:'Any cuisine',diet:'Any diet',extras:false,waste:false,allergies:'',challenge:true};
  expect((await request.post('/api/recipes',{data})).status()).toBe(400);
  data.challenge=false;data.ingredients[0].confirmed=false;
  expect((await request.post('/api/recipes',{data})).status()).toBe(400);
});
