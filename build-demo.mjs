import {readFile,writeFile} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const [html,css,domain,app,icon]=await Promise.all(['public/index.html','public/style.css','public/domain.js','public/app.js','public/icon.svg'].map(read));
const script='const LIVE_SERVER=false;\n'+domain.replace(/^export /gm,'')+'\n'+app.replace(/^import .*;$/gm,'');
const output=html.replace('<link rel="icon" href="icon.svg">',()=>'<link rel="icon" href="data:image/svg+xml,'+encodeURIComponent(icon)+'">').replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replace('<script type="module" src="app.js"></script>',()=>'<script type="module">'+script.replaceAll('</script','<\\/script')+'</script>').replaceAll('src="icon.svg"','src="data:image/svg+xml,'+encodeURIComponent(icon)+'"');
await writeFile(new URL('public/standalone.html',import.meta.url),output);
console.log('Standalone demo built: public/standalone.html');
