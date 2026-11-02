import {validateProject} from './studio-model.js';
export const activeProjectKey='juvign-miam-studio-v3';
export const projectLibraryKey='juvign-miam-project-library-v1';

export function listProjects(storage){
 try{const records=JSON.parse(storage.getItem(projectLibraryKey)||'[]');if(!Array.isArray(records))return [];return records.filter(r=>r&&typeof r.updatedAt==='string'&&validateProject(r.project));}catch{return [];}
}
export function archiveProject(storage,project){
 if(!validateProject(project))throw Error('Ce projet ne peut pas être enregistré.');
 const records=listProjects(storage),record={project:structuredClone(project),updatedAt:new Date().toISOString()},index=records.findIndex(r=>r.project.id===project.id);
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
 storage.setItem(projectLibraryKey,JSON.stringify(listProjects(storage).filter(r=>r.project.id!==id)));
}
