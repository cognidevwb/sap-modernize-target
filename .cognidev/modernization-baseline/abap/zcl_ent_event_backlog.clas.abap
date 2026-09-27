CLASS zcl_ent_event_backlog DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF input_row,
             company TYPE c LENGTH 4,
             channel TYPE c LENGTH 20,
             status TYPE c LENGTH 12,
             attempts TYPE i,
           END OF input_row,
           input_rows TYPE STANDARD TABLE OF input_row WITH DEFAULT KEY.
    CLASS-METHODS calculate
      IMPORTING rows TYPE input_rows company TYPE c channel TYPE c max_attempts TYPE i
      RETURNING VALUE(event_count) TYPE i.
ENDCLASS.
CLASS zcl_ent_event_backlog IMPLEMENTATION.
  METHOD calculate.
    DATA row TYPE input_row.
    event_count = 0.
    LOOP AT rows INTO row WHERE company = company AND channel = channel.
      IF ( row-status = 'PENDING' OR row-status = 'RETRY' ) AND row-attempts < max_attempts.
        event_count = event_count + 1.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.
ENDCLASS.
