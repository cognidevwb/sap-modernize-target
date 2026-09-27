import test from 'node:test';
import assert from 'node:assert/strict';
import '../node_modules/.abap-generated/init.mjs';

async function evaluate(name, values) {
  const type = abap.Classes[`ZCL_${name.toUpperCase()}_POLICY`];
  const input = {};
  for (const [key, value] of Object.entries(values)) {
    const definition = type.METHODS.EVALUATE.parameters[key.toUpperCase()];
    assert.ok(definition, `Parameter ${key} exists`);
    input[key] = typeof value === 'string' ? new abap.types.Character(Math.max(1, value.length)).set(value) : definition.type().set(value);
  }
  return (await type.evaluate(input)).get();
}
const scenarios = [
  ['credit', {blocked:' ',limit_minor:10000,exposure_minor:9000,order_minor:1000}, 'APPROVED', [
    [{blocked:'X'},'CUSTOMER_BLOCKED'], [{order_minor:1001},'CREDIT_LIMIT_EXCEEDED'], [{order_minor:0},'INVALID_AMOUNT']]],
  ['po_approval', {status:'DRAFT',creator:'buyer',approver:'manager',amount_minor:10000,authority_minor:10000}, 'APPROVED', [
    [{approver:'buyer'},'SEGREGATION_OF_DUTIES'], [{authority_minor:9999},'APPROVAL_LIMIT_EXCEEDED'], [{status:'APPROVED'},'INVALID_STATE']]],
  ['stock', {available:10,reserved:5,requested:10,revision:3,expected_revision:3}, 'RESERVABLE', [
    [{expected_revision:2},'STALE_REVISION'], [{requested:11},'INSUFFICIENT_STOCK'], [{requested:0},'INVALID_QUANTITY']]],
  ['quality', {sample_size:100,defective:1,lot_quantity:1000,max_defect_bp:100}, 'ACCEPT', [
    [{defective:2},'QUARANTINE'], [{sample_size:0},'INVALID_INSPECTION'], [{sample_size:100001},'INVALID_INSPECTION']]],
  ['production', {status:'SCHEDULED',planned:100,good:97,scrap:3}, 'COMPLETE', [
    [{scrap:2},'YIELD_DOES_NOT_BALANCE'], [{good:-1},'YIELD_DOES_NOT_BALANCE'], [{status:'COMPLETED'},'INVALID_STATE']]],
  ['return', {status:'INVOICED',sold:10,returned:3,requested:7}, 'AUTHORIZE', [
    [{requested:8},'RETURN_EXCEEDS_SALE'], [{status:'SHIPPED'},'NOT_INVOICED'], [{returned:-1},'RETURN_EXCEEDS_SALE']]],
  ['payment', {invoice_currency:'EUR',payment_currency:'EUR',total_minor:10000,paid_minor:2000,received_minor:8000}, 'SETTLED', [
    [{received_minor:7999},'PARTIAL'], [{received_minor:8001},'INVALID_PAYMENT'], [{payment_currency:'USD'},'CURRENCY_MISMATCH']]],
  ['price', {valid_from:'20260901',valid_to:'20260930',order_date:'20260930',unit_minor:1000,quantity:2}, 'APPLICABLE', [
    [{order_date:'20261001'},'PRICE_NOT_EFFECTIVE'], [{valid_to:'20260801'},'INVALID_CONDITION'], [{quantity:0},'INVALID_CONDITION']]],
  ['picking', {status:'ASSIGNED',assigned_to:'operator',actor:'operator',requested:5,picked:5}, 'CONFIRMED', [
    [{actor:'other'},'WRONG_OPERATOR'], [{status:'CONFIRMED'},'INVALID_STATE'], [{picked:4},'PICK_MISMATCH']]],
  ['receipt', {status:'APPROVED',ordered:10,received:3,delivery:7}, 'RECEIVED', [
    [{delivery:6},'PARTIAL'], [{delivery:8},'OVER_RECEIPT'], [{status:'DRAFT'},'NOT_APPROVED']]],
];
for (const [name, input, expected, rejections] of scenarios) {
  test(`${name}: business acceptance boundary`, async () => assert.equal(await evaluate(name, input), expected));
  for (const [change, result] of rejections) {
    test(`${name}: ${JSON.stringify(change)} -> ${result}`, async () => {
      assert.equal(await evaluate(name, {...input, ...change}), result);
    });
  }
}
