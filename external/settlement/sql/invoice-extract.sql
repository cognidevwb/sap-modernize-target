-- Portable local extract schema. A customer-owned CDC/export feed populates this boundary.
-- No write-back into SAP application tables is permitted.
CREATE TABLE sap_invoice_extract (
  invoice_id TEXT NOT NULL PRIMARY KEY,
  company_code TEXT NOT NULL CHECK(length(company_code) = 4),
  currency TEXT NOT NULL CHECK(length(currency) = 3),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('OPEN','PARTIAL','PAID','CANCELLED'))
);
CREATE INDEX invoice_scope_due ON sap_invoice_extract(company_code, currency, due_date, status);
