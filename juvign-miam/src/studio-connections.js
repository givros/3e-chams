import {findNode,walk} from './studio-model.js';

export function connectionEvent(node){return ['list','products','productDetail'].includes(node.type)?'item':'click';}
export function connectionLabel(node,event='click'){if(event==='item')return (node.props.itemButton||node.name)+' · article';if(event==='change')return (node.props.label||node.name)+' · changement';return node.type==='cart'?node.props.checkout||'Confirmer':['button','back'].includes(node.type)?node.props.text||node.name:node.props.label||node.name;}
export function screenConnections(project){
 const links=[];walk(project,(node,screen)=>{const visit=(actions,event,conditional=false)=>{for(const a of actions||[]){if(a.type==='navigate'||a.type==='back')links.push({node:node.id,source:screen.id,target:a.screen||'',back:a.type==='back',conditional,event,label:connectionLabel(node,event)});if(a.type==='if'){visit(a.then,event,true);visit(a.else,event,true);}}};for(const [event,actions]of Object.entries(node.events))visit(actions,event);});return links;
}
export function connectScreen(project,nodeId,target,event=null){
 const found=findNode(project,nodeId);if(!found)throw Error('Choisis un bouton ou un élément cliquable.');
 if(target!=='back'&&!project.screens.some(s=>s.id===target))throw Error('Cet écran n’existe plus.');
 const key=event||connectionEvent(found.node);if(!['click','item','change'].includes(key))throw Error('Événement introuvable.');const actions=found.node.events[key];const links=screenConnections(project).filter(link=>link.node===nodeId&&link.event===key);if(links.length&&links.every(link=>link.conditional))throw Error('Modifie la navigation Si / sinon dans les actions de ce bouton.');const index=actions.findIndex(a=>['navigate','back'].includes(a.type));
 const next=target==='back'?{type:'back'}:{type:'navigate',screen:target};
 found.node.events[key]=actions.filter(a=>!['navigate','back'].includes(a.type));found.node.events[key].splice(index<0?found.node.events[key].length:Math.min(index,found.node.events[key].length),0,next);
}
export function disconnectScreen(project,nodeId,event=null){const found=findNode(project,nodeId);if(!found)return;const key=event||connectionEvent(found.node);if(!['click','item','change'].includes(key))return;found.node.events[key]=found.node.events[key].filter(a=>!['navigate','back'].includes(a.type));}
