CLASS zcl_return_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING status TYPE c sold TYPE i returned TYPE i requested TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_return_policy IMPLEMENTATION.
  METHOD evaluate.
    IF status <> 'INVOICED'.
      reason = 'NOT_INVOICED'.
    ELSEIF requested <= 0 OR returned < 0 OR returned > sold OR requested > sold - returned.
      reason = 'RETURN_EXCEEDS_SALE'.
    ELSE.
      reason = 'AUTHORIZE'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
