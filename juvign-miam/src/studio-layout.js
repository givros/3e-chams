import {component,findNode} from './studio-model.js';

export function columnLayout(project,count=2){
 const group=component('container',project);count=Math.min(4,Math.max(2,Number(count)||2));
 group.name=count+' colonnes';Object.assign(group.props,{direction:'grid',columns:count,columnWidths:'1,1',columnLayout:true});group.style.padding=0;
 for(let i=0;i<count;i++){const column=component('container',project);column.name='Colonne '+(i+1);column.style.padding=4;group.children.push(column);}
 return group;
}

export function moveNode(project,nodeId,destinationId,screenId){
 const source=findNode(project,nodeId),target=destinationId==='root'?null:findNode(project,destinationId),screen=project.screens.find(s=>s.id===screenId);
 if(!source||destinationId!=='root'&&!['container','form','accordion'].includes(target?.node.type)||destinationId==='root'&&!screen)return false;
 const contains=n=>n.id===destinationId||(n.children||[]).some(contains);
 if(contains(source.node))return false;
 source.siblings.splice(source.siblings.indexOf(source.node),1);
 (target?target.node.children:screen.nodes).push(source.node);return true;
}
export function containerTargets(project,nodeId,screenId){
 const result=[['root','Écran (hors groupe)']],screen=project.screens.find(s=>s.id===screenId);
 const visit=(nodes,path=[])=>{for(const n of nodes){if(n.id===nodeId)continue;const name=[...path,n.name];if(['container','form','accordion'].includes(n.type))result.push([n.id,name.join(' › ')]);visit(n.children||[],name);}};
 if(screen)visit(screen.nodes);return result;
}
