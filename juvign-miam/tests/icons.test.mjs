import test from 'node:test';
import assert from 'node:assert/strict';
import {iconChoices,renderAppIcon} from '../src/studio-icons.js';
import {blankProject,component,validateProject} from '../src/studio-model.js';

test('every icon has a local SVG and the export renderer has no external dependency',()=>{
 const exported=new Function('return ('+renderAppIcon.toString()+')')();
 assert.equal(new Set(iconChoices.map(i=>i.id)).size,iconChoices.length);
 for(const icon of iconChoices){const markup=renderAppIcon(icon.id);assert.match(markup,/^<svg/);assert.equal(exported(icon.id),markup);assert.doesNotMatch(markup,/https?:|<script|onload/);}
 assert.equal(renderAppIcon('<script>'),'');assert.equal(renderAppIcon('__proto__'),'');assert.match(renderAppIcon('heart',1000),/width="120"/);
});

test('icon components and vector navigation survive a saved project',()=>{
 const p=blankProject(),icon=component('icon',p);icon.events.click=[{type:'back'}];p.screens[0].nodes.push(icon);p.screens[0].menuIcon='icon:home';
 assert.ok(validateProject(JSON.parse(JSON.stringify(p))));assert.equal(icon.props.icon,'heart');
});
