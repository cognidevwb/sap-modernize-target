CLASS zcl_stock_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING available TYPE i reserved TYPE i requested TYPE i revision TYPE i expected_revision TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_stock_policy IMPLEMENTATION.
  METHOD evaluate.
    IF revision <> expected_revision.
      reason = 'STALE_REVISION'.
    ELSEIF available < 0 OR reserved < 0 OR requested <= 0.
      reason = 'INVALID_QUANTITY'.
    ELSEIF requested > available.
      reason = 'INSUFFICIENT_STOCK'.
    ELSE.
      reason = 'RESERVABLE'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
