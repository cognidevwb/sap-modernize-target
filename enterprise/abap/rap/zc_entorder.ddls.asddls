@EndUserText.label: 'Enterprise order projection'
@AccessControl.authorizationCheck: #CHECK
define root view entity ZC_EntOrder as projection on ZI_EntOrder { key Id, CompanyCode, CustomerId, Status, TotalAmount }
