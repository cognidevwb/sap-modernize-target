CLASS zcl_production_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING status TYPE c planned TYPE i good TYPE i scrap TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_production_policy IMPLEMENTATION.
  METHOD evaluate.
    IF status <> 'SCHEDULED'.
      reason = 'INVALID_STATE'.
    ELSEIF planned <= 0 OR good < 0 OR scrap < 0 OR good > planned OR scrap <> planned - good.
      reason = 'YIELD_DOES_NOT_BALANCE'.
    ELSE.
      reason = 'COMPLETE'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
