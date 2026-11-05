import {findNode} from './studio-model.js';
export const editorSessionKey=id=>'juvign-miam-editor-session-v1-'+id;
export function loadEditorSession(storage,project){
 try{
  const raw=storage.getItem(editorSessionKey(project.id));if(!raw||raw.length>4500000)return null;const saved=JSON.parse(raw);
  if(saved?.version!==1||saved.projectId!==project.id)return null;
  const screenId=project.screens.some(s=>s.id===saved.screenId)?saved.screenId:project.home;
  return {...saved,screenId,selectedId:findNode(project,saved.selectedId)?.screen.id===screenId?saved.selectedId:null,selectedVariable:project.variables.some(v=>v.name===saved.selectedVariable)?saved.selectedVariable:null,
   mode:saved.mode==='test'?'test':'design',libraryTab:['components','models','photos','screens','data','actions'].includes(saved.libraryTab)?saved.libraryTab:'components',inspectorTab:['props','actions','theme'].includes(saved.inspectorTab)?saved.inspectorTab:'props',eventName:['click','item','change','finish'].includes(saved.eventName)?saved.eventName:'click'};
 }catch{return null;}
}
export function saveEditorSession(storage,project,session){
 try{storage.setItem(editorSessionKey(project.id),JSON.stringify({...session,version:1,projectId:project.id}));return true;}catch{return false;}
}
