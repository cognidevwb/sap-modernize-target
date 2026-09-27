CLASS zcl_ent_quality_defects DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             supplier TYPE c LENGTH 20,
             status TYPE c LENGTH 12,
             defective TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c supplier TYPE c
      RETURNING VALUE(quantity) TYPE i.
ENDCLASS.
CLASS zcl_ent_quality_defects IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    quantity = 0.
    LOOP AT rows INTO row WHERE company = company AND supplier = supplier.
      IF row-status = 'INSPECTED' AND row-defective > 0.
        quantity = quantity + row-defective.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
