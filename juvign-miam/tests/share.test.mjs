import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,validateProject,walk} from '../src/studio-model.js';
import {screenTemplates,addScreenTemplate} from '../src/screen-templates.js';
import {encodeProject,decodeProject} from '../src/share.js';

test('screen templates retain existing work and create independent editable components',()=>{
 const p=blankProject(),original=structuredClone(p.screens[0]);
 for(const t of screenTemplates)addScreenTemplate(p,t.id);
 addScreenTemplate(p,'contact');
 assert.deepEqual(p.screens[0],original);assert.ok(validateProject(p));
 const ids=[];walk(p,n=>ids.push(n.id));assert.equal(new Set(ids).size,ids.length);
 const catalog=p.screens.find(s=>s.nodes.some(n=>n.type==='products'));
 const basket=p.screens.find(s=>s.nodes.some(n=>n.type==='cart'));
 assert.ok(catalog.nodes.some(n=>n.events.click.some(a=>a.type==='navigate'&&a.screen===basket.id)));
 assert.equal(p.home,p.screens[1].id);
});
test('shared snapshots retain Unicode, actions and custom images independently of later edits',async()=>{
 const p=blankProject();addScreenTemplate(p,'catalog');p.name='Élève 🍕';
 p.variables[0].initial[0].image='data:image/png;base64,AA==';
 const before=structuredClone(p),encoded=await encodeProject(p);p.name='Changed';
 assert.match(encoded,/^[A-Za-z0-9_-]+$/);assert.deepEqual(await decodeProject(encoded),before);
});
test('broken and excessive share links are rejected',async()=>{
 await assert.rejects(decodeProject('invalid'));await assert.rejects(decodeProject('a'.repeat(4000001)));
});
test('catalogue and basket templates link in both directions regardless of insertion order',()=>{
 for(const order of [['catalog','basket'],['basket','catalog']]){
  const p=blankProject();for(const id of order)addScreenTemplate(p,id);
  const catalog=p.screens.find(s=>s.nodes.some(n=>n.type==='products')),basket=p.screens.find(s=>s.nodes.some(n=>n.type==='cart'));
  assert.ok(catalog.nodes.some(n=>n.events.click.some(a=>a.type==='navigate'&&a.screen===basket.id)));
  assert.ok(basket.nodes.some(n=>n.events.click.some(a=>a.type==='navigate'&&a.screen===catalog.id)));
 }
});

test('large projects publish in chunks without a total upload cutoff',async()=>{
 const {publishProject}=await import('../src/share.js');
 const project=blankProject();project.name='Grand projet';
 project.screens[0].notes='a'.repeat(9*1024*1024);
 const original=globalThis.fetch,received=[];
 globalThis.fetch=async (url,{body})=>{
  const params=new URL(url).searchParams,operation=params.get('upload');
  if(operation==='start')return Response.json({token:'0123456789abcdef0123456789abcdef'});
  if(operation==='chunk'){
   assert.equal(Number(params.get('offset')),received.reduce((size,part)=>size+part.size,0));
   assert.ok(body.size<=1024*1024);
   received.push(body);
   return Response.json({offset:Number(params.get('offset'))+body.size});
  }
  assert.equal(operation,'finish');
  const complete=new Blob(received);
  assert.equal(Number(params.get('offset')),complete.size);
  assert.deepEqual(JSON.parse(await complete.text()),project);
  return Response.json({id:'grand-projet'});
 };
 try{assert.equal(await publishProject(project),'https://givros-studio.fr/3e-chams/grand-projet');}
 finally{globalThis.fetch=original;}
});

test('an oversized snapshot is refused before a network request is made',async()=>{
 const {publishProject,PROJECT_SIZE_LIMIT}=await import('../src/share.js');
 const project=blankProject();
 project.screens[0].notes='a'.repeat(PROJECT_SIZE_LIMIT);
 await assert.rejects(publishProject(project),/16 Mio/);
});

test('imports reject script markup in tutorial metadata and prototype keys',()=>{
 const project=blankProject();
 project.orderTutorial={level:'<img src=x onerror=alert(1)>',step:'catalog'};
 assert.equal(validateProject(project),false);
 delete project.orderTutorial;
 Object.defineProperty(project.screens[0],'__proto__',{value:{polluted:true},enumerable:true});
 assert.equal(validateProject(project),false);
});
