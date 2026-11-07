import {activeProjectKey,projectLibraryKey} from './studio-projects.js';

export async function openProjectStorage(local, onError) {
 const movable=new Set([activeProjectKey,projectLibraryKey]);
 let database,entries;
 try {
  database=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('juvign-miam-project-storage',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('projects');
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(Error('Stockage occupé'));
  });
  entries=await new Promise((resolve,reject)=>{
   const request=database.transaction('projects').objectStore('projects').openCursor(),saved=new Map();
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const cursor=request.result;
    if(!cursor){resolve(saved);return;}
    saved.set(cursor.key,cursor.value);cursor.continue();
   };
  });
 } catch {
  database?.close();
  return local;
 }
 return {
  get length(){return local.length;},
  key:index=>local.key(index),
  getItem:key=>entries.has(key)?entries.get(key):local.getItem(key),
  removeItem:key=>local.removeItem(key),
  setItem(key,value){
   if(!entries.has(key)){
    try{local.setItem(key,value);return;}
    catch(error){if(error.name!=='QuotaExceededError'||!movable.has(key))throw error;}
   }
   const transaction=database.transaction('projects','readwrite');
   transaction.objectStore('projects').put(value,key);
   entries.set(key,value);
   transaction.oncomplete=()=>{try{local.removeItem(key);}catch{}};
   transaction.onabort=()=>onError(transaction.error);
  }
 };
}
