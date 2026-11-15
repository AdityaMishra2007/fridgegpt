'use client';
import {useEffect,useRef,useState} from 'react';
import {ChefHat,Send,Sparkles} from 'lucide-react';
import type {Ingredient,Recipe} from '@/lib/demo';
import {chefResponseSchema} from '@/lib/schemas';

type ChatMessage={role:'user'|'assistant';text:string;availableIngredients?:string[];suggestedPurchases?:string[]};
export default function ChefPanel({recipe,inventory,allergies,extras,diet,currentStep,open}:{recipe:Recipe;inventory:Ingredient[];allergies:string;extras:boolean;diet:string;currentStep:number|null;open:boolean}){
  const [question,setQuestion]=useState('');const [history,setHistory]=useState<ChatMessage[]>([]);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const textarea=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(open)textarea.current?.focus()},[open]);
  const pending=useRef<AbortController|null>(null);const locked=useRef(false);
  useEffect(()=>()=>pending.current?.abort(),[]);
  async function ask(){
    if(!question.trim()||locked.current)return;
    locked.current=true;setBusy(true);setError('');
    const controller=new AbortController();pending.current=controller;
    const text=question.trim();
    try{
      const response=await fetch('/api/chef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recipe,ingredients:inventory.filter(i=>i.confirmed),question:text,allergies,extras,diet,currentStep,strictBasket:recipe.strictBasket??false,history:history.slice(-6)}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
      let result;try{result=await response.json()}catch{throw new Error('The chef could not complete this answer. Please try again.')}
      if(!response.ok)throw new Error(result.error||'Your chef is unavailable. Please try again.');
      const parsed=chefResponseSchema.safeParse(result);if(!parsed.success)throw new Error('The answer was incomplete. Please try again.');
      setHistory(h=>[...h,{role:'user' as const,text},{role:'assistant' as const,text:parsed.data.answer,availableIngredients:parsed.data.availableIngredients,suggestedPurchases:parsed.data.suggestedPurchases}]);setQuestion('');
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error&&e.name==='TimeoutError'?'The chef took too long. Please try again.':e instanceof Error?e.message:'Could not reach the chef.')}
    finally{if(!controller.signal.aborted){setBusy(false);locked.current=false}pending.current=null}
  }
  return <section className="chef-panel" aria-label="AI Chef assistant"><div className="chef-heading"><span className="chef-icon"><ChefHat size={24}/></span><div><h3>A chef in your corner</h3><p>{currentStep===null?'Recipe guidance using your confirmed fridge.':`Cooking step ${currentStep+1} · ${recipe.steps[currentStep]}`}</p></div><Sparkles size={18}/></div>
    <div className="chef-prompts">{['Find a substitute','Make it spicier','Explain this step','Can I air fry this?'].map(q=><button key={q} disabled={busy} onClick={()=>setQuestion(q)}>{q}</button>)}</div>
    {history.length>0&&<div className="chef-conversation" aria-live="polite">{history.map((m,i)=><div key={i} className={'chef-message '+m.role}><strong>{m.role==='user'?'You':'AI Chef'}</strong><p>{m.text}</p>{m.availableIngredients&&m.availableIngredients.length>0&&<div className="chef-ingredient-badges available"><strong>In your fridge</strong>{m.availableIngredients.map(n=><span key={n}>{n}</span>)}</div>}{m.suggestedPurchases&&m.suggestedPurchases.length>0&&<div className="chef-ingredient-badges purchases"><strong>Suggested purchases</strong>{m.suggestedPurchases.map(n=><span key={n}>{n}</span>)}</div>}</div>)}</div>}
    <form onSubmit={e=>{e.preventDefault();ask()}}><label htmlFor="chef-question">Ask your AI chef</label><div className="chef-input"><textarea ref={textarea} id="chef-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={600} disabled={busy} rows={2} placeholder="A swap, a technique, a little reassurance…"/><button className="primary" aria-label="Ask chef" disabled={busy||!question.trim()}><Send size={17}/>{busy?'Thinking…':'Ask chef'}</button></div></form>
    {error&&<p role="alert" className="error">{error}</p>}{busy&&<p className="muted" role="status">Your chef is considering your recipe and ingredients…</p>}
    <small>{question.length}/600 characters · 12 questions per 10 minutes · recent conversation is sent for context.</small><small>AI advice can be imperfect. Check allergies, labels, and safe cooking temperatures. Suggestions do not change your recipe automatically.</small>
  </section>
}
