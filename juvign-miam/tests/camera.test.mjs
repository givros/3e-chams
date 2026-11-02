import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,validateProject} from '../src/studio-model.js';
import {projectIssues} from '../src/studio-diagnostics.js';
import {createLocalCamera} from '../src/studio-camera.js';

test('camera photos bind to independent text data and survive project backups',()=>{
 const p=blankProject(),camera=component('camera',p),other=component('camera',p);p.screens[0].nodes=[camera,other];
 assert.notEqual(camera.props.variable,other.props.variable);assert.equal(p.variables.find(v=>v.name===camera.props.variable).initial,'');
 assert.ok(validateProject(JSON.parse(JSON.stringify(p))));assert.deepEqual(projectIssues(p),[]);
});

test('standalone camera helper has no external code dependency and can be stopped before activation',()=>{
 const exported=new Function('return ('+createLocalCamera.toString()+')')();const camera=exported();camera.stop();camera.destroy();
 assert.equal(typeof camera.capture,'function');assert.throws(()=>camera.capture(),/Ouvre/);
});
