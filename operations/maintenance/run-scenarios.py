#!/usr/bin/env python3
"""Exercise existing SAP maintenance playbooks; never implement a second SUM emulator."""
from __future__ import annotations
import argparse, copy, hashlib, json, os, re, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent

def write(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n' if not isinstance(value, str) else value)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=HERE / 'results')
    parser.add_argument('--playbooks', default=os.environ.get('COGNIDEV_PLAYBOOKS_V2_ROOT', '/Applications/CogniDev Workbench.app/Contents/Resources/playbooks-v2'))
    args = parser.parse_args()
    output = args.output.resolve()
    scripts = Path(args.playbooks).resolve() / 'sap-maintenance-cycle/scripts'
    if not (scripts / 'execute.py').is_file(): raise RuntimeError('Existing sap-maintenance-cycle playbook is required')
    tests = subprocess.run(['npm', 'test'], cwd=ROOT / 'enterprise', capture_output=True, text=True, timeout=300)
    log = (tests.stdout + tests.stderr).replace(str(ROOT), '<project>')
    if tests.returncode: raise RuntimeError('Business baseline failed; maintenance scenarios were not run')
    total = re.search(r'tests\s+(\d+)', log)
    passed = re.search(r'pass\s+(\d+)', log)
    if not total or not passed or total.group(1) != passed.group(1): raise RuntimeError('Cannot establish passing business test counts')
    write(output / 'business-tests.log', log)
    regression = {'synthetic': True, 'evidenceKind': 'real-local-application-tests-not-native-SAP', 'summary': {'total': int(total.group(1)), 'passed': int(passed.group(1)), 'failed': 0, 'blocked': 0}, 'suites': [{'id':'enterprise-business-and-integration', 'status':'passed', 'logSha256': hashlib.sha256(log.encode()).hexdigest()}]}
    baseline = {'synthetic':True, 'systemId':'DEMO', 'product':'SAP S/4HANA', 'release':'2023', 'stack':'FPS01', 'kernel':'demonstration baseline', 'database':'HANA demonstration model', 'os':'demonstration OS', 'components':[{'name':'S4CORE','release':'108','supportPackage':'01'},{'name':'SAP_BASIS','release':'758','supportPackage':'01'}], 'addons':[{'name':'Demo supplier connector'}]}
    foundation = {'schemaVersion':'sap-modernization-assessment/v1','synthetic':True,'inputDigest':hashlib.sha256(json.dumps(baseline,sort_keys=True).encode()).hexdigest(),'inventory':{'objects':{'types':{'CLAS':len(list((ROOT/'src').rglob('*.abap')))+len(list((ROOT/'enterprise/abap').rglob('*.clas.abap'))),'TABL':len(list((ROOT/'database').glob('*.tabl.xml')))+len(list((ROOT/'enterprise/abap').rglob('*.tabl.xml')))}}},'capabilities':[{'id':'hana','detected':True},{'id':'polyglot','detected':True},{'id':'integration-suite','detected':True}],'scenarios':[],'evidence':[],'gaps':[]}
    results=[]
    for scenario in json.loads((HERE / 'scenarios.json').read_text())['scenarios']:
        with tempfile.TemporaryDirectory(prefix='sap-maintenance-demo-') as temporary:
            root=Path(temporary); base=root/'.cognidev/sap-maintenance'; evidence=base/'evidence'
            write(root/'.cognidev/sap-modernization/assessment-bundle.json',foundation)
            target={'synthetic':True,'product':'SAP S/4HANA','release':scenario.get('targetRelease','2023'),'stack':scenario.get('targetStack','FPS02'),'components':[{'name':c['name'],'release':c['release'],'supportPackage':scenario.get('targetSupportPackage','02')} for c in baseline['components']]}
            sample_tests=copy.deepcopy(regression)
            if scenario.get('regressionFailure'): sample_tests['summary'].update(failed=1,passed=sample_tests['summary']['total']-1)
            inputs={
              'system-baseline.json':baseline,'target-stack.json':target,
              'add-ons.json':{'synthetic':True,'addons':[{'name':'Demo supplier connector','target':target['stack'],'compatibility':scenario.get('addonCompatibility','supported'),'evidence':'Synthetic compatibility case; no vendor attestation'}]},
              'sap-notes.json':{'synthetic':True,'notes':[{'id':'DEMO-CORRECTION-01','title':'Demonstration correction, not an SAP Note number','severity':'high','applicable':True,'status':'planned','owner':'' if scenario.get('unownedNote') else 'Demo Basis Owner'}]},
              'adjustments.json':{'synthetic':True,'items':[{'object':'ZENT_ORDER','type':'SPDD','disposition':'adopt','owner':'Demo Data Owner','transport':'DEMO-K900001'}]},
              'regression-results.json':sample_tests,
              'rehearsal.json':{'synthetic':True,'status':'passed','sumVersion':'local-emulator','elapsedMinutes':1,'downtimeMinutes':0,'backupProven':True,'rollbackProven':True},
              'sum-log.txt':'LOCAL DEMONSTRATION ONLY: no native SUM process was invoked.\n'
            }
            for name,value in inputs.items(): write(evidence/name,value)
            config={'schemaVersion':'sap-maintenance-execution-config/v1','mode':scenario.get('mode','local-simulation'),'environment':'LOCAL','authorizationPhrase':'EXECUTE SAP UPDATE'}
            if scenario.get('simulateFailureAt'):config['simulateFailureAt']=scenario['simulateFailureAt']
            write(base/'execution-config.json',config)
            def run(name,*options):return subprocess.run(['python3',str(scripts/name),*options,str(root)],capture_output=True,text=True,timeout=120)
            plan=run('plan.py')
            if plan.returncode:raise RuntimeError(scenario['id']+': '+plan.stderr)
            if scenario.get('changeEvidenceAfterPlan'):
                altered=copy.deepcopy(sample_tests);altered['summary']['failed']=1;write(evidence/'regression-results.json',altered)
            execution=run('execute.py')
            if scenario.get('expectedError'):
                if execution.returncode==0 or scenario['expectedError'] not in execution.stderr:raise RuntimeError('Stale maintenance evidence was accepted')
                results.append({'id':scenario['id'],'passed':True,'executionState':'rejected-stale-input','nativeSapMutation':'not-performed'});continue
            if execution.returncode:raise RuntimeError(scenario['id']+': '+execution.stderr)
            assessment=json.loads((base/'assessment.json').read_text());record=json.loads((base/'execution.json').read_text())
            if record['state']!=scenario['expectedState']:raise RuntimeError(f"{scenario['id']}: expected {scenario['expectedState']}, got {record['state']}")
            if scenario.get('requiredHandoff') and not any(h['playbookId']==scenario['requiredHandoff'] for h in assessment['handoffs']):raise RuntimeError('Required release handoff is absent')
            if scenario.get('expectedRecovery'):
                if record.get('recovery',{}).get('state')!=scenario['expectedRecovery'] or (base/'local-sap-system.json').exists():raise RuntimeError('Failed update did not restore initial local state')
            verified=run('execute.py','--verify')
            if verified.returncode:raise RuntimeError(scenario['id']+': '+verified.stderr)
            if record['state']=='simulated-complete' and assessment['readiness']['state']!='simulation-ready':raise RuntimeError('Synthetic evidence escaped its simulation boundary')
            result={'id':scenario['id'],'passed':True,'assessmentState':assessment['readiness']['state'],'executionState':record['state'],'phases':record['phases'],'recovery':record.get('recovery'),'nativeSapMutation':'not-performed'}
            # The structured fixture evidence contains no workstation paths or secrets.
            write(output/scenario['id']/'assessment.json',assessment)
            write(output/scenario['id']/'execution.json',record)
            results.append(result)
    report={'schemaVersion':'sap-maintenance-demo-results/v1','synthetic':True,'status':'passed','scenarios':results,'localBusinessTests':regression['summary'],'nativeSapMutation':'not-performed','boundary':'Real playbook code, local system model, synthetic SAP stack/rehearsal inputs. Local business regression was executed; native SAP compatibility and rollback were not.'}
    write(output/'summary.json',report)
    print(json.dumps({'status':'passed','scenarios':len(results),'businessTests':regression['summary']['passed'],'nativeSapMutation':'not-performed'}))

if __name__=='__main__':main()
