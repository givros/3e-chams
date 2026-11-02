import test from 'node:test';
import assert from 'node:assert/strict';
import {restaurantTemplate,validateProject,blankProject,component} from '../src/studio-model.js';
import {createProductDetails} from '../src/studio-detail.js';
import {projectIssues} from '../src/studio-diagnostics.js';
test('linked detail screens retain selected-record fields and valid cart actions',()=>{const p=restaurantTemplate(),source=p.screens[0].nodes.find(n=>n.type==='products'),result=createProductDetails(p,source.id);assert.ok(validateProject(p));assert.deepEqual(projectIssues(p),[]);assert.equal(result.screen.menuHidden,true);assert.equal(result.node.props.identityVariable,source.props.variable);assert.deepEqual(source.events.item.map(a=>a.type),['set','append','navigate']);assert.equal(result.node.events.item[0].type,'cartAdd');});
test('repeated detail creation uses independent screens and selected data',()=>{const p=restaurantTemplate(),source=p.screens[0].nodes.find(n=>n.type==='products'),a=createProductDetails(p,source.id),b=createProductDetails(p,source.id);assert.notEqual(a.screen.id,b.screen.id);assert.notEqual(a.selection.name,b.selection.name);assert.ok(validateProject(p));});
test('default detail components are usable without generating a linked screen',()=>{const p=blankProject();p.screens[0].nodes.push(component('productDetail',p));assert.ok(validateProject(p));assert.deepEqual(projectIssues(p),[]);});
test('invalid source data cannot create a broken detail flow',()=>{const p=restaurantTemplate(),source=p.screens[0].nodes.find(n=>n.type==='products');source.props.variable='missing';const before=JSON.stringify(p);assert.throws(()=>createProductDetails(p,source.id));assert.equal(JSON.stringify(p),before);});
