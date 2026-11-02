import {actionTypes} from './studio-model.js';
export function describeTestState(project,detail={}){
 const variables=project.variables.map(v=>({name:v.name,label:v.label||v.name,type:v.type,fields:v.fields||[],value:detail.state?.[v.name]}));
 const actions=(detail.log||[]).slice(-20).map(a=>({label:actionTypes.find(([id])=>id===a.action)?.[1]||a.action,variable:project.variables.find(v=>v.name===a.variable)?.label||'',screen:project.screens.find(s=>s.id===a.screen)?.name||'',branch:a.action==='if'&&typeof a.result==='boolean'?(a.result?'Condition vraie':'Condition fausse'):''}));
 return {variables,actions,notice:detail.notice||''};
}
