CLASS zcl_payment_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING invoice_currency TYPE c payment_currency TYPE c total_minor TYPE i paid_minor TYPE i received_minor TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_payment_policy IMPLEMENTATION.
  METHOD evaluate.
    IF invoice_currency <> payment_currency.
      reason = 'CURRENCY_MISMATCH'.
    ELSEIF total_minor <= 0 OR paid_minor < 0 OR received_minor <= 0 OR received_minor > total_minor - paid_minor.
      reason = 'INVALID_PAYMENT'.
    ELSEIF received_minor = total_minor - paid_minor.
      reason = 'SETTLED'.
    ELSE.
      reason = 'PARTIAL'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
