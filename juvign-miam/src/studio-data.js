import {walk} from './studio-model.js';
const initialValue=type=>type==='number'?0:type==='boolean'?false:'';
const text=value=>typeof value==='object'&&value!==null?JSON.stringify(value):value===true?'Oui':value===false?'Non':String(value??'');
export function syncDataLabels(project){
 const owners=new Map();walk(project,n=>owners.set(n.id,n));
 for(const v of project.variables)if(v.autoLabelFrom){const owner=owners.get(v.autoLabelFrom);if(owner?.props.variable===v.name)v.label=owner.props.label||owner.name;}
}
export function addListField(variable,field){
 if(variable.fields.some(f=>f.name===field.name))return false;
 const primitive=variable.initial.some(v=>v!==null&&typeof v!=='object');
 const useOriginal=variable.fields.length===0&&primitive&&(field.type==='text'||variable.initial.every(v=>v===null||typeof v===field.type));
 let retained;
 if(primitive&&!useOriginal){let name='value',i=2;while(variable.fields.some(f=>f.name===name)||field.name===name)name='value'+i++;retained={name,label:'Valeur conservée',type:'text'};variable.fields.push(retained);}
 variable.initial=variable.initial.map(item=>{
  const record=item&&typeof item==='object'&&!Array.isArray(item)?{...item}:retained?{[retained.name]:text(item)}:{};
  if(!Object.hasOwn(record,field.name))record[field.name]=useOriginal?(field.type==='text'?text(item):item??initialValue(field.type)):initialValue(field.type);
  return record;
 });variable.fields.push(field);return true;
}
export function changeListFieldType(variable,index,type){
 const field=variable.fields[index];if(!field)throw Error('Ce champ a été supprimé.');
 const convert=value=>{
  if(type==='text')return text(value);
  if(type==='number'){const number=typeof value==='string'?Number(value.trim().replace(',','.')):Number(value);if(Number.isFinite(number))return number;throw Error('« '+text(value).slice(0,45)+' » n’est pas un nombre.');}
  if(type==='boolean'){const normalized=text(value).trim().toLowerCase();if(['oui','vrai','true','1'].includes(normalized))return true;if(['non','faux','false','0',''].includes(normalized))return false;throw Error('Utilise Oui ou Non dans cette colonne.');}
  if(type==='image'){const source=String(value??'');if(!source||/^(assets\/|data:image\/(png|jpeg|webp|gif);base64,)/.test(source))return source;throw Error('Cette colonne doit contenir des images importées ou des cases vides.');}
  throw Error('Type de champ inconnu.');
 };
 const rows=variable.initial.map(item=>{const record=item&&typeof item==='object'&&!Array.isArray(item)?{...item}:{[variable.fields[0].name]:item};record[field.name]=convert(record[field.name]);return record;});variable.initial=rows;field.type=type;
}
export function connectListFields(project,variable){
 const fields=variable.fields||[];
 walk(project,n=>{
  if(n.props.variable!==variable.name)return;
  if(n.type==='list'&&['{{item}}','{{item.name}}'].includes(n.props.itemText)){const first=fields.find(f=>f.type==='text');if(first)n.props.itemText='{{item.'+first.name+'}}';}
  if(['products','productDetail'].includes(n.type))for(const [key,type]of [['nameField','text'],['priceField','number'],['imageField','image']])if(!fields.some(f=>f.name===n.props[key])){const match=fields.find(f=>f.type===type);if(match)n.props[key]=match.name;}
 });
}
