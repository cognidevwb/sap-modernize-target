CLASS zcl_hdb_delivery_backlog DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  INTERFACES if_amdp_marker_hdb.
  TYPES: BEGIN OF input_row,
        company TYPE c length 4,
        plant TYPE c length 4,
        status TYPE c length 12,
        planned_date TYPE d,
        quantity TYPE i,
       END OF input_row,
       input_rows TYPE STANDARD TABLE OF input_row WITH EMPTY KEY.
  CLASS-METHODS calculate IMPORTING VALUE(rows) TYPE input_rows VALUE(p_company) TYPE string VALUE(p_plant) TYPE string VALUE(p_as_of) TYPE d
    EXPORTING VALUE(result) TYPE i.
ENDCLASS.
CLASS zcl_hdb_delivery_backlog IMPLEMENTATION.
 METHOD calculate BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT OPTIONS READ-ONLY.
  SELECT COALESCE(SUM(CASE WHEN ((r."PLANNED_DATE" <= :p_as_of) AND ((RTRIM(r."STATUS") = 'RELEASED') OR (RTRIM(r."STATUS") = 'PICKED'))) AND (r."QUANTITY" > 0) THEN (0 + r."QUANTITY") ELSE 0 END), 0) INTO result
FROM :rows AS r
WHERE ((RTRIM(r."COMPANY") = RTRIM(:p_company)) AND (RTRIM(r."PLANT") = RTRIM(:p_plant)));
 ENDMETHOD.
ENDCLASS.
