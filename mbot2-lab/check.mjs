import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',addEventListener(){},click(){},value:''});return nodes.get(key)};
const storage=new Map();
const context=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],createElement:()=>({click(){}})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},location:{hash:''},window:{addEventListener(){},scrollTo(){},print(){}},setTimeout,URL,Blob,console,confirm:()=>true});
vm.runInContext(fs.readFileSync('mbot2-lab/app.js','utf8'),context);
for(const route of ['overview','team','missions','brief','tests','report','resources',...Array.from({length:6},(_,i)=>'mission-'+i)]){context.location.hash='#'+route;vm.runInContext('render()',context);assert.ok(node('#app').innerHTML.length>300,route)}
vm.runInContext("s.tests=[{scenario:'Full delivery',collision:'No',stable:'Yes',achieved:'Yes'},{scenario:'Full delivery',collision:'No',stable:'Yes',achieved:'Yes'},{scenario:'Full delivery',collision:'No',stable:'Yes',achieved:'Yes'}]",context);
assert.equal(vm.runInContext('streak()',context),3);
vm.runInContext("s.tests.push({scenario:'Full delivery',collision:'Yes',stable:'Yes',achieved:'Yes'})",context);
assert.equal(vm.runInContext('streak()',context),0);
assert.equal(vm.runInContext("esc('<script>')",context),'&lt;script&gt;');
vm.runInContext('s=empty();save()',context);assert.ok(storage.size);
assert.equal(vm.runInContext("valid({...empty(),format:'mbot2-lab'})",context),true);
assert.equal(vm.runInContext("valid({...empty(),format:'mbot2-lab',tests:[{}]})",context),false);
for(const file of ['', 'app.js','style.css']){const r=await fetch('http://localhost:5182/'+file);assert.equal(r.status,200)}
console.log('PASS: 13 views, delivery streak and reset, escaping, persistence, import validation, 3 HTTP resources.');
