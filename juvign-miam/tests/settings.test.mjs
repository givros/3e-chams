import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,validateProject} from '../src/studio-model.js';
import {addScreenTemplate} from '../src/screen-templates.js';
import {setNavigation} from '../src/studio-navigation.js';
import {projectIssues} from '../src/studio-diagnostics.js';
import {applyThemePreset} from '../src/studio-theme.js';

test('editable settings keep their theme switch and gear destination through a project backup',()=>{
 const p=blankProject(),s=addScreenTemplate(p,'settings');setNavigation(p,{enabled:true,style:'both',headerIcon:'settings'});
 assert.equal(p.navigation.settingsScreen,s.id);const dark=p.theme.darkVariable;applyThemePreset(p,'orange');assert.equal(p.theme.darkVariable,dark);
 const saved=JSON.parse(JSON.stringify(p));assert.ok(validateProject(saved));assert.deepEqual(projectIssues(saved),[]);
 saved.variables=saved.variables.filter(v=>v.name!==dark);assert.ok(projectIssues(saved).some(message=>message.startsWith('Mode sombre')));
});

test('additional settings models share the existing theme switch without deleting original data',()=>{
 const p=blankProject();addScreenTemplate(p,'settings');const dark=p.theme.darkVariable,first=p.variables.find(v=>v.name===dark);addScreenTemplate(p,'settings');
 assert.equal(p.theme.darkVariable,dark);assert.equal(p.variables.filter(v=>v.name===dark).length,1);assert.equal(p.variables.find(v=>v.name===dark),first);assert.ok(validateProject(p));assert.deepEqual(projectIssues(p),[]);
});
