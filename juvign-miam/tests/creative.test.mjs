import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visualDraft,onlyVisualChange,accentText,checkField,defaults} from '../src/identity.js';
import {standaloneHTML} from '../src/export-app.js';
import {solution} from '../src/course.js';

test('live identity can be read while the function being edited is incomplete',()=>{
 const draft=visualDraft('const restaurantName = "Moon Tacos";\nconst accentColor = "#facc15";\nconst tagline = "Un tacos lunaire.";\nfunction addQuantity(q) { return');
 assert.equal(draft.restaurantName,'Moon Tacos');assert.equal(draft.accentColor,'#facc15');
});
test('visual preview never executes expressions and ignores malformed colors',()=>{
 const draft=visualDraft('const restaurantName = window.alert("oops");\nconst accentColor = "url(evil)";\nconst mainPrice = 1;');
 assert.deepEqual(draft,{});
});
test('appearance edits and logic edits are distinguished',()=>{
 assert.equal(onlyVisualChange('const theme="ocean";\nfunction f(){return 1;}','const theme="arcade";\nfunction f(){return 1;}'),true);
 assert.equal(onlyVisualChange('function f(){return 1;}','function f(){return 2;}'),false);
});
test('custom colors receive a readable foreground',()=>{assert.equal(accentText('#facc15'),'#000000');assert.equal(accentText('#181028'),'#ffffff');});
test('spotlight and photo choices are usable configuration values',()=>{assert.doesNotThrow(()=>checkField('menuLayout','spotlight',defaults));assert.doesNotThrow(()=>checkField('mainPhoto','tacos',defaults));});
test('standalone output embeds valid script and escapes student markup',()=>{
 const name='Moon </script><script>alert(1)</script>';
 const html=standaloneHTML({name,source:solution,config:defaults,menu:[],images:{},onAccent:'#ffffff',specialty:'Tacos'},'body{color:black}');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Function(scripts[0][1]));assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes('worker-src blob:'));
});
