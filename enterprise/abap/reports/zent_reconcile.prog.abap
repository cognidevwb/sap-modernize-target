REPORT zent_reconcile.
AUTHORITY-CHECK OBJECT 'S_PROGRAM' ID 'P_ACTION' FIELD 'SUBMIT' ID 'P_GROUP' FIELD 'ZENT'.
IF sy-subrc <> 0. RETURN. ENDIF.
SELECT id, status FROM zent_order INTO TABLE @DATA(orders).
SELECT order_id, status FROM zent_event INTO TABLE @DATA(events).
LOOP AT orders INTO DATA(order) WHERE status = 'RELEASED'.
 READ TABLE events WITH KEY order_id = order-id TRANSPORTING NO FIELDS.
 IF sy-subrc <> 0. WRITE: / order-id, 'Missing integration event'. ENDIF.
ENDLOOP.
