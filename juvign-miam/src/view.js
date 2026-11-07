import {decodeProject,loadSharedProject} from './share.js';
import {validateProject} from './studio-model.js';
import {createPlayer,playerCSS} from './studio-player.js';
try{
 const id=new URLSearchParams(location.search).get('s');
 const project=id===null?await decodeProject(location.hash.slice(1)):await loadSharedProject(id);if(!validateProject(project))throw Error('Projet invalide.');
 const style=document.createElement('style');style.textContent=playerCSS;document.head.append(style);document.title=project.name;
 createPlayer(document.querySelector('#application'),project,{persist:true});
}catch(error){document.querySelector('#application').hidden=true;const p=document.querySelector('#error');p.hidden=false;p.textContent='Impossible d’ouvrir cette application : '+error.message;}
