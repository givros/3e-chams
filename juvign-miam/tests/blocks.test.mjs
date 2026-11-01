import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newProject,validProject,steps,components,ready,addQuantity,removeQuantity,lineTotal,deliveryFee,discount,deliveryCases,promoCases,generateCode,invalidate} from '../src/blocks.js';
test('an empty visual project can be saved but cannot skip construction',()=>{const p=newProject();assert.equal(validProject(p),true);assert.equal(ready(p,0),false);assert.equal(ready(p,7),false);});
test('all four components are required to build the screen',()=>{const p=newProject();p.components=components.slice(0,3).map(c=>c.id);assert.equal(ready(p,1),false);p.components.push('cart');assert.equal(ready(p,1),true);});
test('wrong event targets and wrong actions have observable behavior',()=>{const p=newProject();p.add={target:'price',action:'increment'};assert.equal(addQuantity(p,2),2);p.add={target:'quantity',action:'reset'};assert.equal(addQuantity(p,2),0);p.add.action='increment';assert.equal(addQuantity(p,2),3);assert.equal(ready(p,3),false);p.evidence.addTest=true;assert.equal(ready(p,3),true);});
test('the quantity bug must be observed and retested after repair',()=>{const p=newProject();assert.equal(removeQuantity(p,0),-1);p.guard=true;assert.equal(removeQuantity(p,0),0);assert.equal(ready(p,4),false);p.evidence.sawNegative=true;p.evidence.zeroTest=true;assert.equal(ready(p,4),true);});
test('arithmetic choices affect the real result',()=>{const p=newProject();p.operator='plus';assert.equal(lineTotal(p,12,2),14);p.operator='multiply';assert.equal(lineTotal(p,12,2),24);assert.equal(ready(p,5),false);p.evidence.lineTest=true;assert.equal(ready(p,5),true);});
test('strict comparison fails at the student’s chosen threshold',()=>{const p=newProject();p.delivery={comparator:'gt',threshold:30,fee:4.5};assert.equal(deliveryCases(p).filter(c=>c.actual!==c.expected).length,1);p.delivery.comparator='gte';assert.ok(deliveryCases(p).every(c=>c.actual===c.expected));});
test('OR and AND produce different promotion behavior',()=>{const p=newProject();p.promo={join:'or',code:'SPACE',minimum:18,value:4};assert.equal(promoCases(p).filter(c=>c.actual!==c.expected).length,2);p.promo.join='and';assert.ok(promoCases(p).every(c=>c.actual===c.expected));});
test('generated JavaScript agrees with the block interpreter for every rule choice',()=>{
 for(const target of ['quantity','price',null])for(const action of ['increment','double','reset',null])for(const operator of ['multiply','plus','subtract',null])for(const comparator of ['gte','gt',null])for(const join of ['and','or',null]){
  const p=newProject();p.add={target,action};p.operator=operator;p.delivery.comparator=comparator;p.promo={join,code:'CODE',minimum:18,value:4};
  const api=new Function(generateCode(p)+'\nreturn {addQuantity,removeQuantity,lineTotal,deliveryFee,discount};')();
  assert.equal(api.addQuantity(2),addQuantity(p,2));assert.equal(api.removeQuantity(0),removeQuantity(p,0));assert.equal(api.lineTotal(12,2),lineTotal(p,12,2));assert.equal(api.deliveryFee(25),deliveryFee(p,25));assert.equal(api.discount('CODE',17),discount(p,'CODE',17));
 }
});
test('changing a condition clears its old test evidence',()=>{const p=newProject();p.completed=[0,1,2,3,4,5,6,7];p.evidence={addTest:true,deliveryTest:true,promoTest:true,orderTest:true};invalidate(p,6);assert.equal(p.evidence.addTest,true);assert.equal(p.evidence.deliveryTest,undefined);assert.equal(p.evidence.orderTest,undefined);assert.deepEqual(p.completed,[0,1,2,3,4,5]);});
test('malformed visual backups are rejected',()=>{const p=newProject();p.menu[0].image='https://other.invalid/image.jpg';assert.equal(validProject(p),false);});
test('a completed promotion alone cannot complete the final order',()=>{const p=newProject();p.promo={join:'and',code:'SPACE',minimum:18,value:4};p.evidence.promoTest=true;assert.equal(ready(p,7),false);p.evidence.orderTest=true;assert.equal(ready(p,7),true);});
test('eight activities fit the planned two-hour workshop',()=>{assert.equal(steps.length,8);assert.equal(steps.reduce((n,s)=>n+s.minutes,0),110);});
