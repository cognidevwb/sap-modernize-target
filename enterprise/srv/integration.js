const cds=require('@sap/cds');
const {receive}=require('../integration/runtime/inbound');
module.exports=class Integration extends cds.ApplicationService {
 async init(){this.on('receive',req=>receive(cds.tx(req),req.user,req.data,{secret:process.env.SAP_INTEGRATION_SIGNING_KEY}));return super.init();}
};
