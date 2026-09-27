@EndUserText.label: 'Entity View 2'
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_ENTITY_2
  as select from I_StandardTable2
{
  key EntityKey,
      EntityField1,
      EntityField2
}
