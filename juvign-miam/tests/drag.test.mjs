import test from 'node:test';
import assert from 'node:assert/strict';
import {insertionIndex,moveActionBlock} from '../src/studio-drag.js';

test('drop positions distinguish vertical lists, rows and wrapping grids',()=>{
 const rects=[{top:0,left:0,width:100,height:50},{top:60,left:0,width:100,height:50}];
 assert.equal(insertionIndex(rects,20,15),0);assert.equal(insertionIndex(rects,20,50),1);assert.equal(insertionIndex(rects,20,120),2);
 const grid=[{top:0,left:0,width:90,height:50},{top:0,left:100,width:90,height:50},{top:60,left:0,width:90,height:50}];
 assert.equal(insertionIndex(grid,120,20,false,true),1);assert.equal(insertionIndex(grid,30,70,false,true),2);assert.equal(insertionIndex(grid,180,90,false,true),3);
});
test('actions move between branches without allowing an if block to contain itself',()=>{
 const a={type:'toast'},b={type:'if',then:[],else:[]},node={events:{click:[a,b],change:[],item:[]}};
 assert.equal(moveActionBlock(node,'events.click.1','events.click.1.then',0),false);assert.equal(moveActionBlock(node,'events.click.0','events.click.1.then',0),true);assert.equal(b.then[0],a);
 assert.equal(moveActionBlock(node,'events.click.0.then.0','events.click',0),true);assert.deepEqual(node.events.click,[a,b]);
 assert.equal(moveActionBlock(node,'events.click.0','__proto__.x',0),false);
});
