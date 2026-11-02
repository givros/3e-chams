import {blankProject,component,variable} from '../src/studio-model.js';
import {createPlayer} from '../src/studio-player.js';
import {setNavigation} from '../src/studio-navigation.js';

export function runIconAudit(){
 const root=document.createElement('div');document.body.append(root);const results=[];
 const check=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
 const assert=(value,message)=>{if(!value)throw Error(message);};
 try{
  const p=blankProject(),icon=component('icon',p),button=component('button',p),counter=variable(p,'Score','number',0);p.screens[0].nodes=[icon,button];
  icon.events.click=[{type:'increment',variable:counter.name,delta:1}];button.props.icon='cart';button.props.text='Mon panier';button.events.click=[{type:'increment',variable:counter.name,delta:2}];
  setNavigation(p,{enabled:true});p.screens[0].menuIcon='icon:home';const player=createPlayer(root,p);
  check('standalone icons are accessible real clickable controls',()=>{const el=root.querySelector('.rt-icon-button');assert(el.getAttribute('aria-label')==='Favori','accessible name');el.click();assert(player.getState()[counter.name]===1,'click action');});
  check('buttons combine text and vector icons without losing their action',()=>{const el=root.querySelector('.rt-custom-button');assert(el.querySelector('svg')&&el.textContent==='Mon panier','icon and text');el.click();assert(player.getState()[counter.name]===3,'button action');});
  check('icon-only buttons retain an accessible name and right-aligned icons',()=>{button.props.iconOnly=true;button.props.iconPosition='right';player.update(p);const el=root.querySelector('.rt-custom-button');assert(el.getAttribute('aria-label')==='Mon panier','accessible label');assert(el.textContent===''&&el.querySelector('svg'),'icon only');});
  check('vector menu icons coexist with legacy symbols',()=>{assert(root.querySelector('.rt-tabs svg'),'vector navigation');p.screens[0].menuIcon='♥';player.update(p);assert(root.querySelector('.rt-tabs span').textContent==='♥','legacy menu icon');});
 }finally{root.remove();}
 return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
