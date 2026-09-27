CLASS zcl_hdb_order_exposure DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  INTERFACES if_amdp_marker_hdb.
  TYPES: BEGIN OF input_row,
        company TYPE c length 4,
        customer TYPE c length 20,
        status TYPE c length 12,
        amount_minor TYPE i,
        paid_minor TYPE i,
       END OF input_row,
       input_rows TYPE STANDARD TABLE OF input_row WITH EMPTY KEY.
  CLASS-METHODS calculate IMPORTING VALUE(rows) TYPE input_rows VALUE(p_company) TYPE string VALUE(p_customer) TYPE string
    EXPORTING VALUE(result) TYPE i.
ENDCLASS.
CLASS zcl_hdb_order_exposure IMPLEMENTATION.
 METHOD calculate BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT OPTIONS READ-ONLY.
  SELECT COALESCE(SUM(CASE WHEN (((RTRIM(r."STATUS") = 'RELEASED') OR (RTRIM(r."STATUS") = 'SHIPPED')) OR (RTRIM(r."STATUS") = 'INVOICED')) AND ((r."AMOUNT_MINOR" - r."PAID_MINOR") > 0) THEN (0 + (r."AMOUNT_MINOR" - r."PAID_MINOR")) ELSE 0 END), 0) INTO result
FROM :rows AS r
WHERE ((RTRIM(r."COMPANY") = RTRIM(:p_company)) AND (RTRIM(r."CUSTOMER") = RTRIM(:p_customer)));
 ENDMETHOD.
ENDCLASS.
