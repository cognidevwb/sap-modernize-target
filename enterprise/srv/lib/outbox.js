'use strict';
const cds=require('@sap/cds');
const {SELECT,UPDATE,INSERT}=cds.ql;
/** At-least-once delivery. A lease prevents overlapping owners; receivers still deduplicate event IDs. */
async function deliverBatch(db,publish,{limit=25,now=new Date(),maxAttempts=5,leaseMs=60000}={}) {
 if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>20||!Number.isInteger(leaseMs)||leaseMs<5000||leaseMs>300000||!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('Invalid outbox delivery policy');
 const instant=now.toISOString();
 const rows=await db.run(SELECT.from('enterprise.IntegrationEvents').where`(status = 'PENDING' and (nextAttemptAt is null or nextAttemptAt <= ${instant})) or (status = 'PROCESSING' and leaseExpiresAt <= ${instant})`.orderBy('createdAt','ID').limit(limit));
 let delivered=0;
 for(const row of rows) {
  const token=cds.utils.uuid(),attempts=row.attempts>=maxAttempts?row.attempts:row.attempts+1;
  const claim=await db.run(UPDATE('enterprise.IntegrationEvents').set({status:'PROCESSING',attempts,leaseToken:token,leaseExpiresAt:new Date(now.getTime()+leaseMs).toISOString()}).where({ID:row.ID,status:row.status,attempts:row.attempts,leaseToken:row.leaseToken??null}));
  if(claim!==1)continue;
  try {
   if(row.attempts>=maxAttempts)throw new Error("Retry budget exhausted before lease recovery");
   await publish({id:row.ID,type:row.topic,data:JSON.parse(row.payload)});
   const acknowledged=await db.run(UPDATE('enterprise.IntegrationEvents').set({status:'DELIVERED',deliveredAt:instant,leaseToken:null,leaseExpiresAt:null}).where({ID:row.ID,status:'PROCESSING',leaseToken:token}));
   if(acknowledged===1)delivered++;
  } catch {
   await db.tx(async tx=>{
    const status=attempts>=maxAttempts?'DEAD':'PENDING';
    const changed=await tx.run(UPDATE('enterprise.IntegrationEvents').set({attempts,status,leaseToken:null,leaseExpiresAt:null,nextAttemptAt:new Date(now.getTime()+Math.min(3600000,1000*2**attempts)).toISOString()}).where({ID:row.ID,status:'PROCESSING',leaseToken:token}));
    if(changed===1&&status==='DEAD')await tx.run(INSERT.into('enterprise.DeadLetters').entries({ID:cds.utils.uuid(),event_ID:row.ID,reason:'Delivery retry budget exhausted',resolved:false}));
   });
  }
 }
 return delivered;
}
module.exports={deliverBatch};
