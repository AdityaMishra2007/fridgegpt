'use client';
import {useState} from 'react';
import {Check, Clock, Pause, Play, RotateCcw, X} from 'lucide-react';
import type {Ingredient, Recipe} from '@/lib/demo';
import ChefPanel from './chef-panel';

type Props = {
  recipe: Recipe; inventory: Ingredient[]; initialMode: 'details'|'cooking';
  done: number[]; seconds: number; running: boolean;
  onClose:()=>void; onStep:(step:number)=>void; onSeconds:(seconds:number)=>void;
  onRunning:(running:boolean)=>void;
  allergies:string; extras:boolean; diet:string;
};
export default function RecipeDialog({recipe:r,inventory,initialMode,done,seconds,running,onClose,onStep,onSeconds,onRunning,allergies,extras,diet}:Props){
  const [mode,setMode]=useState(initialMode);
  const [chefOpen,setChefOpen]=useState(false);
  const nextStep=r.steps.findIndex((_,i)=>!done.includes(i));
  const currentStep=mode==='cooking'&&nextStep>=0?nextStep:null;
  const available=(name:string)=>inventory.some(i=>i.confirmed&&i.name.trim().toLowerCase()===name.trim().toLowerCase());
  const missing=r.ingredients.filter(i=>!available(i.name));
  return <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="cooking-title" className="cooking">
    <button className="close icon-button" aria-label="Close cooking mode" onClick={onClose}><X/></button>
    <span className="eyebrow">YOUR KITCHEN COMPANION · {r.source==='gemini'?'GEMINI RECIPE':'DEMO RECIPE'}</span>
    <h2 id="cooking-title">{r.title}</h2><p className="muted">{r.description}</p>
    <div className="detail-meta"><span><Clock size={15}/>{r.time} min total</span>{r.prepTime!==undefined&&<><span>{r.prepTime} min prep</span><span>{r.cookTime} min cook</span></>}<span>{r.servings??2} servings</span><span>{r.difficulty??'Easy'}</span><span>{r.cuisine}</span>{r.mealType&&<span>{r.mealType}</span>}</div>
    <div className="detail-tabs" aria-label="Recipe view"><button aria-pressed={mode==='details'} onClick={()=>{setMode('details');setChefOpen(false)}}>Recipe details</button><button aria-pressed={mode==='cooking'} onClick={()=>{setMode('cooking');setChefOpen(false)}}>Cooking mode</button><button className="ask-chef-button" aria-pressed={chefOpen} onClick={()=>setChefOpen(true)}>Ask AI Chef</button></div>
    {!chefOpen&&mode==='cooking'&&<><div className="progress"><div style={{width:`${done.length/r.steps.length*100}%`}}/></div><p className="muted">{done.length} of {r.steps.length} steps complete</p></>}
    <div hidden={chefOpen}><div className="cooking-grid"><aside><h3>On your counter</h3><p className="muted">Quantities for {r.servings??2} servings. Availability does not confirm how much you have.</p>
      {r.ingredients.map((i,n)=><div className="quantity" key={`${i.name}-${n}`}><div><span>{i.name}</span><small className={available(i.name)?'available-label':'missing-label'}>{available(i.name)?'In your fridge':'Missing'}</small></div><strong>{i.quantity} {i.unit??''}</strong></div>)}
      {missing.length>0&&<div className="shopping-note"><strong>To pick up</strong><ul>{missing.map((i,n)=><li key={n}>{i.quantity} {i.unit??''} {i.name}</li>)}</ul></div>}
      {r.equipment&&<><h3>Equipment</h3><ul className="detail-list">{r.equipment.map(e=><li key={e}>{e}</li>)}</ul></>}
      {mode==='cooking'&&<div className="timer"><Clock size={22}/><h3 aria-live="polite">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</h3><label>Timer duration<select aria-label="Timer duration" disabled={running} value={[60,300,600].includes(seconds)?seconds:''} onChange={e=>onSeconds(Number(e.target.value))}><option value="" disabled>Custom countdown</option><option value="60">1 minute</option><option value="300">5 minutes</option><option value="600">10 minutes</option></select></label><div><button className="primary" disabled={seconds===0} onClick={()=>onRunning(!running)}>{running?<Pause size={16}/>:<Play size={16}/>} {running?'Pause':'Start'}</button><button className="icon-button" aria-label="Reset timer" onClick={()=>{onRunning(false);onSeconds(300)}}><RotateCcw size={18}/></button></div>{seconds===0&&<p role="status">Timer finished. Check your food.</p>}</div>}
    </aside><div><h3>{mode==='cooking'?'Let’s take it step by step':'How to make it'}</h3>
      {mode==='cooking'?r.steps.map((s,i)=><label className={'cooking-step '+(done.includes(i)?'completed':'')} key={i}><input type="checkbox" checked={done.includes(i)} onChange={()=>onStep(i)}/><span><strong>Step {i+1}</strong>{s}</span></label>):<ol className="numbered-steps">{r.steps.map((s,i)=><li key={i}>{s}</li>)}</ol>}
      {mode==='cooking'&&done.length===r.steps.length&&<div className="finished"><Check/>Made with what you have. Enjoy every bite.</div>}
      {r.substitutions&&<section className="detail-section"><h3>Suggested substitutions</h3>{r.substitutions.length?r.substitutions.map((s,i)=><p key={i}><strong>{s.ingredient} → {s.replacement}</strong><br/>{s.note}<br/><small>{available(s.replacement)?'Replacement is in your confirmed inventory.':'Replacement is not confirmed in your inventory.'}</small></p>):<p>No substitutions suggested for this recipe’s constraints.</p>}<small>Optional ideas only. Check labels, allergens, and dietary suitability before substituting.</small></section>}
      {r.nutrition&&<section className="detail-section"><h3>Approximate nutrition</h3><p>Estimated per serving · not a verified nutritional analysis</p><div className="nutrition-grid">{[[r.nutrition.calories,'kcal'],[r.nutrition.protein,'g protein'],[r.nutrition.carbs,'g carbs'],[r.nutrition.fat,'g fat']].map(([value,label])=><div key={label}><strong>~{Math.round(Number(value))}</strong><small>{label}</small></div>)}</div></section>}
      {r.tips&&<section className="detail-section"><h3>A little chef wisdom</h3><ul className="detail-list">{r.tips.map((tip,i)=><li key={i}>{tip}</li>)}</ul></section>}
      <p className="safety">{r.safety&&<><strong>Recipe safety:</strong> {r.safety}<br/></>}Wash produce, avoid cross-contamination, and cook eggs until whites and yolks are firm. Check ingredient labels and cross-contact for allergens. A timer alone does not confirm food is safely cooked.</p>
    </div></div></div><div hidden={!chefOpen}><ChefPanel key={r.id} recipe={r} inventory={inventory} allergies={allergies} extras={extras} diet={diet} currentStep={currentStep} open={chefOpen}/></div>
  </section></div>;
}
