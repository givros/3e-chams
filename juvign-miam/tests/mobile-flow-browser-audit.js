import {mobileAppTemplate} from '../src/screen-templates.js';
import {createPlayer} from '../src/studio-player.js';

export function runMobileFlowAudit(){
 const root=document.createElement('div');document.body.append(root);const results=[];
 const assert=(value,message)=>{if(!value)throw Error(message);};
 try{
  const p=mobileAppTemplate(),player=createPlayer(root,p),cart=p.screens[2].nodes.find(n=>n.type==='cart'),confirmation=p.screens.find(s=>s.menuHidden);
  const click=text=>{const button=[...root.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert(button,'Button '+text);button.click();};
  click('Voir la carte');const search=root.querySelector('input[type=search]');search.value='burger';search.dispatchEvent(new Event('input',{bubbles:true}));
  assert(root.querySelectorAll('[data-event=item]').length===1,'Search filters articles');root.querySelector('[data-event=item]').click();click('Voir mon panier');
  assert(root.textContent.includes('Burger'),'Selected burger');root.querySelector('[data-cart="1"]').click();click('Confirmer');
  assert(player.getScreen()===confirmation.id,'Confirmation screen');assert(root.textContent.includes('2 × Burger'),'Receipt quantity');assert(root.textContent.includes('18,00'),'Receipt article amount');assert(!player.getState()[cart.props.variable].length,'Basket emptied');
  assert(root.querySelectorAll('.rt-tabs button').length===4,'Receipt stays outside the menu');
  click('Retour à la carte');const input=root.querySelector('input[type=search]');input.value='pizza';input.dispatchEvent(new Event('input',{bubbles:true}));root.querySelector('[data-event=item]').click();click('Voir mon panier');
  const receipt=p.variables.find(v=>v.label==='Dernière commande');assert(player.getState()[receipt.name][0].quantity===2,'Previous receipt remains independent from a new cart');
  results.push({name:'search, cart, quantity, confirmation and a second order',pass:true});
 }catch(error){results.push({pass:false,error:error.message});}finally{root.remove();}
 return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
