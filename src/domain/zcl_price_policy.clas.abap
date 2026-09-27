CLASS zcl_price_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING valid_from TYPE d valid_to TYPE d order_date TYPE d unit_minor TYPE i quantity TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_price_policy IMPLEMENTATION.
  METHOD evaluate.
    IF valid_from > valid_to OR unit_minor <= 0 OR quantity <= 0.
      reason = 'INVALID_CONDITION'.
    ELSEIF order_date < valid_from OR order_date > valid_to.
      reason = 'PRICE_NOT_EFFECTIVE'.
    ELSE.
      reason = 'APPLICABLE'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
