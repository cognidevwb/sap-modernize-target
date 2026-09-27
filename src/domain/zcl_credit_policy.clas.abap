CLASS zcl_credit_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING blocked TYPE c limit_minor TYPE i exposure_minor TYPE i order_minor TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_credit_policy IMPLEMENTATION.
  METHOD evaluate.
    IF blocked = 'X'.
      reason = 'CUSTOMER_BLOCKED'.
    ELSEIF order_minor <= 0 OR limit_minor < 0 OR exposure_minor < 0.
      reason = 'INVALID_AMOUNT'.
    ELSEIF order_minor > limit_minor - exposure_minor.
      reason = 'CREDIT_LIMIT_EXCEEDED'.
    ELSE.
      reason = 'APPROVED'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
