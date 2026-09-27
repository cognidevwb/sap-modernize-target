CLASS zcl_ent_credit DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  CLASS-METHODS check_order IMPORTING order_id TYPE zent_id RAISING zcx_ent_domain.
ENDCLASS.
CLASS zcl_ent_credit IMPLEMENTATION.
 METHOD check_order.
  SELECT SINGLE total_amount FROM zent_order WHERE id = @order_id INTO @DATA(amount).
  IF sy-subrc <> 0 OR amount <= 0. RAISE EXCEPTION TYPE zcx_ent_domain. ENDIF.
 ENDMETHOD.
ENDCLASS.
