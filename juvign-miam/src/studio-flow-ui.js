import {starterProgress,dropStarterNode} from './studio-start.js';
import {screenConnections,connectScreen,disconnectScreen,connectionLabel,connectionEvent} from './studio-connections.js';
import {findNode,walk,uid} from './studio-model.js';
import {createPlayer} from './studio-player.js';
import {photoBank} from './studio-photos.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installFlowUI({getProject,commit,openScreen,openActions,finishStarter}){
 const $=selector=>document.querySelector(selector);let introSelection='',source='',sourceEvent='click',previews=[],starterDrag=null,keyboardBlock='';
 const starter=$('#starter-dialog'),connections=$('#connections-dialog');
 const conditionalOnly=()=>{const links=screenConnections(getProject()).filter(link=>link.node===source&&link.event===sourceEvent);return links.length>0&&links.every(link=>link.conditional);};
 const introActive=()=>getProject().starter?.version===1&&!getProject().starter.complete;
 function renderStarter(){
  const p=getProject(),screen=p.screens.find(s=>s.id===p.home),progress=starterProgress(p),focused=document.activeElement?.dataset?.starterProperty,caret=document.activeElement?.selectionStart;
  if(!screen.nodes.some(n=>n.id===introSelection))introSelection=screen.nodes[0]?.id||'';
  $('#starter-count').textContent=progress.count+' / '+progress.checks.length;
  $('#starter-checks').innerHTML=progress.checks.map(c=>`<li class="${c.done?'done':''}"><span>${c.done?'✓':'○'}</span>${esc(c.label)}</li>`).join('');
  $('#starter-canvas').innerHTML=screen.nodes.length?screen.nodes.map(n=>`<button draggable="true" class="starter-node ${introSelection===n.id?'selected':''}" data-starter-select="${n.id}" aria-label="Modifier ou déplacer ${esc(n.name)}"><span class="starter-grip" aria-hidden="true">⠿</span>${n.type==='heading'?'<h2>'+esc(n.props.text)+'</h2>':n.type==='image'?'<img src="'+esc(photoBank.some(photo=>photo.src===n.props.src)?n.props.src:'')+'" alt="Photo de ton écran" draggable="false">':'<span class="starter-button">'+esc(n.props.text)+'</span>'}</button>`).join(''):'<p class="starter-empty">Glisse les blocs depuis les boutons au-dessus et dépose-les ici.</p>';
  for(const button of starter.querySelectorAll('[data-starter-add]')){button.disabled=Array.isArray(p.starter.draggedTypes)&&p.starter.draggedTypes.includes(button.dataset.starterAdd);button.draggable=!button.disabled;}
  const node=screen.nodes.find(n=>n.id===introSelection);
  $('#starter-properties').innerHTML=node?`<strong>${esc(node.name)}</strong>${node.type==='image'?`<label>Photo<select data-starter-property="src">${photoBank.map(photo=>`<option value="${photo.src}" ${node.props.src===photo.src?'selected':''}>${esc(photo.label)}</option>`).join('')}</select></label>`:`<label>Texte<input data-starter-property="text" value="${esc(node.props.text)}"></label>`}<div class="starter-order"><button data-starter-move="-1" ${screen.nodes.indexOf(node)===0?'disabled':''}>↑ Monter</button><button data-starter-move="1" ${screen.nodes.indexOf(node)===screen.nodes.length-1?'disabled':''}>↓ Descendre</button></div>`:'<p>Choisis un élément pour le modifier.</p>';
  $('#starter-hint').textContent=progress.done?'Écran reproduit. Tu peux maintenant ouvrir l’éditeur complet.':'À faire : '+progress.checks.find(c=>!c.done).label+'.';$('#starter-finish').disabled=!progress.done;
  if(focused){const field=starter.querySelector(`[data-starter-property="${focused}"]`);field?.focus();try{field?.setSelectionRange(caret,caret);}catch{}}
 }
 function linkTo(target){if(!source||conditionalOnly())return;const id=source,event=sourceEvent;commit(()=>connectScreen(getProject(),id,target,event));$('#connections-hint').textContent='Lien créé. Tu peux le tester avec « Tester » dans l’éditeur.';}
 function chooseSource(id,event=null){const found=findNode(getProject(),id);if(!found)return;source=id;sourceEvent=event||connectionEvent(found.node);renderConnections();}
 function renderConnections(){
  previews.forEach(player=>player.destroy());previews=[];const p=getProject(),found=findNode(p,source),links=screenConnections(p);if(!found)source='';
  $('#connections-hint').textContent=source?'« '+connectionLabel(found.node,sourceEvent)+' » → clique sur l’écran à ouvrir.':'Clique sur un bouton, puis sur son écran de destination.';
  $('#connection-back').disabled=$('#connection-remove').disabled=!source||conditionalOnly();$('#connection-actions').disabled=!source;if(conditionalOnly())$('#connections-hint').textContent='Ce bouton utilise Si / sinon. Utilise « Modifier les actions » pour conserver ses conditions.';
  $('#connection-cards').innerHTML=p.screens.map(screen=>{const buttons=[];walk({screens:[screen]},n=>{const events=new Set(links.filter(link=>link.node===n.id).map(link=>link.event));if(['button','back','icon','cart','list','products','productDetail'].includes(n.type)||n.id===source)events.add(connectionEvent(n));for(const event of events)buttons.push({node:n,event});});return `<article class="connection-card ${source?'awaiting-target':''}" data-connection-screen="${screen.id}"><button class="connection-target" data-connection-target="${screen.id}" ${conditionalOnly()?'disabled':''}>${esc(screen.name)}${source?' ← Relier ici':''}</button><div class="connection-thumbnail"><div class="app-player" data-connection-preview="${screen.id}"></div></div><div class="connection-sources">${buttons.map(({node:n,event})=>`<button data-connection-source="${n.id}" data-connection-event="${event}" class="${source===n.id&&sourceEvent===event?'selected':''}">↗ ${esc(connectionLabel(n,event))}</button>`).join('')||'<small>Aucun bouton sur cet écran.</small>'}</div><button class="connection-edit" data-connection-edit="${screen.id}">Modifier cet écran</button></article>`;}).join('');
  for(const screen of p.screens){const root=connections.querySelector(`[data-connection-preview="${screen.id}"]`);const thumbnail={...p,home:screen.id,screens:p.screens.map(s=>s.id===screen.id?s:{...s,nodes:[]})};const preview=createPlayer(root,thumbnail,{design:true,onSelect:id=>{if(source&&!conditionalOnly())linkTo(screen.id);else chooseSource(id);}});previews.push(preview);}
  $('#connection-list').innerHTML=links.length?'<strong>Liens existants</strong>'+links.map(link=>{const target=p.screens.find(s=>s.id===link.target);return `<button data-connection-source="${link.node}" data-connection-event="${link.event}" class="connection-summary">${esc(p.screens.find(s=>s.id===link.source)?.name)} · ${esc(link.label)} → ${link.back?'Écran précédent':esc(target?.name||'Écran supprimé')}${link.conditional?' (si / sinon)':''}</button>`;}).join(''):'<p>Aucun écran relié pour le moment.</p>';
  requestAnimationFrame(drawLines);
 }
 function drawLines(){
  if(!connections.open)return;const board=$('#connection-board'),cards=$('#connection-cards'),bounds=board.getBoundingClientRect(),width=Math.max(board.clientWidth,cards.scrollWidth),height=cards.scrollHeight;
  const svg=$('#connection-lines');svg.setAttribute('width',width);svg.setAttribute('height',height);
  svg.innerHTML='<defs><marker id="connection-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8" fill="none" stroke="#6339c7" stroke-width="1.5"/></marker></defs>'+screenConnections(getProject()).filter(link=>!link.back).slice(0,100).map((link,index)=>{
   const from=cards.querySelector(`[data-connection-source="${link.node}"][data-connection-event="${link.event}"]`),target=cards.querySelector(`[data-connection-target="${link.target}"]`);if(!from||!target)return '';
   const a=from.getBoundingClientRect(),b=target.getBoundingClientRect(),x=a.right-bounds.left+board.scrollLeft,y=a.top+a.height/2-bounds.top+board.scrollTop,tx=b.left+b.width/2-bounds.left+board.scrollLeft,ty=b.top-bounds.top+board.scrollTop;
   const card=from.closest('.connection-card').getBoundingClientRect(),outside=card.right-bounds.left+board.scrollLeft+14,lane=8+(index%5)*7;
   return `<path d="M${x} ${y} H${outside} V${lane} H${tx} V${ty}" fill="none" stroke="#6339c7" stroke-width="${source===link.node&&sourceEvent===link.event?3:1.5}" opacity="${source&&(source!==link.node||sourceEvent!==link.event)?'.22':'1'}" stroke-dasharray="${link.conditional?'5 4':'none'}" marker-end="url(#connection-arrow)"/>`;
  }).join('');
 }
 function refresh(){const active=introActive();document.body.classList.toggle('starter-active',active);if(active){if(!starter.open)starter.showModal();renderStarter();}else if(starter.open)starter.close();if(connections.open)renderConnections();}
 starter.addEventListener('cancel',event=>event.preventDefault());
 starter.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
  if(button.dataset.starterAdd){keyboardBlock=button.dataset.starterAdd;$('#starter-hint').textContent='Glisse ce bloc dans ton écran. Au clavier : appuie sur Entrée dans la zone de dépôt.';$('#starter-canvas').focus();}
  if(button.dataset.starterSelect){introSelection=button.dataset.starterSelect;renderStarter();}
  if(button.dataset.starterMove)commit(()=>{const nodes=getProject().screens.find(s=>s.id===getProject().home).nodes,index=nodes.findIndex(n=>n.id===introSelection),target=index+Number(button.dataset.starterMove);if(index>=0&&target>=0&&target<nodes.length)[nodes[index],nodes[target]]=[nodes[target],nodes[index]];});
 });
 const clearDrop=()=>{starter.querySelectorAll('.starter-drop-before,.starter-drop-after').forEach(el=>el.classList.remove('starter-drop-before','starter-drop-after'));$('#starter-canvas').classList.remove('starter-drag-over');};
 const dropIndex=y=>{const nodes=[...$('#starter-canvas').querySelectorAll('[data-starter-select]')];const index=nodes.findIndex(el=>y<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2);return index<0?nodes.length:index;};
 const deposit=(payload,index)=>{clearDrop();commit(()=>{const node=dropStarterNode(getProject(),payload,index);if(node)introSelection=node.id;});keyboardBlock='';};
 starter.addEventListener('dragstart',event=>{const palette=event.target.closest('[data-starter-add]'),node=event.target.closest('[data-starter-select]');if(!palette&&!node)return;if(palette?.disabled){event.preventDefault();return;}starterDrag={project:getProject().id,...(palette?{type:palette.dataset.starterAdd}:{id:node.dataset.starterSelect})};event.dataTransfer.setData('application/x-juvign-starter',JSON.stringify(starterDrag));event.dataTransfer.effectAllowed=palette?'copy':'move';});
 $('#starter-canvas').addEventListener('dragover',event=>{if(!starterDrag||starterDrag.project!==getProject().id)return;event.preventDefault();event.dataTransfer.dropEffect=starterDrag.type?'copy':'move';clearDrop();const canvas=$('#starter-canvas'),nodes=[...canvas.querySelectorAll('[data-starter-select]')],index=dropIndex(event.clientY);canvas.classList.add('starter-drag-over');if(nodes[index])nodes[index].classList.add('starter-drop-before');else nodes.at(-1)?.classList.add('starter-drop-after');});
 $('#starter-canvas').addEventListener('drop',event=>{if(!starterDrag||starterDrag.project!==getProject().id)return;event.preventDefault();event.stopPropagation();const payload=starterDrag,index=dropIndex(event.clientY);starterDrag=null;deposit(payload,index);});
 $('#starter-canvas').addEventListener('dragleave',event=>{if(!$('#starter-canvas').contains(event.relatedTarget))clearDrop();});
 starter.addEventListener('dragend',()=>{starterDrag=null;clearDrop();});
 $('#starter-canvas').addEventListener('keydown',event=>{if(event.target!==$('#starter-canvas')||!keyboardBlock||!['Enter',' '].includes(event.key))return;event.preventDefault();deposit({type:keyboardBlock},getProject().screens.find(s=>s.id===getProject().home).nodes.length);});
 const edit=event=>{const property=event.target.dataset.starterProperty;if(!property)return;const node=findNode(getProject(),introSelection)?.node;if(!node)return;const value=event.target.value;commit(()=>node.props[property]=value,{redraw:false,key:'starter.'+introSelection+'.'+property});renderStarter();};
 starter.addEventListener('input',event=>{if(event.target.tagName!=='SELECT')edit(event);});starter.addEventListener('change',event=>{if(event.target.tagName==='SELECT')edit(event);});
 $('#starter-finish').onclick=()=>{if(!starterProgress(getProject()).done)return;finishStarter();try{localStorage.setItem('juvign-miam-starter-complete','1');}catch{}$('#connections').focus();};
 $('#connections').onclick=()=>{source='';connections.showModal();renderConnections();};
 connections.addEventListener('close',()=>{previews.forEach(player=>player.destroy());previews=[];});
 connections.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.connectionSource)chooseSource(button.dataset.connectionSource,button.dataset.connectionEvent);
  if(button.dataset.connectionTarget){if(conditionalOnly())return;if(!source){$('#connections-hint').textContent='Choisis d’abord un bouton à relier.';return;}linkTo(button.dataset.connectionTarget);}
  if(button.dataset.connectionEdit){connections.close();openScreen(button.dataset.connectionEdit);}
 });
 $('#connection-back').onclick=()=>{if(source)commit(()=>connectScreen(getProject(),source,'back',sourceEvent));};$('#connection-remove').onclick=()=>{if(source)commit(()=>disconnectScreen(getProject(),source,sourceEvent));};
 $('#connection-add-screen').onclick=()=>commit(()=>{const p=getProject();p.screens.push({id:uid('screen'),name:'Écran '+(p.screens.length+1),background:p.theme.background,nodes:[]});});
 $('#connection-actions').onclick=()=>{if(source){const id=source;connections.close();openActions?.(id,sourceEvent);}};
 window.addEventListener('resize',drawLines);return {refresh,openFor:id=>{source=id;sourceEvent=connectionEvent(findNode(getProject(),id)?.node||{});connections.showModal();renderConnections();}};
}
