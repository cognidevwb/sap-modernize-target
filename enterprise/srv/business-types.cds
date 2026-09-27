namespace contracts;
type OrderLine { materialID: UUID; plantCode: String(4); quantity: Integer; unitPrice: Decimal(15,2); dueDate: Date; }
type ReturnLine { itemID: UUID; quantity: Integer; }
type Inspection { characteristic: String(80); measured: Decimal(15,4); lowerBound: Decimal(15,4); upperBound: Decimal(15,4); }
type CommandResult { ID: UUID; externalID: String(80); status: String(30); detail: String(300); total: Decimal(15,2); amount: Decimal(15,2); unitPrice: Decimal(15,2); currency: String(3); revision: Integer; inspectionID: UUID; journalID: UUID; orderID: UUID; invoiceID: UUID; quantity: Integer; goodQuantity: Integer; scrapQuantity: Integer; available: Integer; reserved: Integer; netAmount: Decimal(15,2); taxAmount: Decimal(15,2); paidAmount: Decimal(15,2); creditLimit: Decimal(15,2); creditAmount: Decimal(15,2); disposition: String(20); }
