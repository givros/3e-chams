import {defaults,configuration,checkField,ruleCases} from './identity.js';
export function evaluate(source, tests = [], request = null) {
  const names = ['restaurantName','addQuantity','removeQuantity','lineTotal','subtotal','deliveryFee','discount','grandTotal',...Object.keys(defaults)];
  const api = new Function('"use strict";\n' + source + '\nreturn {' + names.map(name => `${name}: typeof ${name} === "undefined" ? undefined : ${name}`).join(',') + '};')();
  const config=configuration(api);
  for(const key of Object.keys(defaults))if(api[key]!==undefined)checkField(key,api[key],config);
  const expanded=tests.flatMap(test=>test.type==='delivery'||test.type==='discount'?ruleCases(test.type,config):[test]);
  for (const test of expanded) {
    if(test.type==='field'){checkField(test.key,api[test.key],config);continue;}
    const value = test.type === 'name' ? api[test.key] : typeof api[test.key] === 'function' ? api[test.key](...test.args) : undefined;
    if (test.type === 'name') {
      if (typeof value !== 'string' || !value.trim() || value === 'À toi de choisir' || value.length > 35) throw Error('Choisis un nom de restaurant de 1 à 35 caractères entre guillemets.');
    } else if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value - test.expected) > 0.00001) {
      throw Error(`${test.key}(${test.args.map(x=>JSON.stringify(x)).join(', ')}) doit renvoyer ${test.expected}. Ton résultat : ${String(value)}.`);
    }
  }
  if (!request) return true;
  if (request.method === 'config') return config;
  if (request.method === 'capabilities') return Object.fromEntries(names.map(name => [name, api[name] !== undefined]));
  if (request.method === 'restaurantName') return api.restaurantName;
  if (typeof api[request.method] !== 'function') return null;
  return api[request.method](...request.args);
}
