using { contracts } from './business-types';
@path:'/integration' @requires:'IntegrationOperator'
service Integration {
  action receive(companyCode: String(4), sourceSystem: String(40), channel: String(20), payload: LargeString, timestamp: String(10), signature: String(64)) returns contracts.CommandResult;
}
