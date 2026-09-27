CLASS zcl_ent_production_good DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             plant TYPE c LENGTH 4,
             material TYPE c LENGTH 20,
             status TYPE c LENGTH 12,
             good_quantity TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows plant TYPE c material TYPE c
      RETURNING VALUE(quantity) TYPE i.
ENDCLASS.
CLASS zcl_ent_production_good IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    quantity = 0.
    LOOP AT rows INTO row WHERE plant = plant AND material = material.
      IF row-status = 'COMPLETED' AND row-good_quantity > 0.
        quantity = quantity + row-good_quantity.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
