@EndUserText.label: 'Entity View 9'
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_ENTITY_9
  as select from I_StandardTable9
{
  key EntityKey,
      EntityField1,
      EntityField2
}
