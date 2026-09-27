REPORT zent_schedule.
DATA jobcount TYPE tbtcjob-jobcount.
AUTHORITY-CHECK OBJECT 'S_BTCH_JOB' ID 'JOBACTION' FIELD 'RELE' ID 'JOBGROUP' FIELD ''.
IF sy-subrc <> 0. RETURN. ENDIF.
CALL FUNCTION 'JOB_OPEN' EXPORTING jobname = 'ZENT_RECONCILIATION' IMPORTING jobcount = jobcount EXCEPTIONS OTHERS = 1.
IF sy-subrc <> 0. RETURN. ENDIF.
SUBMIT zent_reconcile VIA JOB 'ZENT_RECONCILIATION' NUMBER jobcount AND RETURN.
CALL FUNCTION 'JOB_CLOSE' EXPORTING jobname = 'ZENT_RECONCILIATION' jobcount = jobcount strtimmed = abap_true EXCEPTIONS OTHERS = 1.
IF sy-subrc <> 0. WRITE: / 'Job release failed'. ENDIF.
