import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,validateProject,findNode} from '../src/studio-model.js';
import {columnLayout,moveNode} from '../src/studio-layout.js';
test('column layouts have independent vertical columns and retain valid backups',()=>{
 for(const count of [2,3,4]){const p=blankProject(),layout=columnLayout(p,count);p.screens[0].nodes.push(layout);assert.equal(layout.children.length,count);assert.ok(layout.children.every(c=>c.type==='container'&&c.props.direction==='column'));assert.ok(validateProject(p));}
});
test('moving existing components retains IDs, values and actions',()=>{
 const p=blankProject(),layout=columnLayout(p),button=component('button',p);button.events.click=[{type:'toast',value:{kind:'literal',value:'Working'}}];p.screens[0].nodes.push(layout,button);
 assert.ok(moveNode(p,button.id,layout.children[1].id,p.home));assert.equal(findNode(p,button.id).parent.id,layout.children[1].id);assert.equal(button.events.click[0].value.value,'Working');
 assert.ok(moveNode(p,button.id,'root',p.home));assert.equal(findNode(p,button.id).parent,null);assert.ok(validateProject(p));
});
test('dropping a group into itself or descendants cannot create a cycle',()=>{
 const p=blankProject(),layout=columnLayout(p);p.screens[0].nodes.push(layout);const before=JSON.stringify(p);
 assert.equal(moveNode(p,layout.id,layout.id,p.home),false);assert.equal(moveNode(p,layout.id,layout.children[0].id,p.home),false);assert.equal(moveNode(p,layout.id,'missing',p.home),false);assert.equal(JSON.stringify(p),before);
});
