import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,validateProject} from '../src/studio-model.js';
import {themePresets,applyThemePreset,readableText,setAppBackground} from '../src/studio-theme.js';
test('all palettes preserve a valid application',()=>{for(const t of themePresets){const p=blankProject();p.screens[0].nodes.push(component('button',p));applyThemePreset(p,t.id);assert.ok(validateProject(p),t.id);assert.equal(p.theme.primary,t.primary);}});
test('global backgrounds update inherited screens while preserving custom screen colors',()=>{const p=blankProject();p.screens.push({id:'custom',name:'Custom',background:'#123456',nodes:[]});setAppBackground(p,'#000000');assert.equal(p.screens[0].background,'#000000');assert.equal(p.screens[1].background,'#123456');});
test('text contrast chooses readable black or white and handles invalid values safely',()=>{assert.equal(readableText('#ffffff'),'#000000');assert.equal(readableText('#000000'),'#ffffff');assert.equal(readableText('#6339c7'),'#ffffff');assert.doesNotThrow(()=>readableText('#'));});
test('new components inherit the application radius until individually overridden',()=>{const p=blankProject(),button=component('button',p);assert.equal(button.style.radius,undefined);button.style.radius=24;applyThemePreset(p,'paper');assert.equal(button.style.radius,24);});
