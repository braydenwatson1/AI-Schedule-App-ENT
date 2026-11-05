import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../public',import.meta.url))),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.includes('\\')||path.includes('\0'))throw Error();const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error();const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[file.slice(file.lastIndexOf('.'))]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}}).listen(4174,'127.0.0.1',()=>console.log('Concept demo: http://localhost:4174'));
