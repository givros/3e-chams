import {test} from 'node:test';
import assert from 'node:assert/strict';
import {course,solution} from '../src/course.js';
import {evaluate} from '../src/engine.js';
import {migrateSource,prepareSeed} from '../src/identity.js';
const tests=course.flatMap(m=>m.tests||[]);
const custom=solution.replace('"burger"','"pizza"').replace('"sunset"','"arcade"').replace('"list"','"tiles"').replace('mainPrice = 9.9','mainPrice = 12').replace('sidePrice = 4.5','sidePrice = 4').replace('drinkPrice = 3.5','drinkPrice = 2').replace('deliveryPrice = 2.9','deliveryPrice = 4.5').replace('freeDeliveryAt = 20','freeDeliveryAt = 30').replace('promoCode = "MIAM"','promoCode = "PIXEL"').replace('promoMinimum = 15','promoMinimum = 18').replace('promoValue = 3','promoValue = 4');
test('personal rules pass with different prices, threshold and promotion',()=>assert.equal(evaluate(custom,tests),true));
test('checks reject delivery rules copied from another restaurant',()=>assert.throws(()=>evaluate(custom.replace('amount >= freeDeliveryAt','amount >= 20'),tests),/deliveryFee/));
test('checks reject a hardcoded discount from the demonstration',()=>assert.throws(()=>evaluate(custom.replace('return promoValue','return 3'),tests),/discount/));
test('a personal promotion includes its exact minimum',()=>{
 assert.equal(evaluate(custom,[],{method:'discount',args:['PIXEL',18]}),4);
 assert.equal(evaluate(custom,[],{method:'discount',args:['PIXEL',17.99]}),0);
 assert.equal(evaluate(custom,[],{method:'discount',args:['MIAM',30]}),0);
});
test('invalid themes and impossible monetary settings are rejected',()=>{
 assert.throws(()=>evaluate(custom.replace('"arcade"','"unknown"'),tests),/theme/);
 assert.throws(()=>evaluate(custom.replace('promoValue = 4','promoValue = 99'),tests),/promoValue/);
});
test('old student work migrates without changing its functions',()=>{
 const old='const restaurantName="Old";\nfunction addQuantity(quantity){return quantity+1;}';
 const migrated=migrateSource(old);assert.ok(migrated.startsWith(old));assert.equal(migrateSource(migrated),migrated);
 assert.equal(migrateSource(''),'');
 const seed=prepareSeed(migrated,course[4].seed);assert.ok(!seed.includes('const mainPrice'));assert.ok(seed.includes('function lineTotal'));
});
test('configuration preserves distinct restaurant identities',()=>{
 const config=evaluate(custom,[],{method:'config'});assert.equal(config.cuisine,'pizza');assert.equal(config.theme,'arcade');assert.equal(config.menuLayout,'tiles');assert.equal(config.freeDeliveryAt,30);
});
