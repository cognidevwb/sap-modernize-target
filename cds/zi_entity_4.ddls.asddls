@EndUserText.label: 'Entity View 4'
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_ENTITY_4
  as select from I_StandardTable4
{
  key EntityKey,
      EntityField1,
      EntityField2
}
