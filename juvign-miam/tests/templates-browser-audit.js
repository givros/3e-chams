import {blankProject,validateProject} from '../src/studio-model.js';
import {addScreenTemplate,screenTemplates} from '../src/screen-templates.js';
import {createPlayer} from '../src/studio-player.js';
import {projectIssues} from '../src/studio-diagnostics.js';

export function runTemplateAudit(){
 const results=[];
 for(const template of screenTemplates){
  const root=document.createElement('div');document.body.append(root);
  try{
   const p=blankProject();addScreenTemplate(p,template.id);if(!validateProject(p))throw Error('Invalid template');
   const issues=projectIssues(p);if(issues.length)throw Error(issues.join('; '));
   const player=createPlayer(root,p,{persist:template.id==='settings'});
   const assert=(ok,message)=>{if(!ok)throw Error(message);};
   const click=text=>{const button=[...root.querySelectorAll('button')].find(b=>b.textContent===text);assert(button,'Missing button '+text);button.click();};
   const enter=(value,index=0)=>{const el=root.querySelectorAll('[data-bind]')[index];el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
   const text=value=>assert(root.textContent.includes(value),'Missing text '+value);
   if(template.id==='settings'){
    const dark=p.theme.darkVariable,notification=p.screens.at(-1).nodes.find(n=>n.type==='toggle'&&n.props.variable!==dark).props.variable;
    root.querySelector('[data-bind="'+dark+'"]').click();assert(player.getState()[dark]===true,'Dark switch');assert(root.style.getPropertyValue('--app-background')==='#181521','Dark appearance');
    root.querySelector('[data-bind="'+notification+'"]').click();assert(player.getState()[notification]===true,'Notification preference');
    const restored=document.createElement('div');document.body.append(restored);try{const reloaded=createPlayer(restored,p,{persist:true});assert(reloaded.getState()[dark]===true&&reloaded.getState()[notification]===true,'Preferences survive reopening');}finally{restored.remove();}
    click('Réinitialiser les données');text('Effacer les données');click('Annuler');assert(player.getState()[dark]===true,'Cancel preserves data');
    click('Réinitialiser les données');click('Oui, réinitialiser');assert(player.getState()[dark]===false&&player.getState()[notification]===false,'Reset restores preferences');assert(root.style.getPropertyValue('--app-background')===p.theme.background,'Light appearance restored');localStorage.removeItem('studio-app-'+p.id);
   }
   if(template.id==='counter'){click('＋ 1');text('Valeur : 1');click('− 1');text('Valeur : 0');click('＋ 1');click('Remettre à zéro');text('Valeur : 0');}
   if(template.id==='quiz'){
    enter('Égal à 10');click('Vérifier');text('Mauvaise réponse.');
    const snapshot=player.getSnapshot();
    assert(root.querySelector('select').disabled&&!root.querySelector('button[data-event="click"]'),'Quiz locks the answer and removes Verify');
    enter('Supérieur ou égal à 10');text('Mauvaise réponse.');
    assert(root.querySelector('select').value==='Égal à 10','A locked answer cannot be changed');
    player.update(p,{snapshot});
    assert(root.querySelector('select').disabled,'Restoring a quiz keeps the answer locked');
    player.reset();enter('Supérieur ou égal à 10');click('Vérifier');text('Bonne réponse !');
   }
   if(template.id==='poll'){click('Voter pizza');click('Voter burger');click('Voter pizza');text('Pizza : 2');text('Burger : 1');}
   if(template.id==='tasks'){click('Ajouter la tâche');text('Écris une tâche');enter('Mon devoir');click('Ajouter la tâche');text('Mon devoir');root.querySelector('[data-remove]').click();assert(!root.querySelector('.rt-list-item'),'Task removal');}
   if(template.id==='budget'){enter('30');enter('8',1);text('Il reste (€) : 22');}
   if(template.id==='calculator'){enter('7');enter('8',1);text('multiplication : 56');}
   if(template.id==='product'){click('Ajouter');assert(player.getState().cart[0].price===8.5,'Product price');text('Article ajouté');}
   if(template.id==='promo'){enter('wrong');click('Appliquer');text('Code inconnu.');enter('MIAM10');click('Appliquer');text('Réduction (€) : 3');}
   if(template.id==='order'){click('Étape suivante');text('Commande : En livraison');click('Étape suivante');text('Commande : Livrée');click('Recommencer');text('Commande : En préparation');}
   if(template.id==='favorites'){enter('Sushis');click('Enregistrer');text('Sushis');root.querySelector('[data-remove]').click();assert(!root.querySelector('.rt-list-item'),'Favorite removal');}
   if(template.id==='booking'){click('Réserver');text('Renseigne ton prénom');enter('Alex');enter('12 h 30',1);click('Réserver');text('Réservation confirmée pour Alex à 12 h 30.');}
   if(template.id==='scoreboard'){click('＋ 1 pour A');click('＋ 1 pour B');text('Équipe A : 1');text('Équipe B : 1');click('Nouveau match');text('Équipe A : 0');text('Équipe B : 0');}
   results.push({id:template.id,pass:true});
  }catch(error){results.push({id:template.id,pass:false,error:error.message});}finally{root.remove();}
 }
 return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)};
}
