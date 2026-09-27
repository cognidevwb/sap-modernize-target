CLASS zcl_ent_order_exposure DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF order_row,
             company TYPE c LENGTH 4,
             customer TYPE c LENGTH 20,
             status TYPE c LENGTH 12,
             amount_minor TYPE i,
             paid_minor TYPE i,
           END OF order_row,
           order_rows TYPE STANDARD TABLE OF order_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING orders TYPE order_rows company TYPE c customer TYPE c
      RETURNING VALUE(exposure_minor) TYPE i.
ENDCLASS.
CLASS zcl_ent_order_exposure IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE order_row.
    DATA outstanding TYPE i.
    exposure_minor = 0.
    LOOP AT orders INTO row WHERE company = company AND customer = customer.
      outstanding = row-amount_minor - row-paid_minor.
      IF row-status = 'RELEASED' OR row-status = 'SHIPPED' OR row-status = 'INVOICED'.
        IF outstanding > 0.
          exposure_minor = exposure_minor + outstanding.
        ENDIF.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
