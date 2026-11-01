import { evaluate } from './engine.js';
self.onmessage = ({data}) => { try { self.postMessage({value:evaluate(data.source,data.tests,data.request)}); } catch (error) { self.postMessage({error:error.message}); } };
