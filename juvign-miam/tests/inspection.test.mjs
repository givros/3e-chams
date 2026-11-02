import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,variable} from '../src/studio-model.js';
import {describeTestState} from '../src/studio-inspection.js';
test('test inspection presents friendly labels while retaining actual values',()=>{const p=blankProject(),score=variable(p,'score','number',0);score.label='Mon score';const result=describeTestState(p,{state:{score:5},log:[{action:'increment',variable:'score',screen:p.home}]});assert.equal(result.variables[0].label,'Mon score');assert.equal(result.variables[0].value,5);assert.equal(result.actions[0].variable,'Mon score');assert.equal(result.actions[0].screen,'Accueil');});
test('conditional traces identify the selected branch',()=>{const p=blankProject();const result=describeTestState(p,{log:[{action:'if',result:false,screen:p.home}]});assert.equal(result.actions[0].branch,'Condition fausse');});
