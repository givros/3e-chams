import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppTimers} from '../src/studio-timers.js';
import {blankProject,component,validateProject} from '../src/studio-model.js';
import {projectIssues} from '../src/studio-diagnostics.js';
import {connectScreen,screenConnections} from '../src/studio-connections.js';
import {moveActionBlock} from '../src/studio-drag.js';

function clock(){let time=0,scheduled=0,cancelled=0;const finished=[],updates=[];const timer=createAppTimers({now:()=>time,schedule:()=>++scheduled,cancel:()=>cancelled++,onTick:(...args)=>updates.push(args),onFinish:id=>finished.push(id)});return {timer,finished,updates,advance:ms=>{time+=ms;timer.tick();},counts:()=>({scheduled,cancelled})};}
test('deadlines catch up after delayed ticks and finish exactly once',()=>{
 const c=clock();c.timer.configure([{id:'a',duration:5}]);c.timer.start('a');c.advance(4500);assert.equal(c.timer.snapshot('a').seconds,1);c.advance(2000);assert.equal(c.timer.snapshot('a').seconds,0);assert.deepEqual(c.finished,['a']);c.advance(10000);assert.deepEqual(c.finished,['a']);assert.deepEqual(c.counts(),{scheduled:1,cancelled:1});
 c.timer.start('a');c.advance(5000);assert.deepEqual(c.finished,['a','a']);c.timer.destroy();
});
test('pause and resume preserve fractional seconds and leaving a screen pauses its clock',()=>{
 const c=clock();c.timer.configure([{id:'a',duration:5}]);c.timer.start('a');c.advance(1500);c.timer.pause('a');c.advance(60000);assert.equal(c.timer.snapshot('a').seconds,4);c.timer.start('a');c.advance(500);assert.equal(c.timer.snapshot('a').seconds,3);
 c.timer.configure([]);c.advance(20000);assert.equal(c.timer.snapshot('a').seconds,3);assert.equal(c.timer.snapshot('a').running,false);c.timer.destroy();
});
test('design mode, reset, independent clocks and disposal do not leave active intervals',()=>{
 const c=clock();c.timer.configure([{id:'a',duration:5,autoStart:true},{id:'b',duration:10,autoStart:true}]);c.advance(5000);assert.deepEqual(c.finished,['a']);assert.equal(c.timer.snapshot('b').seconds,5);c.timer.reset('b');assert.equal(c.timer.snapshot('b').seconds,10);assert.equal(c.timer.snapshot('b').running,false);
 c.timer.configure([{id:'a',duration:1,autoStart:true}],false);assert.equal(c.timer.snapshot('a'),null);c.advance(10000);assert.deepEqual(c.finished,['a']);c.timer.destroy();
});
test('restoring zero seconds does not replay an already completed timer',()=>{const c=clock();c.timer.configure([{id:'a',duration:60,autoStart:true,initialSeconds:0}]);assert.equal(c.timer.snapshot('a').running,false);c.advance(100000);assert.deepEqual(c.finished,[]);c.timer.destroy();});
test('timer projects retain end actions, and malformed durations or foreign finish events are rejected',()=>{
 const p=blankProject(),timer=component('timer',p);p.screens[0].nodes.push(timer);assert.ok(validateProject(JSON.parse(JSON.stringify(p))));assert.deepEqual(projectIssues(p),[]);
 timer.props.duration=-1;assert.equal(validateProject(p),false);timer.props.duration=1.5;assert.equal(validateProject(p),false);timer.props.duration=60;const button=component('button',p);button.events.finish=[];p.screens[0].nodes.push(button);assert.equal(validateProject(p),false);
});
test('end actions support visual screen connections and action drag-and-drop',()=>{
 const p=blankProject(),timer=component('timer',p);p.screens[0].nodes.push(timer);p.screens.push({id:'done',name:'Done',nodes:[]});
 connectScreen(p,timer.id,'done');assert.equal(timer.events.finish.at(-1).screen,'done');assert.deepEqual(timer.events.click,[]);assert.equal(screenConnections(p)[0].event,'finish');
 assert.ok(moveActionBlock(timer,'events.finish.1','events.finish',0));assert.equal(timer.events.finish[0].type,'navigate');assert.ok(validateProject(p));
});
