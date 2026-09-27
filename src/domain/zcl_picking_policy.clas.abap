CLASS zcl_picking_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING status TYPE c assigned_to TYPE c actor TYPE c requested TYPE i picked TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_picking_policy IMPLEMENTATION.
  METHOD evaluate.
    IF assigned_to <> actor OR actor IS INITIAL.
      reason = 'WRONG_OPERATOR'.
    ELSEIF status <> 'ASSIGNED'.
      reason = 'INVALID_STATE'.
    ELSEIF requested <= 0 OR requested <> picked.
      reason = 'PICK_MISMATCH'.
    ELSE.
      reason = 'CONFIRMED'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
