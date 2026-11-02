import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,duplicateScreen,validateProject} from '../src/studio-model.js';

test('screen copies keep validation links between separate components inside the copy',()=>{
 const p=blankProject(),s=p.screens[0],form=component('form',p),submit=component('button',p);
 s.menuLabel='Contact';submit.events.click=[{type:'if',conditions:[],then:[{type:'validate',form:form.id},{type:'navigate',screen:s.id}],else:[]}];s.nodes=[form,submit];
 const before=structuredClone(s),copy=duplicateScreen(p,s.id);
 assert.deepEqual(s,before);assert.notEqual(copy.id,s.id);assert.notEqual(copy.nodes[0].id,form.id);
 assert.equal(copy.nodes[1].events.click[0].then[0].form,copy.nodes[0].id);
 assert.equal(copy.nodes[0].children.at(-1).events.click[0].form,copy.nodes[0].id);
 assert.equal(copy.nodes[1].events.click[0].then[1].screen,copy.id);
 assert.equal(copy.menuLabel,copy.name);assert.ok(validateProject(p));
 const second=duplicateScreen(p,s.id);assert.notEqual(second.name,copy.name);
});

test('screen copies retain shared data and links to other screens',()=>{
 const p=blankProject(),s=p.screens[0],input=component('input',p),button=component('button',p);
 p.screens.push({id:'external',name:'Other',nodes:[]});button.events.click=[{type:'navigate',screen:'external'}];s.nodes=[input,button];
 const copy=duplicateScreen(p,s.id);assert.equal(copy.nodes[0].props.variable,input.props.variable);assert.equal(copy.nodes[1].events.click[0].screen,'external');assert.ok(validateProject(p));
});
