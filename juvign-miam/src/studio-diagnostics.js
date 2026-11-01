import {walk} from './studio-model.js';

export function projectIssues(project){
 const messages=new Set(),variables=new Map(project.variables.map(v=>[v.name,v]));
 const add=(label,text)=>messages.add(label+' : '+text);
 const binding=(name,label,type)=>{const v=variables.get(name);if(!v)add(label,'choisis une donnée liée.');else if(type&&v.type!==type)add(label,'cette donnée doit être de type '+({list:'liste',number:'nombre',boolean:'oui / non',text:'texte'})[type]+'.');return v;};
 const operand=(value,label)=>{
  if(!value)return;
  if(['variable','length','cartTotal'].includes(value.kind))binding(value.name,label,value.kind==='cartTotal'||value.kind==='length'?'list':null);
  if(value.kind==='math'){operand(value.a,label);operand(value.b,label);}
 };
 const actions=(list,label,event)=>{for(const a of list||[]){
  if(['set','increment','append','remove','cartAdd'].includes(a.type)){
   const v=binding(a.variable,label,a.type==='increment'?'number':['append','remove','cartAdd'].includes(a.type)?'list':null);
   if(v?.type==='computed')add(label,'un calcul ne peut pas être modifié par une action.');
  }
  if(a.type==='navigate'&&!project.screens.some(s=>s.id===a.screen))add(label,'choisis un écran de destination.');
  if(['cartAdd','remove'].includes(a.type)&&event!=='item')add(label,'cette action utilise l’événement « élément cliqué » d’une liste.');
  operand(a.value,label);
  if(a.type==='if'){for(const c of a.conditions||[]){operand(c.left,label);operand(c.right,label);}actions(a.then,label,event);actions(a.else,label,event);}
 }};
 for(const v of project.variables)if(v.type==='computed')operand(v.formula,v.label||v.name);
 walk(project,(n,s)=>{
  const label=s.name+' / '+n.name;
  const type=['list','products','cart'].includes(n.type)?'list':n.type==='number'?'number':n.type==='toggle'?'boolean':['input','textarea','select'].includes(n.type)?'text':null;
  if(type)binding(n.props.variable,label,type);
  for(const key of ['textVariable','visibleVariable','discountVariable'])if(n.props[key])binding(n.props[key],label,key==='discountVariable'?'number':null);
  for(const [event,list]of Object.entries(n.events))actions(list,label,event);
 });
 return [...messages];
}
