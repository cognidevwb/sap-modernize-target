CLASS zcl_ent_reconcile_delta DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             currency TYPE c LENGTH 3,
             status TYPE c LENGTH 12,
             ledger_minor TYPE i,
             bank_minor TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c currency TYPE c
      RETURNING VALUE(variance_minor) TYPE i.
ENDCLASS.
CLASS zcl_ent_reconcile_delta IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    variance_minor = 0.
    LOOP AT rows INTO row WHERE company = company AND currency = currency.
      IF row-status = 'POSTED'.
        variance_minor = variance_minor + row-ledger_minor - row-bank_minor.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
