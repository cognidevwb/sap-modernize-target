CLASS zcl_ent_delivery_backlog DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             plant TYPE c LENGTH 4,
             status TYPE c LENGTH 12,
             planned_date TYPE d,
             quantity TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c plant TYPE c as_of TYPE d
      RETURNING VALUE(quantity) TYPE i.
ENDCLASS.
CLASS zcl_ent_delivery_backlog IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    quantity = 0.
    LOOP AT rows INTO row WHERE company = company AND plant = plant.
      IF row-planned_date <= as_of AND ( row-status = 'RELEASED' OR row-status = 'PICKED' ).
        IF row-quantity > 0.
          quantity = quantity + row-quantity.
        ENDIF.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
