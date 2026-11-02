import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,validateProject,duplicateNode} from '../src/studio-model.js';
import {libraryEntries} from '../src/studio-library.js';
import {mobileAppTemplate,screenTemplates,addScreenTemplate} from '../src/screen-templates.js';
import {projectIssues} from '../src/studio-diagnostics.js';
test('all interactive fields start with correctly typed independent data',()=>{
 const p=blankProject();for(const type of ['search','date','range','rating','progress','form','accordion','badge'])p.screens[0].nodes.push(component(type,p));assert.ok(validateProject(p));assert.deepEqual(projectIssues(p),[]);
});
test('copied form validation targets point to the copy instead of the original',()=>{const p=blankProject(),form=component('form',p),copy=duplicateNode(form);assert.notEqual(copy.id,form.id);assert.equal(copy.children.at(-1).events.click[0].form,copy.id);});
test('library search is accent-insensitive and groups all entries',()=>{assert.ok(libraryEntries('etoiles').some(e=>e.type==='rating'));assert.ok(libraryEntries('recherche').some(e=>e.type==='search'));assert.ok(libraryEntries('','navigation').every(e=>e.category==='navigation'));assert.equal(libraryEntries('something impossible').length,0);});
test('mobile starter has a complete navigable menu and no empty leftover screen',()=>{const p=mobileAppTemplate();assert.equal(p.screens.length,4);assert.ok(p.screens.every(s=>s.nodes.length));assert.equal(p.navigation.items.length,4);assert.ok(validateProject(p));assert.deepEqual(projectIssues(p),[]);});
test('every screen template remains valid and free of broken bindings',()=>{for(const template of screenTemplates){const p=blankProject();addScreenTemplate(p,template.id);assert.ok(validateProject(p),template.id);assert.deepEqual(projectIssues(p),[],template.id);}});
