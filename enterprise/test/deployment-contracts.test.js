'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cds=require('@sap/cds');
const {XMLParser,XMLValidator}=require('fast-xml-parser');
test('every compiled business role can be assigned through XSUAA with company scope',async()=>{
 const model=await cds.load(['db','srv']);
 const security=JSON.parse(fs.readFileSync('xs-security.json'));
 const roles=new Set();
 const visit=node=>{
  if(!node||typeof node!=='object')return;
  for(const value of [node['@requires']].flat().filter(Boolean))roles.add(value);
  for(const rule of node['@restrict']??[])for(const role of [rule.to].flat().filter(Boolean))roles.add(role);
  for(const [key,value] of Object.entries(node))if(!key.startsWith('@'))visit(value);
 };
 visit(model.definitions);
 for(const role of roles){
  if(['authenticated-user','any','system-user'].includes(role))continue;
  assert.ok(security.scopes.some(s=>s.name==='$XSAPPNAME.'+role),'Missing scope '+role);
  const template=security['role-templates'].find(t=>t.name===role);
  assert.ok(template,'Missing role template '+role);
  assert.ok(template['scope-references'].includes('$XSAPPNAME.'+role));
  assert.ok(template['attribute-references'].includes('companyCode'));
 }
 assert.ok(roles.size>=15);
});
test('DDIC business exports have explicit keys and valid currency/unit references',()=>{
 const directory=path.resolve('..','database');
 const files=fs.readdirSync(directory).filter(f=>f.endsWith('.tabl.xml'));
 assert.equal(files.length,16);
 for(const file of files){
  const xml=fs.readFileSync(path.join(directory,file),'utf8');
  assert.equal(XMLValidator.validate(xml),true,file);
  const values=new XMLParser().parse(xml).abapGit['asx:abap']['asx:values'];
  const fields=[values.DD03P_TABLE.DD03P].flat();
  assert.ok(fields.some(f=>f.KEYFLAG==='X'),file+' needs a key');
  for(const field of fields.filter(f=>['CURR','QUAN'].includes(f.DATATYPE))){
   assert.ok(fields.some(f=>f.FIELDNAME===field.REFFIELD),file+' unresolved '+field.REFFIELD);
   assert.equal(field.REFTABLE,values.DD02V.TABNAME);
  }
 }
});
