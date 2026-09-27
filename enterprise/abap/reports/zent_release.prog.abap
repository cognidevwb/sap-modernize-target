REPORT zent_release.
PARAMETERS p_order TYPE zent_id OBLIGATORY.
PARAMETERS p_bukrs TYPE bukrs OBLIGATORY.
TRY.
 zcl_ent_order=>release( order_id = p_order company = p_bukrs ).
 COMMIT WORK AND WAIT.
 WRITE: / 'Release recorded; integration event pending'.
CATCH zcx_ent_domain.
 ROLLBACK WORK.
 WRITE: / 'Release rejected; no changes committed'.
ENDTRY.
