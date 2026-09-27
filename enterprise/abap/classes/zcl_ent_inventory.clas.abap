CLASS zcl_ent_inventory DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  CLASS-METHODS reserve IMPORTING material TYPE zent_id quantity TYPE i RAISING zcx_ent_domain.
ENDCLASS.
CLASS zcl_ent_inventory IMPLEMENTATION.
 METHOD reserve.
  IF quantity <= 0. RAISE EXCEPTION TYPE zcx_ent_domain. ENDIF.
  UPDATE zent_stock SET available = available - @quantity WHERE material_id = @material AND available >= @quantity.
  IF sy-dbcnt <> 1. RAISE EXCEPTION TYPE zcx_ent_domain. ENDIF.
 ENDMETHOD.
ENDCLASS.
