*& Clean Core Purchase Orders ✅
CLASS zcl_purchase_s4 DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: create_po IMPORTING iv_vendor TYPE lifnr.
ENDCLASS.
CLASS zcl_purchase_s4 IMPLEMENTATION.
  METHOD create_po.
    " ✅ Uses BAPI_PO_CREATE1
    CALL FUNCTION 'BAPI_PO_CREATE1'.
  ENDMETHOD.
ENDCLASS.
