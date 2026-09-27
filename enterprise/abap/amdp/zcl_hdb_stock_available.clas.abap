CLASS zcl_hdb_stock_available DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  INTERFACES if_amdp_marker_hdb.
  TYPES: BEGIN OF input_row,
        plant TYPE c length 4,
        material TYPE c length 20,
        available TYPE i,
        blocked TYPE i,
       END OF input_row,
       input_rows TYPE STANDARD TABLE OF input_row WITH EMPTY KEY.
  CLASS-METHODS calculate IMPORTING VALUE(rows) TYPE input_rows VALUE(p_plant) TYPE string VALUE(p_material) TYPE string
    EXPORTING VALUE(result) TYPE i.
ENDCLASS.
CLASS zcl_hdb_stock_available IMPLEMENTATION.
 METHOD calculate BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT OPTIONS READ-ONLY.
  SELECT COALESCE(SUM(CASE WHEN ((r."BLOCKED" = 0) AND (r."AVAILABLE" > 0)) THEN (0 + r."AVAILABLE") ELSE 0 END), 0) INTO result
FROM :rows AS r
WHERE ((RTRIM(r."PLANT") = RTRIM(:p_plant)) AND (RTRIM(r."MATERIAL") = RTRIM(:p_material)));
 ENDMETHOD.
ENDCLASS.
