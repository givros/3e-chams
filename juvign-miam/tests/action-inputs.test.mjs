import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,component,variable,action} from '../src/studio-model.js';
import {expectedValueType,conditionValueType,normalizeActionInputs} from '../src/studio-actions.js';
test('boolean set actions and conditions use actual booleans rather than display text',()=>{const p=blankProject(),v=variable(p,'enabled','boolean',false),button=component('button',p);button.events.click=[{type:'set',variable:v.name,value:{kind:'literal',value:'Oui'}}];normalizeActionInputs(p,button);assert.equal(button.events.click[0].value.value,true);assert.equal(action('set',p).value.value,false);assert.equal(action('if',p).conditions[0].right.value,false);});
test('date controls give their linked data a date literal editor',()=>{const p=blankProject(),date=component('date',p);p.screens[0].nodes.push(date);assert.equal(expectedValueType(p,date.props.variable),'date');assert.equal(conditionValueType(p,{kind:'variable',name:date.props.variable}),'date');});
test('computed read-only values are never the default destination of a write action',()=>{const p=blankProject();variable(p,'calc','computed',0);assert.equal(action('set',p).variable,'');});
