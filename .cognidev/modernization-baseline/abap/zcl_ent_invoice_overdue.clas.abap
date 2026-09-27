CLASS zcl_ent_invoice_overdue DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             currency TYPE c LENGTH 3,
             due_date TYPE d,
             status TYPE c LENGTH 12,
             amount_minor TYPE i,
             paid_minor TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c currency TYPE c as_of TYPE d
      RETURNING VALUE(amount_minor) TYPE i.
ENDCLASS.
CLASS zcl_ent_invoice_overdue IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    amount_minor = 0.
    LOOP AT rows INTO row WHERE company = company AND currency = currency.
      IF row-due_date < as_of AND row-status <> 'CANCELLED' AND row-status <> 'PAID'.
        IF row-amount_minor > row-paid_minor.
          amount_minor = amount_minor + row-amount_minor - row-paid_minor.
        ENDIF.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
