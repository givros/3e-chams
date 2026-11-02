import test from 'node:test';
import assert from 'node:assert/strict';
import {starterProject,starterProgress,addStarterNode,dropStarterNode} from '../src/studio-start.js';
import {connectScreen,disconnectScreen,screenConnections} from '../src/studio-connections.js';
import {component,validateProject} from '../src/studio-model.js';

test('starter completion depends on the actual screen contents and ordering',()=>{
 const p=starterProject();assert.equal(starterProgress(p).done,false);
 const image=addStarterNode(p,'image'),title=addStarterNode(p,'heading'),button=addStarterNode(p,'button');title.props.text='Mon univers';image.props.src='assets/mountain.jpg';button.props.text='Découvrir';
 assert.equal(starterProgress(p).done,false);p.screens[0].nodes=[title,image,button];assert.equal(starterProgress(p).done,false);for(const [index,type]of ['heading','image','button'].entries())dropStarterNode(p,{type},index);assert.equal(starterProgress(p).done,true);
 assert.equal(addStarterNode(p,'button'),null);assert.equal(addStarterNode(p,'camera'),null);assert.ok(validateProject(p));
 button.props.text='Autre chose';assert.equal(starterProgress(p).done,false);
});

test('dropping creates a single block and moving it preserves its edits',()=>{
 const p=starterProject(),photo=dropStarterNode(p,{type:'image'},0),title=dropStarterNode(p,{type:'heading'},1);title.props.text='Mon univers';
 assert.deepEqual(p.screens[0].nodes.map(n=>n.type),['image','heading']);
 dropStarterNode(p,{id:title.id},0);assert.deepEqual(p.screens[0].nodes.map(n=>n.type),['heading','image']);assert.equal(title.props.text,'Mon univers');
 dropStarterNode(p,{type:'image'},0);assert.equal(p.screens[0].nodes.length,2);assert.equal(p.screens[0].nodes[0],photo);
 assert.equal(dropStarterNode(p,{id:'missing'},0),null);assert.equal(dropStarterNode(p,{type:'camera'},0),null);assert.equal(dropStarterNode(p,{type:'button'},99),null);assert.ok(validateProject(p));
});

test('visual links replace direct navigation while retaining other button actions and their order',()=>{
 const p=starterProject(),button=addStarterNode(p,'button');p.screens.push({id:'second',name:'Second',nodes:[]});
 button.events.click=[{type:'toast',value:{kind:'literal',value:'Hello'}},{type:'navigate',screen:p.home},{type:'reset'}];
 connectScreen(p,button.id,'second');assert.equal(button.events.click[1].screen,'second');assert.equal(button.events.click[0].type,'toast');assert.equal(button.events.click[2].type,'reset');
 connectScreen(p,button.id,'back');assert.equal(button.events.click[1].type,'back');disconnectScreen(p,button.id);assert.deepEqual(button.events.click.map(a=>a.type),['toast','reset']);assert.ok(validateProject(p));
});

test('conditional navigation is visible but cannot be silently overwritten by a direct visual link',()=>{
 const p=starterProject(),button=component('button',p);p.screens[0].nodes=[button];button.events.click=[{type:'if',conditions:[],then:[{type:'navigate',screen:p.home}],else:[]}];
 const before=structuredClone(button);assert.equal(screenConnections(p)[0].conditional,true);assert.throws(()=>connectScreen(p,button.id,p.home),/Si/);assert.deepEqual(button,before);
 assert.throws(()=>connectScreen(p,button.id,'deleted'),/existe/);
});

test('article links preserve selected-item data actions and leave ordinary clicks unchanged',()=>{
 const p=starterProject(),products=component('products',p);p.screens[0].nodes=[products];p.screens.push({id:'detail',name:'Detail',nodes:[]});
 products.events.item=[{type:'cartAdd',variable:'cart',quantity:1},{type:'toast',value:{kind:'literal',value:'Added'}}];
 connectScreen(p,products.id,'detail');assert.equal(products.events.item.at(-1).screen,'detail');assert.equal(products.events.item[0].type,'cartAdd');assert.deepEqual(products.events.click,[]);
 assert.equal(screenConnections(p)[0].event,'item');disconnectScreen(p,products.id);assert.deepEqual(products.events.item.map(a=>a.type),['cartAdd','toast']);assert.ok(validateProject(p));
});
