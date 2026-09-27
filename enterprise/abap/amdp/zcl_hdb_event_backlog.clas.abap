CLASS zcl_hdb_event_backlog DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  INTERFACES if_amdp_marker_hdb.
  TYPES: BEGIN OF input_row,
        company TYPE c length 4,
        channel TYPE c length 20,
        status TYPE c length 12,
        attempts TYPE i,
       END OF input_row,
       input_rows TYPE STANDARD TABLE OF input_row WITH EMPTY KEY.
  CLASS-METHODS calculate IMPORTING VALUE(rows) TYPE input_rows VALUE(p_company) TYPE string VALUE(p_channel) TYPE string VALUE(p_max_attempts) TYPE i
    EXPORTING VALUE(result) TYPE i.
ENDCLASS.
CLASS zcl_hdb_event_backlog IMPLEMENTATION.
 METHOD calculate BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT OPTIONS READ-ONLY.
  SELECT COALESCE(SUM(CASE WHEN (((RTRIM(r."STATUS") = 'PENDING') OR (RTRIM(r."STATUS") = 'RETRY')) AND (r."ATTEMPTS" < :p_max_attempts)) THEN (0 + 1) ELSE 0 END), 0) INTO result
FROM :rows AS r
WHERE ((RTRIM(r."COMPANY") = RTRIM(:p_company)) AND (RTRIM(r."CHANNEL") = RTRIM(:p_channel)));
 ENDMETHOD.
ENDCLASS.
