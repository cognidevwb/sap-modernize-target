CLASS zcl_hdb_production_good DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  INTERFACES if_amdp_marker_hdb.
  TYPES: BEGIN OF input_row,
        plant TYPE c length 4,
        material TYPE c length 20,
        status TYPE c length 12,
        good_quantity TYPE i,
       END OF input_row,
       input_rows TYPE STANDARD TABLE OF input_row WITH EMPTY KEY.
  CLASS-METHODS calculate IMPORTING VALUE(rows) TYPE input_rows VALUE(p_plant) TYPE string VALUE(p_material) TYPE string
    EXPORTING VALUE(result) TYPE i.
ENDCLASS.
CLASS zcl_hdb_production_good IMPLEMENTATION.
 METHOD calculate BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT OPTIONS READ-ONLY.
  SELECT COALESCE(SUM(CASE WHEN ((RTRIM(r."STATUS") = 'COMPLETED') AND (r."GOOD_QUANTITY" > 0)) THEN (0 + r."GOOD_QUANTITY") ELSE 0 END), 0) INTO result
FROM :rows AS r
WHERE ((RTRIM(r."PLANT") = RTRIM(:p_plant)) AND (RTRIM(r."MATERIAL") = RTRIM(:p_material)));
 ENDMETHOD.
ENDCLASS.
