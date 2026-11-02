import {blankProject,component} from './studio-model.js';

export function starterProject(){const p=blankProject();p.name='Première création';p.starter={version:1,complete:false,draggedTypes:[]};return p;}
export function starterProgress(project){
 const nodes=project.screens.find(s=>s.id===project.home)?.nodes||[];
 const title=nodes.find(n=>n.type==='heading'),image=nodes.find(n=>n.type==='image'),button=nodes.find(n=>n.type==='button');
 const checks=[
  {label:'Déposer les 3 blocs dans l’écran',done:Array.isArray(project.starter?.draggedTypes)&&['heading','image','button'].every(type=>project.starter.draggedTypes.includes(type))},
  {label:'Un titre « Mon univers »',done:String(title?.props.text??'').trim()==='Mon univers'},
  {label:'La photo de montagne',done:image?.props.src==='assets/mountain.jpg'},
  {label:'Un bouton « Découvrir »',done:String(button?.props.text??'').trim()==='Découvrir'},
  {label:'Titre, photo, puis bouton',done:nodes.length===3&&nodes.map(n=>n.type).join(',')==='heading,image,button'}
 ];return {checks,done:checks.every(c=>c.done),count:checks.filter(c=>c.done).length};
}
export function dropStarterNode(project,payload,index){
 const screen=project.screens.find(s=>s.id===project.home);if(!screen||!project.starter||!Number.isInteger(index)||index<0||index>screen.nodes.length)return null;
 let node=payload.id?screen.nodes.find(n=>n.id===payload.id):null;
 if(payload.type){if(!['heading','image','button'].includes(payload.type))return null;node=screen.nodes.find(n=>n.type===payload.type)||addStarterNode(project,payload.type);}
 if(!node||!['heading','image','button'].includes(node.type))return null;
 const from=screen.nodes.indexOf(node);screen.nodes.splice(from,1);screen.nodes.splice(Math.max(0,index-(from<index?1:0)),0,node);
 if(payload.type){const types=Array.isArray(project.starter.draggedTypes)?project.starter.draggedTypes:[];project.starter.draggedTypes=[...new Set([...types,payload.type])];}
 return node;
}
export function addStarterNode(project,type){
 if(!['heading','image','button'].includes(type))return null;const screen=project.screens.find(s=>s.id===project.home);
 if(screen.nodes.some(n=>n.type===type))return null;const node=component(type,project);screen.nodes.push(node);return node;
}
