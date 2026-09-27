namespace enterprise;
using { cuid, managed } from '@sap/cds/common';
entity Companies { key code: String(4); name: String(100); currency: String(3); }
entity Plants { key code: String(4); company: Association to Companies; name: String(100); timezone: String(40); }
entity BusinessPartners: cuid, managed { name: String(120); companyCode: String(4) not null; country: String(2); blocked: Boolean default false; creditLimit: Decimal(15,2); exposure: Decimal(15,2) default 0; }
entity Materials: cuid, managed { sku: String(40); description: String(200); unit: String(3); valuationClass: String(4); hazardous: Boolean default false; shelfLifeDays: Integer; }
entity Suppliers: cuid, managed { partner: Association to BusinessPartners; purchasingOrg: String(4); rating: Decimal(5,2); blocked: Boolean default false; }
entity CostCenters { key code: String(10); company: Association to Companies; description: String(100); validFrom: Date; validTo: Date; }
entity ExchangeRates { key currency: String(3); key validOn: Date; rateToEUR: Decimal(15,6); }
