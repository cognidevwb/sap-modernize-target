namespace enterprise;
using { cuid, managed } from '@sap/cds/common';
using { enterprise.BusinessPartners, enterprise.Materials } from './master';
entity SalesOrders: cuid, managed {
 companyCode: String(4) not null; customer: Association to BusinessPartners;
 status: String(20) default 'DRAFT'; currency: String(3) default 'EUR';
 total: Decimal(15,2); revision: Integer default 0; requestedDate: Date;
 items: Composition of many SalesOrderItems on items.order = $self;
 deliveries: Association to many Deliveries on deliveries.order = $self;
}
entity SalesOrderItems: cuid { order: Association to SalesOrders; material: Association to Materials; plantCode: String(4); quantity: Integer; returnedQuantity: Integer default 0; unitPrice: Decimal(15,2); }
entity Deliveries: cuid, managed { companyCode: String(4); order: Association to SalesOrders; status: String(20); carrier: String(80); trackingNumber: String(80); shippedAt: Timestamp; items: Composition of many DeliveryItems on items.delivery = $self; }
entity DeliveryItems: cuid { delivery: Association to Deliveries; orderItem: Association to SalesOrderItems; quantity: Integer; batch: String(40); }
entity Returns: cuid, managed { companyCode: String(4); disposition: String(20); order: Association to SalesOrders; reason: String(200); status: String(20); refundAmount: Decimal(15,2); }
entity PricingConditions: cuid { companyCode: String(4); material: Association to Materials; customer: Association to BusinessPartners; validFrom: Date; validTo: Date; amount: Decimal(15,2); currency: String(3); }

entity ReturnItems: cuid { return: Association to Returns; orderItem: Association to SalesOrderItems; material: Association to Materials; plantCode: String(4); quantity: Integer; }
entity CreditNotes: cuid, managed { companyCode: String(4); return: Association to Returns; amount: Decimal(15,2); status: String(20); }
