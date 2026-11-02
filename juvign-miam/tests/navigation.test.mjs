import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,validateProject} from '../src/studio-model.js';
import {navigationSettings,setNavigation,cleanNavigation} from '../src/studio-navigation.js';
test('existing projects keep navigation disabled until requested',()=>{const p=blankProject();assert.equal(navigationSettings(p).enabled,false);assert.equal(p.navigation,undefined);});
test('enabling navigation includes screens without duplicating entries',()=>{const p=blankProject();p.screens.push({id:'second',name:'Second',background:'#ffffff',nodes:[]});setNavigation(p,{enabled:true});assert.deepEqual(p.navigation.items,p.screens.map(s=>s.id));setNavigation(p,{items:[p.home,p.home,'missing']});assert.deepEqual(p.navigation.items,[p.home]);assert.ok(validateProject(p));});
test('deleted screens are removed from menu settings',()=>{const p=blankProject();setNavigation(p,{enabled:true,style:'drawer'});p.navigation.items.push('deleted');cleanNavigation(p);assert.deepEqual(p.navigation.items,[p.home]);});
test('back buttons contain a real back action',()=>{const p=blankProject(),n=component('back',p);p.screens[0].nodes.push(n);assert.deepEqual(n.events.click,[{type:'back'}]);assert.ok(validateProject(p));});
test('malformed navigation cannot enter via imported projects',()=>{const p=blankProject();setNavigation(p,{enabled:true});p.navigation.items=['x','x'];assert.equal(validateProject(p),false);});
