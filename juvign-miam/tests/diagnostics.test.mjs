import test from 'node:test';
import assert from 'node:assert/strict';
import {restaurantTemplate,blankProject,component,variable} from '../src/studio-model.js';
import {projectIssues} from '../src/studio-diagnostics.js';
test('working restaurant templates have no missing bindings',()=>assert.deepEqual(projectIssues(restaurantTemplate()),[]));
test('deleted data is reported in text, calculations and nested conditions',()=>{
 const p=blankProject(),n=component('heading',p),v=variable(p,'calculation','computed');p.screens[0].nodes.push(n);n.props.textVariable='deleted';v.formula={kind:'variable',name:'missing'};
 n.events.click=[{type:'if',conditions:[{left:{kind:'variable',name:'gone'},op:'eq',right:{kind:'literal',value:1}}],then:[{type:'navigate',screen:'removed'}],else:[]}];
 assert.equal(projectIssues(p).length,3);
});
test('wrong data types and item-only actions are reported before testing',()=>{
 const p=blankProject(),n=component('button',p),v=variable(p,'text','text','');p.screens[0].nodes.push(n);n.events.click=[{type:'cartAdd',variable:v.name}];assert.equal(projectIssues(p).length,2);
});
