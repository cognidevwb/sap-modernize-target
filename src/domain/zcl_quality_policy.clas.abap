CLASS zcl_quality_policy DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    CLASS-METHODS evaluate
      IMPORTING sample_size TYPE i defective TYPE i lot_quantity TYPE i max_defect_bp TYPE i
      RETURNING VALUE(reason) TYPE string.
ENDCLASS.
CLASS zcl_quality_policy IMPLEMENTATION.
  METHOD evaluate.
    IF sample_size <= 0 OR sample_size > lot_quantity OR sample_size > 100000
      OR defective < 0 OR defective > sample_size OR max_defect_bp < 0 OR max_defect_bp > 10000.
      reason = 'INVALID_INSPECTION'.
    ELSEIF defective * 10000 > sample_size * max_defect_bp.
      reason = 'QUARANTINE'.
    ELSE.
      reason = 'ACCEPT'.
    ENDIF.
  ENDMETHOD.
ENDCLASS.
