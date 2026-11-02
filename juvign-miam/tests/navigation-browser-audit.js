import {blankProject,component} from '../src/studio-model.js';
import {setNavigation} from '../src/studio-navigation.js';
import {createPlayer,playerCSS} from '../src/studio-player.js';

export function runNavigationAudit(){
 const results=[];let root;
 const css=document.createElement('style');css.textContent=playerCSS;document.head.append(css);
 const make=(style='tabs',enabled=true)=>{
  root?.remove();root=document.createElement('div');root.className='app-player';root.style.cssText='width:390px;height:600px';document.body.append(root);
  const p=blankProject();p.screens[0].name='Accueil';p.screens.push({id:'details',name:'Détails',background:'#fff8ef',nodes:[]},{id:'checkout',name:'Paiement',background:'#fff8ef',nodes:[]});
  for(const s of p.screens){const title=component('heading',p);title.props.text=s.name;s.nodes.push(title);}
  setNavigation(p,{enabled,style});return {p,player:createPlayer(root,p)};
 };
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const test=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
 test('tabs navigate and back returns through real visited screens',()=>{const {player,p}=make();root.querySelector('[data-nav-screen="details"]').click();root.querySelector('[data-nav-screen="checkout"]').click();assert(player.getScreen()==='checkout','checkout');root.querySelector('[data-nav-back]').click();assert(player.getScreen()==='details','back details');root.querySelector('[data-nav-back]').click();assert(player.getScreen()===p.home,'back home');assert(!root.querySelector('[data-nav-back]'),'no redundant back at home');});
 test('same tab does not create a duplicate history entry',()=>{const {player,p}=make();root.querySelector('[data-nav-screen="details"]').click();root.querySelector('[data-nav-screen="details"]').click();player.run([{type:'back'}]);assert(player.getScreen()===p.home,'duplicate history');});
 test('back without history falls back to the home screen',()=>{const {player,p}=make();player.update(p,{screen:'details'});player.run([{type:'back'}]);assert(player.getScreen()===p.home,'fallback');});
 test('drawer opens, navigates, and closes',()=>{const {player}=make('drawer');root.querySelector('[data-nav-menu]').click();assert(root.querySelector('[role="dialog"]'),'drawer');assert(root.querySelector('.rt-screen').inert,'background inert');root.querySelector('[data-nav-screen="details"]').click();assert(player.getScreen()==='details','drawer destination');assert(!root.querySelector('.rt-drawer'),'drawer close');});
 test('escape dismisses the drawer and restores the menu button',()=>{make('drawer');root.querySelector('[data-nav-menu]').click();root.querySelector('.rt-drawer button').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!root.querySelector('.rt-drawer'),'escape');assert(document.activeElement===root.querySelector('[data-nav-menu]'),'focus restored');});
 test('menu items disappear safely when their screen is deleted',()=>{const {player,p}=make();root.querySelector('[data-nav-screen="details"]').click();p.screens=p.screens.filter(s=>s.id!=='details');player.update(p);player.run([{type:'back'}]);assert(player.getScreen()===p.home,'deleted history');assert(!root.querySelector('[data-nav-screen="details"]'),'deleted tab');});
 test('explicit reset clears the navigation history',()=>{const {player,p}=make();root.querySelector('[data-nav-screen="details"]').click();player.reset();assert(player.getScreen()===p.home,'reset screen');assert(!root.querySelector('[data-nav-back]'),'reset history');});
 test('back components work without a global menu',()=>{const {player,p}=make('tabs',false),back=component('back',p);p.screens[1].nodes.push(back);player.update(p);player.run([{type:'navigate',screen:'details'}]);root.querySelector('[data-node="'+back.id+'"]').click();assert(player.getScreen()===p.home,'back component');});
 test('drawer remains available without a title bar',()=>{const {player,p}=make('drawer');p.navigation.showHeader=false;player.update(p);root.querySelector('[data-nav-menu]').click();assert(root.querySelector('.rt-drawer'),'floating menu');});
 test('scroll is reset on navigation and restored on return',()=>{const {player,p}=make();const spacer=component('spacer',p);spacer.props.height=1400;p.screens[0].nodes.push(spacer);player.update(p);root.querySelector('.rt-screen').scrollTop=350;player.run([{type:'navigate',screen:'details'}]);assert(root.querySelector('.rt-screen').scrollTop===0,'new screen scroll');player.run([{type:'back'}]);assert(root.querySelector('.rt-screen').scrollTop===350,'restored scroll');});
 test('confirmation messages never cover the bottom menu',()=>{const {player}=make();player.run([{type:'toast',value:{kind:'literal',value:'Article ajouté.'}}]);const message=root.querySelector('.rt-notice').getBoundingClientRect(),tabs=root.querySelector('.rt-tabs').getBoundingClientRect();assert(message.bottom<=tabs.top,'message must remain above tabs');});
 root?.remove();css.remove();return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
