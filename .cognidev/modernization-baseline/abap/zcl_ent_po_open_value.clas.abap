CLASS zcl_ent_po_open_value DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             supplier TYPE c LENGTH 20,
             status TYPE c LENGTH 12,
             quantity TYPE i,
             received TYPE i,
             unit_minor TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c supplier TYPE c
      RETURNING VALUE(amount_minor) TYPE i.
ENDCLASS.
CLASS zcl_ent_po_open_value IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    amount_minor = 0.
    LOOP AT rows INTO row WHERE company = company AND supplier = supplier.
      IF row-status = 'APPROVED' OR row-status = 'PARTIAL'.
        IF row-quantity > row-received AND row-unit_minor > 0.
          amount_minor = amount_minor + ( row-quantity - row-received ) * row-unit_minor.
        ENDIF.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
