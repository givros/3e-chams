import {validateProject,blankProject,uid} from './studio-model.js';
export const activeProjectKey='juvign-miam-studio-v3';
export const projectLibraryKey='juvign-miam-project-library-v1';
export const recoveryPrefix='juvign-miam-recovery-';
function rawRecords(storage){const raw=storage.getItem(projectLibraryKey);if(!raw)return [];let records;try{records=JSON.parse(raw);}catch{throw Error('La bibliothèque enregistrée est illisible. Elle a été conservée.');}if(!Array.isArray(records))throw Error('La bibliothèque enregistrée est incompatible. Elle a été conservée.');return records;}

export function listProjects(storage){
 try{return rawRecords(storage).filter(r=>r&&typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.updatedAt))&&validateProject(r.project));}catch{return [];}
}
export function archiveProject(storage,project){
 if(!validateProject(project))throw Error('Ce projet ne peut pas être enregistré.');
 const records=rawRecords(storage),record={project:structuredClone(project),updatedAt:new Date().toISOString()},index=records.findIndex(r=>r?.project?.id===project.id);
 if(index<0)records.unshift(record);else records[index]=record;
 storage.setItem(projectLibraryKey,JSON.stringify(records));return record;
}
export function saveProject(storage,project){
 storage.setItem(activeProjectKey,JSON.stringify(project));
 try{archiveProject(storage,project);return {librarySaved:true};}catch{return {librarySaved:false};}
}
export function switchProject(storage,current,next){
 // Save both snapshots before replacing the active project. A full library must
 // never cause the currently open work to be discarded.
 archiveProject(storage,current);archiveProject(storage,next);
 storage.setItem(activeProjectKey,JSON.stringify(next));return next;
}
export function removeProject(storage,id,activeId){
 if(id===activeId)throw Error('Ouvre une autre application avant de supprimer celle-ci.');
 storage.setItem(projectLibraryKey,JSON.stringify(rawRecords(storage).filter(r=>r?.project?.id!==id)));
}
export function loadActiveProject(storage){
 const raw=storage.getItem(activeProjectKey);if(!raw)return {project:blankProject()};
 try{const project=JSON.parse(raw);if(validateProject(project))return {project};}catch{}
 const key=recoveryPrefix+Date.now()+'-'+uid('copy');let blocked=false;
 try{storage.setItem(key,raw);}catch{blocked=true;}
 return {project:blankProject(),recovery:{raw,key:blocked?null:key,blocked}};
}
export function listRecoveries(storage){
 const records=[];if(typeof storage.key!=='function')return records;
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(recoveryPrefix))continue;const raw=storage.getItem(key);let name='Copie à récupérer';try{name=JSON.parse(raw)?.name||name;}catch{}records.push({key,name:String(name),raw});}
 return records;
}
