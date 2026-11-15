import {test,expect} from '@playwright/test';
import {apiError,AppError} from '../lib/gemini';
import {rankRecipes} from '../lib/discovery';
import type {Recipe} from '../lib/demo';

test('provider limits, timeouts and authorization failures have safe readable errors',async()=>{
  for(const [error,status,phrase] of [
    [{status:429,message:'PRIVATE_PROVIDER_BODY'},429,'usage limit'],
    [Object.assign(new Error('PRIVATE_PROVIDER_BODY'),{name:'TimeoutError'}),504,'too long'],
    [{status:403,message:'PRIVATE_PROVIDER_BODY'},503,'authorize'],
    [new AppError(502,'Gemini returned an incomplete response. Please try again.'),502,'incomplete'],
  ] as const){const response=apiError(error);expect(response.status).toBe(status);const body=await response.text();expect(body).toContain(phrase);expect(body).not.toContain('PRIVATE_PROVIDER_BODY')}
});

test('WasteLess prioritizes manually marked confirmed ingredients without inventing expiry',()=>{
  const base={description:'Test',cuisine:'European',diet:'Vegetarian',image:'',steps:['Cook.']};
  const recipes:Recipe[]=[{...base,id:1,title:'Tomatoes',time:20,ingredients:[{name:'Tomatoes',quantity:'2'}]},{...base,id:2,title:'Feta',time:5,ingredients:[{name:'Feta',quantity:'50 g'}]}];
  const inventory=[{id:'1',name:'Tomatoes',category:'Produce',confirmed:true,soon:true},{id:'2',name:'Feta',category:'Dairy & eggs',confirmed:true,soon:false}];
  expect(rankRecipes(recipes,inventory,'time',false).map(r=>r.id)).toEqual([2,1]);expect(rankRecipes(recipes,inventory,'time',true).map(r=>r.id)).toEqual([1,2]);
  inventory[0].confirmed=false;expect(rankRecipes(recipes,inventory,'time',true).map(r=>r.id)).toEqual([2,1]);
});
