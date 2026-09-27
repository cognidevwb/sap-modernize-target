# External settlement job

This job reconciles due/open company-scoped invoices with a bank CSV using exact decimal arithmetic. It classifies matched, underpaid, overpaid, unmatched and missing payments. Canonical report files are immutable and content-addressed; conflicting writes and later tampering are rejected.

## Source: SQL extract / .NET 9

The source application contains Connectors/SqlInvoiceLedger.cs and accepts six arguments:

```sh
dotnet run --project external/settlement/src/SapSettlement.Batch -- invoice-extract.sqlite bank.csv 1000 EUR 2026-09-27 reports
```

Use sql/invoice-extract.sql for the extract schema. Queries are parameterized and bounded; no direct SAP production connection or implicit database credentials are supplied. The SQLite extract is a local integration boundary, not an SAP HANA client.

## Generated target: OAuth OData / .NET 10

The migration recipe removes the production SQL connector, keeps its baseline implementation in regression tests and adds ApiInvoiceLedger plus OAuthTokenProvider. The target accepts five arguments: bank.csv, company, currency, as-of date and report directory. Supply SAP_FINANCE_BASE_URL, SAP_OAUTH_TOKEN_URL, SAP_OAUTH_CLIENT_ID and SAP_OAUTH_CLIENT_SECRET through the execution environment. Finance reads require Accountant and the corresponding companyCode attribute.

The HTTP clients require HTTPS, disable automatic redirects, constrain pagination to the configured endpoint, validate returned rows, cache OAuth tokens and bound transient retries. Tests use controlled HTTP responses; deployed SAP API compatibility and live OAuth/XSUAA integration remain separate acceptance gates.

Run the regression suite with `dotnet run --project external/settlement/tests/SapSettlement.Tests`. Source has 18 cases; the target adds ten API/OAuth/parity checks, including byte-identical reconciliation output from the SQL and OData contracts.
