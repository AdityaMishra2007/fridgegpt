import type {Ingredient,Recipe} from './demo';
const key=(s:string)=>s.trim().toLowerCase();
export function availability(recipe:Recipe,inventory:Ingredient[]){
  const names=new Set(inventory.filter(i=>i.confirmed).map(i=>key(i.name)));
  const missing=recipe.ingredients.filter(i=>!names.has(key(i.name)));
  const total=recipe.ingredients.length;
  return {missing,matched:total-missing.length,total,percent:total?Math.round((total-missing.length)/total*100):0};
}
export function discoveryGroup(recipe:Recipe,inventory:Ingredient[]){
  const match=availability(recipe,inventory);
  return !match.missing.length?'Cook Now':match.missing.length<=2&&match.percent>=60?'Almost There':'Creative Ideas';
}
export function rankRecipes(recipes:Recipe[],inventory:Ingredient[],sort:string,waste:boolean){
  const difficulty:Record<string,number>={Easy:0,Medium:1,Advanced:2};
  const soon=new Set(inventory.filter(i=>i.confirmed&&i.soon).map(i=>key(i.name)));
  const priority=(r:Recipe)=>r.ingredients.filter(i=>soon.has(key(i.name))).length;
  return [...recipes].sort((a,b)=>{
    if(waste&&priority(a)!==priority(b))return priority(b)-priority(a);
    if(sort==='time')return a.time-b.time||availability(b,inventory).percent-availability(a,inventory).percent;
    if(sort==='difficulty')return (difficulty[a.difficulty??'Easy']??3)-(difficulty[b.difficulty??'Easy']??3)||a.time-b.time;
    return availability(b,inventory).percent-availability(a,inventory).percent||a.time-b.time;
  });
}
