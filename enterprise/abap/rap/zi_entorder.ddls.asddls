@EndUserText.label: 'Enterprise order'
@AccessControl.authorizationCheck: #CHECK
define root view entity ZI_EntOrder as select from zent_order { key id as Id, company_code as CompanyCode, customer_id as CustomerId, status as Status, total_amount as TotalAmount }
