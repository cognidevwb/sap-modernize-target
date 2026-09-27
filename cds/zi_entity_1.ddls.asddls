@EndUserText.label: 'Entity View 1'
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_ENTITY_1
  as select from I_StandardTable1
{
  key EntityKey,
      EntityField1,
      EntityField2
}
