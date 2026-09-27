const cds=require('@sap/cds');
const {postJournal}=require('./lib/finance');
module.exports=class Finance extends cds.ApplicationService {
 async init() { this.on('postJournal',req=>postJournal(cds.tx(req),req.user,req.data.journalID));return super.init(); }
};
