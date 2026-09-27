namespace enterprise;
using { cuid, managed } from '@sap/cds/common';
using { enterprise.BusinessPartners, enterprise.CostCenters } from './master';
using { enterprise.SalesOrders } from './sales';
entity Invoices: cuid, managed { order: Association to SalesOrders; companyCode: String(4); fiscalYear: Integer; currency: String(3); netAmount: Decimal(15,2); taxAmount: Decimal(15,2); paidAmount: Decimal(15,2) default 0; creditedNetAmount: Decimal(15,2) default 0; creditedTaxAmount: Decimal(15,2) default 0; status: String(20); dueDate: Date; }
entity JournalEntries: cuid, managed { companyCode: String(4); fiscalYear: Integer; postingDate: Date; reference: String(80); status: String(20); lines: Composition of many JournalLines on lines.entry = $self; }
entity JournalLines: cuid { entry: Association to JournalEntries; account: String(10); costCenter: Association to CostCenters; debit: Decimal(15,2); credit: Decimal(15,2); currency: String(3); }
@assert.unique.bankTransaction: [companyCode, bankReference]
entity Payments: cuid, managed { companyCode: String(4) not null; invoice: Association to Invoices; partner: Association to BusinessPartners; amount: Decimal(15,2); currency: String(3); bankReference: String(80); settledAt: Timestamp; }
entity CreditDecisions: cuid, managed { order: Association to SalesOrders; decision: String(20); exposureBefore: Decimal(15,2); limit: Decimal(15,2); reason: String(200); }

entity TaxPolicies { key country: String(2); key currency: String(3); rateBasisPoints: Integer; effectiveFrom: Date; }
