import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component} from '../src/studio-model.js';
import {editorSessionKey,loadEditorSession,saveEditorSession} from '../src/studio-session.js';

class Storage{values=new Map();getItem(key){return this.values.get(key)||null;}setItem(key,value){this.values.set(key,value);}}
test('workspace sessions stay isolated by project and preserve the working screen and tabs',()=>{
 const storage=new Storage(),p=blankProject(),q=blankProject(),node=component('button',p);p.screens[0].nodes=[node];
 assert.equal(saveEditorSession(storage,p,{screenId:p.home,selectedId:node.id,mode:'test',libraryTab:'screens',inspectorTab:'actions',eventName:'click',test:{projectId:p.id,state:{value:3}}}),true);
 const loaded=loadEditorSession(storage,p);assert.equal(loaded.selectedId,node.id);assert.equal(loaded.mode,'test');assert.equal(loaded.libraryTab,'screens');assert.equal(loadEditorSession(storage,q),null);
});
test('missing screens and elements fall back safely without changing the project',()=>{
 const storage=new Storage(),p=blankProject(),before=JSON.stringify(p);saveEditorSession(storage,p,{screenId:'deleted',selectedId:'deleted',selectedVariable:'deleted',mode:'invalid',libraryTab:'invalid'});
 const loaded=loadEditorSession(storage,p);assert.equal(loaded.screenId,p.home);assert.equal(loaded.selectedId,null);assert.equal(loaded.selectedVariable,null);assert.equal(loaded.mode,'design');assert.equal(JSON.stringify(p),before);
});
test('corrupt sessions and storage failures do not overwrite a saved project',()=>{
 const storage=new Storage(),p=blankProject();storage.setItem(editorSessionKey(p.id),'{broken');assert.equal(loadEditorSession(storage,p),null);
 const full={getItem:()=>null,setItem:()=>{throw Error('Full');}};assert.equal(saveEditorSession(full,p,{mode:'test'}),false);assert.equal(loadEditorSession(full,p),null);
});
