CLASS zcl_receipt_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING status TYPE c ordered TYPE i received TYPE i delivery TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_receipt_policy IMPLEMENTATION.
  METHOD evaluate.
    IF status <> 'APPROVED' AND status <> 'PARTIAL'.
      reason = 'NOT_APPROVED'.
    ELSEIF ordered <= 0 OR received < 0 OR delivery <= 0 OR delivery > ordered - received.
      reason = 'OVER_RECEIPT'.
    ELSEIF delivery = ordered - received.
      reason = 'RECEIVED'.
    ELSE.
      reason = 'PARTIAL'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
