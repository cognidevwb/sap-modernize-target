import {readFile} from 'node:fs/promises';
import {execute} from './lib/execute.mjs';
const file=process.argv[2]??new URL('./fixtures/analytics.json',import.meta.url);
const cases=JSON.parse(await readFile(file,'utf8'));
if(!Array.isArray(cases)||cases.length>10000)throw new Error('Invalid analytics fixture collection');
const results=[];
for(let i=0;i<cases.length;i++){
 const item=cases[i];
 results.push({index:i,name:item.name,value:await execute(item.name,item.rows,item.params)});
}
process.stdout.write(JSON.stringify(results)+'\n');
