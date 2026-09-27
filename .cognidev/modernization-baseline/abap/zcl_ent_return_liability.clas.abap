CLASS zcl_ent_return_liability DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             currency TYPE c LENGTH 3,
             status TYPE c LENGTH 12,
             credit_minor TYPE i,
             settled_minor TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c currency TYPE c
      RETURNING VALUE(amount_minor) TYPE i.
ENDCLASS.
CLASS zcl_ent_return_liability IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    amount_minor = 0.
    LOOP AT rows INTO row WHERE company = company AND currency = currency.
      IF row-status = 'APPROVED' OR row-status = 'RECEIVED'.
        IF row-credit_minor > row-settled_minor.
          amount_minor = amount_minor + row-credit_minor - row-settled_minor.
        ENDIF.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
