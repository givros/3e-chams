import {decodeProject,loadSharedProject} from './share.js';
import {activeProjectKey,listProjects} from './studio-projects.js';
import {openProjectStorage} from './studio-project-storage.js';
import {validateProject} from './studio-model.js';
import {createPlayer,playerCSS} from './studio-player.js';
try{
 const params=new URLSearchParams(location.search),localId=params.get('local'),id=params.get('s');
 let project;
 if(localId!==null){
  const storage=await openProjectStorage(localStorage,()=>{});
  let active;
  try{active=JSON.parse(storage.getItem(activeProjectKey));}catch{}
  project=active?.id===localId&&validateProject(active)?active:listProjects(storage).find(record=>record.project.id===localId)?.project;
  if(!project)throw Error('Cette application est introuvable dans la bibliothèque de ce navigateur.');
 }else project=id===null?await decodeProject(location.hash.slice(1)):await loadSharedProject(id);
 if(!validateProject(project))throw Error('Projet invalide.');
 const style=document.createElement('style');style.textContent=playerCSS;document.head.append(style);document.title=project.name;
 createPlayer(document.querySelector('#application'),project,{persist:true});
}catch(error){document.querySelector('#application').hidden=true;const p=document.querySelector('#error');p.hidden=false;p.textContent='Impossible d’ouvrir cette application : '+error.message;}
