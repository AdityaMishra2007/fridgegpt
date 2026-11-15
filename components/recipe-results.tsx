'use client';
import {useState} from 'react';
import {ArrowRight,Check,ChefHat,Clock} from 'lucide-react';
import type {Recipe,Ingredient} from '@/lib/demo';
import {availability,discoveryGroup,rankRecipes} from '@/lib/discovery';

export default function RecipeResults({recipes,inventory,waste,onDetails,onCook}:{recipes:Recipe[];inventory:Ingredient[];waste:boolean;onDetails:(r:Recipe)=>void;onCook:(r:Recipe)=>void}){
  const [sort,setSort]=useState('match');const [meal,setMeal]=useState('All meals');
  const ranked=rankRecipes(recipes.filter(r=>meal==='All meals'||r.mealType===meal),inventory,sort,waste);
  const descriptions={'Cook Now':'All listed ingredients are confirmed in your fridge. Check that you have enough.','Almost There':'At least 60% matched, with only one or two ingredients to pick up.','Creative Ideas':'Explore a new direction with a few additions to your shopping list.'};
  return <div className="discovery-results"><div className="discovery-toolbar"><div className="meal-filters" aria-label="Meal type">{['All meals','Breakfast','Lunch','Dinner','Snack','Creative'].map(m=><button key={m} aria-pressed={meal===m} onClick={()=>setMeal(m)}>{m}</button>)}</div><label>Sort within groups<select aria-label="Sort recipes" value={sort} onChange={e=>setSort(e.target.value)}><option value="match">Ingredient match</option><option value="time">Quickest first</option><option value="difficulty">Easiest first</option></select></label></div>
    {(['Cook Now','Almost There','Creative Ideas'] as const).map(group=>{
      const items=ranked.filter(r=>discoveryGroup(r,inventory)===group);if(!items.length)return null;
      return <section className="recipe-group" aria-label={group} key={group}><div className="group-heading"><h2>{group} <span>{items.length}</span></h2><p>{descriptions[group]}</p></div><div className="recipe-grid">{items.map(r=>{
        const match=availability(r,inventory);
        return <article className="recipe-card" key={r.id}><div className="recipe-image">{r.image?<img src={r.image} alt="Illustrative food photography"/>:<div className="ai-recipe-art"><ChefHat size={48}/><span>MADE FOR YOUR FRIDGE</span></div>}<span className="recipe-tag">{r.diet==='Any diet'?'Kitchen inspiration':r.diet}</span></div><div className="recipe-content"><div className="recipe-meta"><span><Clock size={14}/>{r.time} min</span><span>{r.difficulty||'Easy'}</span><span>{r.cuisine}</span>{r.mealType&&<span>{r.mealType}</span>}</div><h2>{r.title}</h2><p>{r.description}</p><div className="availability"><Check size={15}/>{match.percent}% match · {match.matched} of {match.total} ingredients</div><div className="match-track" aria-hidden="true"><div style={{width:`${match.percent}%`}}/></div><p className="missing"><strong>To pick up:</strong> {match.missing.map(i=>i.name).join(', ')||'You have every listed ingredient!'}</p><button className="text-button full" onClick={()=>onDetails(r)}>Recipe details <ArrowRight size={15}/></button><button className="primary full" onClick={()=>onCook(r)}>Let’s cook <ArrowRight size={17}/></button></div></article>
      })}</div></section>
    })}
    {!ranked.length&&<div className="empty panel"><ChefHat size={35}/><h3>No {meal==='All meals'?'matching':meal.toLowerCase()} recipes in this collection.</h3><p>Choose another meal type, use Show More Recipes, or change your generation preferences.</p><button className="text-button" onClick={()=>setMeal('All meals')}>Show all meal types <ArrowRight size={15}/></button></div>}
  </div>
}
