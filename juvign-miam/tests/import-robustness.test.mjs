import test from 'node:test';
import assert from 'node:assert/strict';
import {restaurantTemplate,blankProject,component,variable,validateProject} from '../src/studio-model.js';

test('malformed imports are rejected before the editor can render them',()=>{
 const mutations=[
  p=>p.id='"><img src=x onerror=alert(1)>',p=>p.screens[0].id='"><script>',
  p=>p.screens[0].background='" autofocus onfocus="alert(1)',
  p=>p.screens[0].nodes[0].id='bad"id',p=>p.screens[0].nodes[0].events.click={},
  p=>delete p.screens[0].nodes[0].events.item,p=>p.screens[0].nodes[0].style=[],
  p=>p.screens[0].nodes[0].props=null,p=>p.screens[0].nodes[0].name=null,
  p=>p.screens[0].nodes[0].events.click=[{type:'if',conditions:[null]}],
  p=>p.screens[0].nodes[0].events.click=[{type:'increment',delta:'oops'}],
  p=>p.variables[0].fields.push({...p.variables[0].fields[0]}),
  p=>p.variables[0].fields.push({name:'constructor',type:'text'}),
  p=>p.variables[0].initial=JSON.parse('[{"__proto__":{"bad":true}}]'),
  p=>p.screens[0].nodes[0].children=[null],p=>p.theme.primary='red'
 ];
 for(const mutate of mutations){const p=restaurantTemplate();mutate(p);assert.equal(validateProject(p),false);}
});
test('deep calculations and circular in-memory objects cannot overflow import validation',()=>{
 const p=blankProject(),v=variable(p,'calc','computed');let formula={kind:'literal',value:1};
 for(let i=0;i<100;i++)formula={kind:'math',op:'add',a:formula,b:{kind:'literal',value:1}};
 v.formula=formula;assert.equal(validateProject(p),false);v.formula={kind:'literal',value:p};assert.equal(validateProject(p),false);
});
test('mixed list records infer fields from an object instead of crashing on null',()=>{
 const p=blankProject();const v=variable(p,'records','list',[null,'text',{name:'Test',price:3}]);
 assert.deepEqual(v.fields.map(f=>f.name),['name','price']);assert.ok(validateProject(p));
});
test('incomplete action targets remain saveable while malformed operands do not',()=>{
 const p=blankProject(),n=component('button',p);p.screens[0].nodes.push(n);
 n.events.click=[{type:'set',variable:'',value:{kind:'literal',value:''}}];assert.ok(validateProject(p));
 n.events.click[0].value={kind:'math',op:'unknown'};assert.equal(validateProject(p),false);
});
test('mutated structural fields never throw during validation',()=>{
 const paths=[['screens'],['variables'],['theme'],['screens',0],['screens',0,'nodes'],['screens',0,'nodes',0],['screens',0,'nodes',0,'events'],['variables',0,'fields']];
 for(const path of paths)for(const value of [null,false,0,'bad',[],{}]){
  const p=restaurantTemplate();let target=p;for(const part of path.slice(0,-1))target=target[part];target[path.at(-1)]=value;
  assert.doesNotThrow(()=>validateProject(p));
 }
});
test('overflowing JSON numbers are rejected inside list data and action values',()=>{
 const p=restaurantTemplate();p.variables[0].initial[0].price=JSON.parse('1e400');assert.equal(validateProject(p),false);
 p.variables[0].initial[0].price=10;p.screens[0].nodes[0].events.click=[{type:'toast',value:{kind:'literal',value:Infinity}}];assert.equal(validateProject(p),false);
});
