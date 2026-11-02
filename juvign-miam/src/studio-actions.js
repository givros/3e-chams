import {findNode} from './studio-model.js';
export function expectedValueType(project,name){const v=project.variables.find(v=>v.name===name);if(v?.autoLabelFrom&&findNode(project,v.autoLabelFrom)?.node.type==='date')return 'date';return v?.type;}
export function conditionValueType(project,left){if(left?.kind==='variable')return expectedValueType(project,left.name);if(['math','cartTotal','length'].includes(left?.kind))return 'number';if(left?.kind==='literal'&&typeof left.value==='boolean')return 'boolean';return undefined;}
export function normalizeActionInputs(project,node){
 const literal=(operand,type)=>{
  if(operand?.kind!=='literal')return;
  if(type==='boolean'){const value=operand.value;if(typeof value==='boolean')return;operand.value=['true','oui','vrai','1'].includes(String(value).toLowerCase());}
  if(type==='number'){const number=Number(operand.value);operand.value=Number.isFinite(number)?number:0;}
  if(type==='list'&&!Array.isArray(operand.value))operand.value=[];
  if(type==='date'&&typeof operand.value!=='string')operand.value='';
 };
 const visit=list=>{for(const a of list||[]){if(a.type==='set')literal(a.value,expectedValueType(project,a.variable));if(a.type==='if'){for(const c of a.conditions||[])literal(c.right,conditionValueType(project,c.left));visit(a.then);visit(a.else);}}};
 Object.values(node.events||{}).forEach(visit);
}
