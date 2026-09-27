@EndUserText.label: 'Entity View 8'
@AccessControl.authorizationCheck: #CHECK
define view entity ZI_ENTITY_8
  as select from I_StandardTable8
{
  key EntityKey,
      EntityField1,
      EntityField2
}
