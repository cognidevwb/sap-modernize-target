'use strict';
const cds = require('@sap/cds');
const {reject,requireRole,requireCompany} = require('./errors');
function cents(value) {
 const text=String(value ?? 0);
 if (!/^\d{1,13}(\.\d{1,2})?$/.test(text)) reject(422,'Use nonnegative amounts with at most two decimals');
 const [whole, fraction=''] = text.split('.');
 return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}
async function postJournal(tx,user,journalID) {
 requireRole(user,'Accountant');
 const journal=await tx.run(cds.ql.SELECT.one.from('enterprise.JournalEntries').where({ID:journalID}));
 if (!journal) reject(404,'Journal not found');
 requireCompany(user,journal.companyCode);
 if (journal.status !== 'DRAFT') reject(409,'Journal is not draft');
 const lines=await tx.run(cds.ql.SELECT.from('enterprise.JournalLines').where({entry_ID:journalID}));
 if (lines.length < 2 || new Set(lines.map(line=>line.currency)).size !== 1) reject(422,'Journal requires balanced lines in one currency');
 let debit=0n,credit=0n;
 for (const line of lines) {
  const d=cents(line.debit),c=cents(line.credit);
  if (!line.account || !line.currency || (d>0n) === (c>0n)) reject(422,'Each line needs exactly one debit or credit');
  debit+=d;credit+=c;
 }
 if (debit !== credit) reject(422,'Unbalanced journal');
 const updated=await tx.run(cds.ql.UPDATE('enterprise.JournalEntries').set({status:'POSTED'}).where({ID:journalID,status:'DRAFT'}));
 if(updated!==1) reject(409,'Journal changed concurrently');
 await tx.run(cds.ql.INSERT.into('enterprise.AuditEvents').entries({ID:cds.utils.uuid(),actor:user.id,action:'JOURNAL_POSTED',aggregateID:journalID,companyCode:journal.companyCode,detail:'Balanced debit and credit verified using integer minor units'}));
 return true;
}
module.exports={cents,postJournal};
