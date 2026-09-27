CLASS zcl_po_approval_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING status TYPE c creator TYPE c approver TYPE c amount_minor TYPE i authority_minor TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_po_approval_policy IMPLEMENTATION.
  METHOD evaluate.
    IF status <> 'DRAFT'.
      reason = 'INVALID_STATE'.
    ELSEIF creator = approver OR approver IS INITIAL.
      reason = 'SEGREGATION_OF_DUTIES'.
    ELSEIF amount_minor <= 0 OR authority_minor < amount_minor.
      reason = 'APPROVAL_LIMIT_EXCEEDED'.
    ELSE.
      reason = 'APPROVED'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
