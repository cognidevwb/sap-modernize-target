using { enterprise as db } from '../db/schema';
@path:'/finance' @requires:'Accountant'
service Finance {
 @readonly @restrict:[{grant:'READ',to:'Accountant',where:'companyCode = $user.companyCode'}]
 entity Journals as projection on db.JournalEntries;
 @readonly @restrict:[{grant:'READ',to:'Accountant',where:'companyCode = $user.companyCode'}]
 entity Invoices as projection on db.Invoices;
 @requires:'Accountant' action postJournal(journalID: UUID) returns Boolean;
}
