using ControlTower from '../srv/control-tower';
annotate ControlTower.Orders with @UI: {
 HeaderInfo: {TypeName:'Sales order', TypeNamePlural:'Sales orders', Title:{Value:ID}, Description:{Value:status}},
 Facets:[{ $Type:'UI.ReferenceFacet', Label:'Order details', Target:'@UI.Identification' }],
 Identification:[{Value:ID},{Value:companyCode},{Value:status},{Value:total},{Value:currency},{Value:requestedDate}],
 SelectionFields:[companyCode,status],
 LineItem:[{Value:ID},{Value:companyCode},{Value:status},{Value:total},{Value:currency},{Value:requestedDate}]
};
