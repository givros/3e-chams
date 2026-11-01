import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)){res.writeHead(403).end();return}const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','css':'text/css','js':'text/javascript'})[file.split('.').pop()]||'application/octet-stream');res.end(data)}catch{res.writeHead(404).end('Not found')}}).listen(5182,'127.0.0.1',()=>console.log('mBot2 Mission Lab: http://localhost:5182'));
