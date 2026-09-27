# Executable integration boundary

The CAP `Integration.receive` action accepts a signed envelope and dispatches three implemented adapters. The XML `.iflw` files in this directory remain Integration Suite design exports; deployment into an Integration Suite tenant has not been performed.

| Channel | Contract | Implemented behavior | Required technical-user roles |
|---|---|---|---|
| `idoc` | One ORDERS05 with the `ZENT_ORDERS05` extension | Resolve sold-to/material identifiers, validate units/positions, create an order transactionally, retain external identity | IntegrationOperator + Planner |
| `soap` | `ConfirmDelivery` in a SOAP envelope | Resolve the external order and invoke the reservation/picking-aware shipping transaction | IntegrationOperator + Warehouse |
| `eventmesh` | CloudEvents 1.0 `enterprise.payment.received.v1` | Resolve invoice identity and record a currency-checked, duplicate-protected payment | IntegrationOperator + Accountant |

`ExternalIdentifiers` is keyed by company, source system, object type and external identifier. Populate mappings through the controlled master-data onboarding process before enabling a sender. There is no implicit conversion of external numbers to internal UUIDs.

A deployment supplies `SAP_INTEGRATION_SIGNING_KEY` through its secret binding. There is no default key. The lowercase hex HMAC-SHA256 covers these exact newline-separated values, ending with the raw payload:

```
timestamp
companyCode
channel
sourceSystem
payload
```

The timestamp is Unix seconds and must be within five minutes. The technical user also needs the ordinary business role and company authorization; possession of a signature does not grant business permissions. Duplicate business messages return their original result; reusing an identity with changed content fails. Invalid XML, DTD/entity declarations, oversized bodies, missing mappings and unsupported units fail before business writes.

The ORDERS05 profile intentionally supports integral EA quantities, one sold-to partner, up to 100 lines and an explicit `Z1ENT_SCOPE` extension carrying company, plant and requested date. It does not claim to support every SAP IDoc segment, pricing condition, unit conversion or custom extension. Unsupported variants require a versioned adapter and tests.

Run `npm test` from `enterprise`. The integration tests execute IDoc → order release → SOAP delivery → invoice → payment event against the real local CAP database and domain services. These are local adapter tests, not a live RFC, Event Mesh or Integration Suite deployment attestation.
