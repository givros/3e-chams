import {blankProject,component} from './studio-model.js';

export function starterProject(){const p=blankProject();p.name='Première création';p.starter={version:1,complete:false};return p;}
export function starterProgress(project){
 const nodes=project.screens.find(s=>s.id===project.home)?.nodes||[];
 const title=nodes.find(n=>n.type==='heading'),image=nodes.find(n=>n.type==='image'),button=nodes.find(n=>n.type==='button');
 const checks=[
  {label:'Un titre « Mon univers »',done:String(title?.props.text??'').trim()==='Mon univers'},
  {label:'La photo de montagne',done:image?.props.src==='assets/mountain.jpg'},
  {label:'Un bouton « Découvrir »',done:String(button?.props.text??'').trim()==='Découvrir'},
  {label:'Titre, photo, puis bouton',done:nodes.length===3&&nodes.map(n=>n.type).join(',')==='heading,image,button'}
 ];return {checks,done:checks.every(c=>c.done),count:checks.filter(c=>c.done).length};
}
export function addStarterNode(project,type){
 if(!['heading','image','button'].includes(type))return null;const screen=project.screens.find(s=>s.id===project.home);
 if(screen.nodes.some(n=>n.type===type))return null;const node=component(type,project);screen.nodes.push(node);return node;
}
