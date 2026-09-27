import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execute} from '../lib/execute.mjs';
const cases = JSON.parse(await readFile(new URL('../fixtures/analytics.json', import.meta.url)));
for (const scenario of cases) {
  test(`${scenario.name}: selected business rows only, exact signed result`, async () => {
    assert.equal(await execute(scenario.name, scenario.rows, scenario.params), scenario.expected);
  });
  test(`${scenario.name}: empty and foreign organizational scope produce zero`, async () => {
    assert.equal(await execute(scenario.name, [], scenario.params), 0);
    const params = {...scenario.params};
    if ('company' in params) params.company = '9999';
    if ('plant' in params) params.plant = '9999';
    assert.equal(await execute(scenario.name, scenario.rows, params), 0);
  });
}
test('runner rejects missing parameters and unknown columns', async () => {
  await assert.rejects(execute('order_exposure', [], {}), /Missing parameter/);
  await assert.rejects(execute('order_exposure', [{invented: 1}], cases[0].params), /Unexpected column/);
});
