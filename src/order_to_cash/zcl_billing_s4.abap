*& Clean Core Billing ✅
CLASS zcl_billing_s4 DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: create_invoice IMPORTING it_items TYPE tt_items.
ENDCLASS.
CLASS zcl_billing_s4 IMPLEMENTATION.
  METHOD create_invoice.
    " ✅ BAPI-based billing
    CALL FUNCTION 'BAPI_BILLINGDOC_CREATEFROMDATA'.
  ENDMETHOD.
ENDCLASS.
