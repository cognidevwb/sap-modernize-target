CLASS zcl_ent_events DEFINITION PUBLIC FINAL CREATE PUBLIC.
 PUBLIC SECTION.
  CLASS-METHODS record_release IMPORTING order_id TYPE zent_id RAISING zcx_ent_domain.
ENDCLASS.
CLASS zcl_ent_events IMPLEMENTATION.
 METHOD record_release.
  DATA event TYPE zent_event.
  event-id = order_id.
  event-order_id = order_id.
  event-status = 'PENDING'.
  INSERT zent_event FROM @event.
  IF sy-subrc <> 0. RAISE EXCEPTION TYPE zcx_ent_domain. ENDIF.
 ENDMETHOD.
ENDCLASS.
