CLASS zcl_ent_stock_available DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             plant TYPE c LENGTH 4,
             material TYPE c LENGTH 20,
             available TYPE i,
             blocked TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows plant TYPE c material TYPE c
      RETURNING VALUE(quantity) TYPE i.
ENDCLASS.
CLASS zcl_ent_stock_available IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    quantity = 0.
    LOOP AT rows INTO row WHERE plant = plant AND material = material.
      IF row-blocked = 0 AND row-available > 0.
        quantity = quantity + row-available.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
