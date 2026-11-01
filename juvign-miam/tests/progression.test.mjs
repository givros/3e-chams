import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProgress,ready,record,needsReview,guidanceFor} from '../src/progression.js';

const fresh=()=>normalizeProgress({completed:[]});
test('valid code alone cannot complete a required phone experiment',()=>{
 const state=fresh();assert.equal(ready(state,2),false);
 record(state,2,'remove-one');assert.equal(ready(state,2),false);
 record(state,2,'zero');assert.equal(ready(state,2),true);
});
test('rapid learners bypass redundant recall questions',()=>{
 const state=fresh();assert.equal(needsReview(state,3),false);assert.equal(needsReview(state,10),false);
});
test('repeated difficulties add review, and successful coaching avoids repeating it',()=>{
 const state=fresh();state.attempts[1]=2;assert.equal(needsReview(state,3),true);
 state.diagnostics.push(3);assert.equal(needsReview(state,3),false);
});
test('delivery evidence can be collected before its dedicated practice step',()=>{
 const state=fresh();record(state,7,'paid');record(state,7,'free');assert.equal(ready(state,7),true);
});
test('discount acceptance alone does not establish the two rejection cases',()=>{
 const state=fresh();record(state,8,'promo-accepted');assert.equal(ready(state,8),false);
 record(state,8,'promo-small');record(state,8,'promo-rejected');assert.equal(ready(state,8),true);
});
test('unknown observations cannot grant objectives',()=>assert.equal(record(fresh(),2,'order'),false));
test('existing completed work is preserved during migration',()=>{
 const state=normalizeProgress({completed:[2,7]});assert.equal(ready(state,2),true);assert.equal(ready(state,7),true);
});
test('guidance distinguishes syntax from a failed business rule',()=>{
 assert.match(guidanceFor(6,1,'Unexpected token','solution'),/guillemets/);
 assert.match(guidanceFor(6,1,'deliveryFee(20) must return 0','solution'),/exactement/);
 assert.match(guidanceFor(6,3,'deliveryFee(20) must return 0','specific hint'),/specific hint/);
});
