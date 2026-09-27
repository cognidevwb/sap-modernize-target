CLASS zcl_ent_order DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  CLASS-METHODS release IMPORTING order_id TYPE zent_id company TYPE bukrs RAISING zcx_ent_domain.
ENDCLASS.
CLASS zcl_ent_order IMPLEMENTATION.
 METHOD release.
  zcl_ent_auth=>check_company( company = company ).
  zcl_ent_credit=>check_order( order_id = order_id ).
  UPDATE zent_order SET status = 'RELEASED' WHERE id = @order_id AND company_code = @company AND status = 'DRAFT'.
  IF sy-dbcnt <> 1. RAISE EXCEPTION TYPE zcx_ent_domain. ENDIF.
  zcl_ent_events=>record_release( order_id = order_id ).
 ENDMETHOD.
ENDCLASS.
