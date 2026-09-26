*& S/4HANA Clean Core Order Processor ✅
CLASS zcl_sales_order_s4 DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: create_order IMPORTING iv_customer TYPE kunnr,
             get_status IMPORTING iv_order TYPE vbeln.
ENDCLASS.
CLASS zcl_sales_order_s4 IMPLEMENTATION.
  METHOD create_order.
    " ✅ Uses BAPI instead of direct INSERT
    CALL FUNCTION 'BAPI_SALESORDER_CREATEFROMDAT2'.
  ENDMETHOD.
  METHOD get_status.
    " ✅ Uses CDS view instead of direct SELECT
    SELECT FROM ZI_SalesOrder WHERE SalesDocument = @iv_order.
  ENDMETHOD.
ENDCLASS.
