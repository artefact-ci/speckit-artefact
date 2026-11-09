import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  driftedFeatures,
  featureIdOf,
  parseProductIndex,
  parseRequirementRefs,
  parseScenarios,
  parseStatus,
  traceEpics,
  epicCells,
  traceFeature,
  traceRequirements,
} from './core.mts';

const SPEC = `# Feature Specification: Order note

**Status**: Implemented

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a note (Priority: P1)

**Acceptance Scenarios**:

1. **Given** an order, **When** the customer saves a note, **Then** the summary shows it.
2. **Given** a note of 501 characters, **When** it is saved, **Then** it is refused.

---

### User Story 2 - Only my orders (Priority: P1)

**Acceptance Scenarios**:

1. **Given** another customer's order, **When** I save a note, **Then** the answer is "not found".

### Edge Cases

1. Two saves at the same time?

## Requirements *(mandatory)*

1. **FR-001**: Not a scenario.
`;

describe('featureIdOf', () => {
  it('reads the number prefix of a feature directory', () => {
    assert.equal(featureIdOf('specs/003-order-note'), '003');
    assert.equal(featureIdOf('/abs/specs/012-x/'), '012');
  });

  it('rejects a directory without a number prefix', () => {
    assert.throws(() => featureIdOf('specs/order-note'), /préfixe numérique/);
  });
});

describe('parseScenarios', () => {
  it('numbers acceptance scenarios by story and position, ignoring edge cases and requirements', () => {
    const scenarios = parseScenarios('003', SPEC);

    assert.deepEqual(
      scenarios.map((scenario) => scenario.id),
      ['003-US1-AS1', '003-US1-AS2', '003-US2-AS1'],
    );
    assert.match(scenarios[1]?.text ?? '', /501 characters/);
    assert.ok(scenarios.every((scenario) => !scenario.retired));
  });

  it('marks a scenario that starts with **Retired** as retired, keeping its number', () => {
    const spec = SPEC.replace(
      '2. **Given** a note of 501',
      '2. **Retired** (replaced by 007-US1-AS1): **Given** a note of 501',
    );
    const retired = parseScenarios('003', spec).find((scenario) => scenario.id === '003-US1-AS2');

    assert.equal(retired?.retired, true);
  });

  it('keeps the number written in the spec, so a removed scenario leaves a gap', () => {
    const spec = SPEC.replace('1. **Given** an order', '3. **Given** an order');

    assert.deepEqual(
      parseScenarios('003', spec).map((scenario) => scenario.id),
      ['003-US1-AS3', '003-US1-AS2', '003-US2-AS1'],
    );
  });
});

describe('parseStatus', () => {
  it('reads the status line of the spec', () => {
    assert.equal(parseStatus(SPEC), 'Implemented');
    assert.equal(parseStatus(SPEC.replace('Implemented', 'Draft')), 'Draft');
  });

  it('rejects a missing or unknown status', () => {
    assert.throws(() => parseStatus(SPEC.replace('**Status**: Implemented', '')), /Status/);
    assert.throws(() => parseStatus(SPEC.replace('Implemented', 'Done')), /Done/);
  });
});

describe('traceFeature', () => {
  const scenarios = parseScenarios('003', SPEC);
  const implemented = { status: 'Implemented' } as const;

  it('maps each scenario to the test files that name it, and lists the uncovered ones', () => {
    const report = traceFeature('003', scenarios, implemented, [
      {
        path: 'libs/api/orders/src/lib/domain/order.spec.ts',
        content: `it('003-US1-AS1: shows the note', () => {});`,
      },
      {
        path: 'apps/api/tests/orders.e2e.spec.ts',
        content: `it("003-US1-AS1: e2e", () => {}); it('003-US2-AS1: 404', () => {});`,
      },
    ]);

    assert.deepEqual(report.rows.find((row) => row.id === '003-US1-AS1')?.tests, [
      'apps/api/tests/orders.e2e.spec.ts',
      'libs/api/orders/src/lib/domain/order.spec.ts',
    ]);
    assert.deepEqual(report.uncovered, ['003-US1-AS2']);
    assert.equal(report.ok, false);
  });

  it('does not count an id that is only a prefix of another one', () => {
    const report = traceFeature('003', scenarios, implemented, [
      { path: 'a.spec.ts', content: `it('003-US1-AS12: other', () => {});` },
    ]);

    assert.deepEqual(report.rows.find((row) => row.id === '003-US1-AS1')?.tests, []);
  });

  it('reports test ids of this feature that match no scenario, and ignores other features', () => {
    const report = traceFeature('003', scenarios, implemented, [
      {
        path: 'a.spec.ts',
        content: `it('003-US1-AS1: ok', () => {}); it('003-US1-AS2: ok', () => {}); it('003-US2-AS1: ok', () => {});`,
      },
      {
        path: 'b.spec.ts',
        content: `it('003-US9-AS1: removed scenario', () => {}); it('004-US1-AS1: other feature', () => {});`,
      },
    ]);

    assert.deepEqual(report.orphans, [{ id: '003-US9-AS1', path: 'b.spec.ts' }]);
    assert.deepEqual(report.uncovered, []);
    assert.equal(report.ok, false);
  });

  it('is ok when every scenario has a test and no test names an unknown scenario', () => {
    const report = traceFeature('003', scenarios, implemented, [
      {
        path: 'a.spec.ts',
        content: `it('003-US1-AS1: a', () => {}); it('003-US1-AS2: b', () => {}); it('003-US2-AS1: c', () => {});`,
      },
    ]);

    assert.equal(report.ok, true);
  });

  it('is not ok when the spec has no acceptance scenario', () => {
    assert.equal(traceFeature('003', [], implemented, []).ok, false);
  });

  it('tolerates uncovered scenarios in a Draft spec, unless strict, but never orphans', () => {
    const draft = traceFeature('003', scenarios, { status: 'Draft' }, [
      { path: 'a.spec.ts', content: `it('003-US1-AS1: a', () => {});` },
    ]);
    assert.deepEqual(draft.uncovered, ['003-US1-AS2', '003-US2-AS1']);
    assert.equal(draft.ok, true);

    const strict = traceFeature('003', scenarios, { status: 'Draft', strict: true }, []);
    assert.equal(strict.ok, false);

    const orphan = traceFeature('003', scenarios, { status: 'Draft' }, [
      { path: 'a.spec.ts', content: `it('003-US9-AS1: gone', () => {});` },
    ]);
    assert.equal(orphan.ok, false);
  });

  it('does not require a test for a retired scenario, and refuses a test that still cites it', () => {
    const withRetired = parseScenarios(
      '003',
      SPEC.replace('2. **Given** a note of 501', '2. **Retired**: **Given** a note of 501'),
    );
    const covered = `it('003-US1-AS1: a', () => {}); it('003-US2-AS1: c', () => {});`;

    const clean = traceFeature('003', withRetired, implemented, [
      { path: 'a.spec.ts', content: covered },
    ]);
    assert.deepEqual(clean.uncovered, []);
    assert.equal(clean.ok, true);

    const stale = traceFeature('003', withRetired, implemented, [
      { path: 'a.spec.ts', content: covered },
      { path: 'b.spec.ts', content: `it('003-US1-AS2: old rule', () => {});` },
    ]);
    assert.deepEqual(stale.retiredCited, [{ id: '003-US1-AS2', path: 'b.spec.ts' }]);
    assert.equal(stale.ok, false);
  });

  it('treats every scenario of a Retired spec as retired', () => {
    const retired = traceFeature('003', scenarios, { status: 'Retired' }, []);
    assert.deepEqual(retired.uncovered, []);
    assert.equal(retired.ok, true);

    const cited = traceFeature('003', scenarios, { status: 'Retired' }, [
      { path: 'a.spec.ts', content: `it('003-US2-AS1: still here', () => {});` },
    ]);
    assert.equal(cited.ok, false);
  });
});

describe('driftedFeatures', () => {
  const diff = `diff --git a/libs/api/orders/src/order.spec.ts b/libs/api/orders/src/order.spec.ts
--- a/libs/api/orders/src/order.spec.ts
+++ b/libs/api/orders/src/order.spec.ts
@@ -10 +10 @@
-  it('003-US1-AS2: refuses a note of 501 characters', () => {
+  it('003-US1-AS2: refuses a note of 1001 characters', () => {
@@ -40,0 +41 @@
+  // 004-US2-AS1 is covered elsewhere
diff --git a/apps/api/tests/old.e2e.spec.ts b/apps/api/tests/old.e2e.spec.ts
deleted file mode 100644
--- a/apps/api/tests/old.e2e.spec.ts
+++ /dev/null
@@ -1 +0,0 @@
-it('005-US1-AS1: gone', () => {});
`;

  it('lists the features whose cited tests changed while their spec.md did not', () => {
    const drift = driftedFeatures(diff, ['specs/004-refunds/spec.md', 'specs/005-x/plan.md']);

    assert.deepEqual(drift, [
      { featureId: '003', paths: ['libs/api/orders/src/order.spec.ts'] },
      { featureId: '005', paths: ['apps/api/tests/old.e2e.spec.ts'] },
    ]);
  });

  it('is empty when every touched feature has its spec.md in the change', () => {
    assert.deepEqual(
      driftedFeatures(diff, [
        'specs/003-order-note/spec.md',
        'specs/004-refunds/spec.md',
        'specs/005-x/spec.md',
      ]),
      [],
    );
  });
});

const PRODUCT = `# Index du produit
requirements:
  - id: ACC-01
    title: Create an account
  - id: PAY-03
    title: Pay by mobile money
  - id: PAY-04
    title: Refund an order
  - id: PAY-01
    title: Pay cash on delivery
    retired: Replaced by PAY-03

epics:
  - id: E01
    title: Access
    goal: A merchant opens a shop without help.
    requirements: [ACC-01]
  - id: E03
    title: Payment
    goal: A customer pays and gets refunded without support.
    requirements: [PAY-03, PAY-04, PAY-01]
    depends_on: [E01]
    journeys:
      - id: E03-J1
        title: Pay then get refunded
        steps: [sign up, order, pay, ask for a refund]
      - id: E03-J2
        title: Pay cash
        retired: PAY-01 retired
`;

// Un index réduit au strict nécessaire, que chaque test complète.
const minimal = (epics: string) => `requirements:
  - id: PAY-03
    title: Pay
  - id: PAY-04
    title: Refund
epics:
${epics}`;

describe('parseProductIndex', () => {
  it('reads requirements, epics, dependencies and journeys', () => {
    const index = parseProductIndex(PRODUCT);

    assert.deepEqual(index.requirements, [
      { id: 'ACC-01', title: 'Create an account', retired: undefined },
      { id: 'PAY-03', title: 'Pay by mobile money', retired: undefined },
      { id: 'PAY-04', title: 'Refund an order', retired: undefined },
      { id: 'PAY-01', title: 'Pay cash on delivery', retired: 'Replaced by PAY-03' },
    ]);
    assert.deepEqual(index.epics[1], {
      id: 'E03',
      title: 'Payment',
      goal: 'A customer pays and gets refunded without support.',
      requirements: ['PAY-03', 'PAY-04', 'PAY-01'],
      dependsOn: ['E01'],
      journeys: [
        {
          id: 'E03-J1',
          title: 'Pay then get refunded',
          steps: ['sign up', 'order', 'pay', 'ask for a refund'],
          retired: undefined,
        },
        { id: 'E03-J2', title: 'Pay cash', steps: [], retired: 'PAY-01 retired' },
      ],
    });
  });

  it('accepts an index without epics, for a small product', () => {
    const index = parseProductIndex('requirements:\n  - id: PAY-03\n    title: Pay\n');

    assert.deepEqual(index.epics, []);
  });

  it('rejects a requirement id that is not <PREFIX>-<number>', () => {
    assert.throws(() => parseProductIndex('requirements:\n  - id: pay 3\n    title: x\n'), /pay 3/);
  });

  it('rejects a requirement without a title', () => {
    assert.throws(() => parseProductIndex('requirements:\n  - id: PAY-03\n'), /PAY-03/);
  });

  it('rejects a duplicated requirement id', () => {
    const yaml = 'requirements:\n  - id: PAY-03\n    title: a\n  - id: PAY-03\n    title: b\n';

    assert.throws(() => parseProductIndex(yaml), /PAY-03.*deux fois/);
  });

  it('rejects an empty retirement reason', () => {
    const yaml = "requirements:\n  - id: PAY-03\n    title: a\n    retired: ''\n";

    assert.throws(() => parseProductIndex(yaml), /PAY-03.*retired/);
  });

  it('rejects a file without a requirements list', () => {
    assert.throws(() => parseProductIndex('epics: []\n'), /requirements/);
  });

  it('rejects invalid YAML with its position', () => {
    assert.throws(() => parseProductIndex('requirements: [\n'), /line|ligne/i);
  });

  it('rejects an epic id that is not E<number>', () => {
    const yaml = minimal(
      '  - id: PAYMENT\n    title: P\n    goal: g\n    requirements: [PAY-03, PAY-04]\n',
    );

    assert.throws(() => parseProductIndex(yaml), /PAYMENT/);
  });

  it('rejects an epic without a goal or without requirements', () => {
    assert.throws(
      () =>
        parseProductIndex(
          minimal('  - id: E01\n    title: P\n    requirements: [PAY-03, PAY-04]\n'),
        ),
      /E01.*goal/,
    );
    assert.throws(
      () =>
        parseProductIndex(
          minimal('  - id: E01\n    title: P\n    goal: g\n    requirements: []\n'),
        ),
      /E01.*requirements/,
    );
  });

  it('rejects an epic that cites an unknown requirement', () => {
    const yaml = minimal(
      '  - id: E01\n    title: P\n    goal: g\n    requirements: [PAY-03, PAY-04, PAY-99]\n',
    );

    assert.throws(() => parseProductIndex(yaml), /E01.*PAY-99/);
  });

  it('rejects a requirement in two epics', () => {
    const yaml = minimal(
      '  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03]\n' +
        '  - id: E02\n    title: B\n    goal: g\n    requirements: [PAY-03, PAY-04]\n',
    );

    assert.throws(() => parseProductIndex(yaml), /PAY-03.*E01.*E02/);
  });

  it('rejects an active requirement outside every epic, once epics exist', () => {
    const yaml = minimal('  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03]\n');

    assert.throws(() => parseProductIndex(yaml), /PAY-04.*epic/);
  });

  it('accepts a retired requirement outside every epic', () => {
    const yaml =
      'requirements:\n  - id: PAY-03\n    title: Pay\n  - id: PAY-01\n    title: Cash\n    retired: dropped\n' +
      'epics:\n  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03]\n';

    assert.equal(parseProductIndex(yaml).epics.length, 1);
  });

  it('rejects a dependency on an unknown epic', () => {
    const yaml = minimal(
      '  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03, PAY-04]\n    depends_on: [E09]\n',
    );

    assert.throws(() => parseProductIndex(yaml), /E01.*E09/);
  });

  it('rejects a dependency cycle and names it', () => {
    const yaml = minimal(
      '  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03]\n    depends_on: [E02]\n' +
        '  - id: E02\n    title: B\n    goal: g\n    requirements: [PAY-04]\n    depends_on: [E01]\n',
    );

    assert.throws(() => parseProductIndex(yaml), /E01 → E02 → E01/);
  });

  it("rejects a journey whose id does not start with its epic's id", () => {
    const yaml = minimal(
      '  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03, PAY-04]\n' +
        '    journeys:\n      - id: E02-J1\n        title: j\n        steps: [a, b]\n',
    );

    assert.throws(() => parseProductIndex(yaml), /E02-J1.*E01-J/);
  });

  it('rejects an active journey without steps, and a duplicated journey id', () => {
    const journeys = (list: string) =>
      minimal(
        `  - id: E01\n    title: A\n    goal: g\n    requirements: [PAY-03, PAY-04]\n    journeys:\n${list}`,
      );

    assert.throws(
      () => parseProductIndex(journeys('      - id: E01-J1\n        title: j\n')),
      /E01-J1.*steps/,
    );
    assert.throws(
      () =>
        parseProductIndex(
          journeys(
            '      - id: E01-J1\n        title: j\n        steps: [a]\n' +
              '      - id: E01-J1\n        title: k\n        steps: [a]\n',
          ),
        ),
      /E01-J1.*deux fois/,
    );
  });
});

describe('parseRequirementRefs', () => {
  it('reads the product requirements a spec implements', () => {
    assert.deepEqual(
      parseRequirementRefs('**Status**: Draft\n\n**Product Requirements**: PAY-03, PAY-04\n'),
      ['PAY-03', 'PAY-04'],
    );
  });

  it('reads None as no requirement', () => {
    assert.deepEqual(parseRequirementRefs('**Product Requirements**: None\n'), []);
  });

  it('ignores a trailing comma', () => {
    assert.deepEqual(parseRequirementRefs('**Product Requirements**: PAY-03,\n'), ['PAY-03']);
  });

  it('tells a missing line apart from None', () => {
    assert.equal(parseRequirementRefs(SPEC), undefined);
  });
});

describe('traceRequirements', () => {
  const index = {
    requirements: [
      { id: 'PAY-03', title: 'Pay by mobile money' },
      { id: 'PAY-04', title: 'Refund' },
      { id: 'ORD-01', title: 'Order note' },
      { id: 'PAY-01', title: 'Cash', retired: 'Replaced by PAY-03' },
    ],
    epics: [],
  };

  it('maps each requirement to its specs, and its state to the least advanced active spec', () => {
    const report = traceRequirements(index, [
      { featureDir: 'specs/003-pay', status: 'Shipped', refs: ['PAY-03'] },
      { featureDir: 'specs/007-pay-v2', status: 'Draft', refs: ['PAY-03', 'ORD-01'] },
      { featureDir: 'specs/002-note', status: 'Retired', refs: ['ORD-01'] },
    ]);

    assert.deepEqual(
      report.rows.map((row) => [row.id, row.state, row.specs.map((spec) => spec.featureDir)]),
      [
        ['PAY-03', 'Draft', ['specs/003-pay', 'specs/007-pay-v2']],
        ['PAY-04', 'Unspecified', []],
        ['ORD-01', 'Draft', ['specs/002-note', 'specs/007-pay-v2']],
        ['PAY-01', 'Retired', []],
      ],
    );
    assert.equal(report.ok, true);
  });

  it('marks a requirement whose specs are all retired as retired', () => {
    const report = traceRequirements(index, [
      { featureDir: 'specs/002-note', status: 'Retired', refs: ['ORD-01'] },
    ]);

    assert.equal(report.rows.find((row) => row.id === 'ORD-01')?.state, 'Retired');
  });

  it('marks a requirement retired in the index as retired, and warns about specs still citing it', () => {
    const report = traceRequirements(index, [
      { featureDir: 'specs/001-cash', status: 'Shipped', refs: ['PAY-01'] },
      { featureDir: 'specs/000-old', status: 'Retired', refs: ['PAY-01'] },
    ]);

    assert.equal(report.rows.find((row) => row.id === 'PAY-01')?.state, 'Retired');
    assert.deepEqual(report.retiredCited, [{ featureDir: 'specs/001-cash', id: 'PAY-01' }]);
    assert.equal(report.ok, true);
  });

  it('fails when a spec cites a requirement absent from the index', () => {
    const report = traceRequirements(index, [
      { featureDir: 'specs/003-pay', status: 'Draft', refs: ['PAY-99'] },
    ]);

    assert.deepEqual(report.unknown, [{ featureDir: 'specs/003-pay', id: 'PAY-99' }]);
    assert.equal(report.ok, false);
  });

  it('fails when a spec has no Product Requirements line, so that none is forgotten', () => {
    const report = traceRequirements(index, [
      { featureDir: 'specs/003-pay', status: 'Draft', refs: undefined },
    ]);

    assert.deepEqual(report.missingLine, ['specs/003-pay']);
    assert.equal(report.ok, false);
  });

  it('does not require the line in a retired spec, written before the index existed', () => {
    const report = traceRequirements(index, [
      { featureDir: 'specs/002-note', status: 'Retired', refs: undefined },
    ]);

    assert.deepEqual(report.missingLine, []);
    assert.equal(report.ok, true);
  });

  it('without an index, accepts specs without the line but not specs that cite a requirement', () => {
    const report = traceRequirements(undefined, [
      { featureDir: 'specs/002-note', status: 'Draft', refs: undefined },
      { featureDir: 'specs/003-pay', status: 'Draft', refs: ['PAY-03'] },
    ]);

    assert.deepEqual(report.rows, []);
    assert.deepEqual(report.missingLine, []);
    assert.deepEqual(report.unknown, [{ featureDir: 'specs/003-pay', id: 'PAY-03' }]);
    assert.equal(report.ok, false);
  });
});

describe('traceEpics', () => {
  const index = parseProductIndex(PRODUCT);
  const specs = (list: [string, 'Draft' | 'Implemented' | 'Shipped' | 'Retired', string[]][]) =>
    list.map(([featureDir, status, refs]) => ({ featureDir, status, refs }));
  const trace = (
    list: [string, 'Draft' | 'Implemented' | 'Shipped' | 'Retired', string[]][],
    files: { path: string; content: string }[] = [],
  ) => {
    const refs = specs(list);
    return traceEpics(index, traceRequirements(index, refs).rows, refs, files);
  };

  it('derives the state of an epic from its least advanced active requirement', () => {
    const report = trace([
      ['specs/001-account', 'Shipped', ['ACC-01']],
      ['specs/002-pay', 'Implemented', ['PAY-03']],
    ]);

    assert.deepEqual(
      report.rows.map((row) => [row.id, row.state]),
      [
        ['E01', 'Shipped'],
        // PAY-04 n'a pas de spec ; PAY-01, retirée, ne compte pas.
        ['E03', 'Unspecified'],
      ],
    );
  });

  it('counts the specified and done requirements of an epic, retired ones excluded', () => {
    const progressOf = (list: Parameters<typeof trace>[0]) =>
      trace(list).rows.find((row) => row.id === 'E03')?.progress;

    // PAY-04 sans spec : l'epic reste non spécifié, mais il est commencé.
    assert.deepEqual(progressOf([['specs/002-pay', 'Implemented', ['PAY-03']]]), {
      total: 2,
      specified: 1,
      done: 1,
    });
    assert.deepEqual(
      progressOf([
        ['specs/002-pay', 'Draft', ['PAY-03']],
        ['specs/003-refund', 'Shipped', ['PAY-04']],
      ]),
      { total: 2, specified: 2, done: 1 },
    );
    // Une exigence active dont toutes les specs sont retirées est à refaire.
    assert.deepEqual(progressOf([['specs/003-refund', 'Retired', ['PAY-04']]]), {
      total: 2,
      specified: 0,
      done: 0,
    });
  });

  it('shows a started epic as in progress, with its progress', () => {
    const row = (state: 'Unspecified' | 'Draft' | 'Retired', specified: number) => ({
      state,
      progress: { total: 4, specified, done: 0 },
    });

    assert.deepEqual(epicCells(row('Unspecified', 0)), {
      state: '**non spécifié**',
      progress: '0/4 spécifiées, 0/4 terminées',
    });
    assert.deepEqual(epicCells(row('Unspecified', 3)), {
      state: '**en cours**',
      progress: '3/4 spécifiées, 0/4 terminées',
    });
    assert.deepEqual(epicCells(row('Draft', 4)), {
      state: 'Draft',
      progress: '4/4 spécifiées, 0/4 terminées',
    });
    assert.deepEqual(epicCells(row('Retired', 0)), { state: 'Retired', progress: '' });
  });

  it('counts as still to do a requirement active in the index whose specs are all retired', () => {
    const report = trace([
      ['specs/002-pay', 'Shipped', ['PAY-03']],
      ['specs/003-refund', 'Retired', ['PAY-04']],
    ]);

    assert.equal(report.rows.find((row) => row.id === 'E03')?.state, 'Unspecified');
    assert.deepEqual(report.uncovered, []);
  });

  it('maps each journey to the tests that cite it', () => {
    const report = trace(
      [],
      [
        { path: 'apps/web-e2e/src/pay.spec.ts', content: "test('E03-J1: pays then refunds', …)" },
        { path: 'apps/web-e2e/src/other.spec.ts', content: 'nothing here' },
      ],
    );

    assert.deepEqual(
      report.journeys.map((journey) => [journey.id, journey.retired, journey.tests]),
      [
        ['E03-J1', false, ['apps/web-e2e/src/pay.spec.ts']],
        ['E03-J2', true, []],
      ],
    );
    assert.equal(report.ok, true);
  });

  it('tolerates an uncovered journey while its epic is in progress', () => {
    const report = trace([['specs/002-pay', 'Implemented', ['PAY-03']]]);

    assert.deepEqual(report.uncovered, []);
    assert.equal(report.ok, true);
  });

  it('fails when the epic is done and a journey has no test', () => {
    const report = trace([
      ['specs/002-pay', 'Implemented', ['PAY-03']],
      ['specs/003-refund', 'Shipped', ['PAY-04']],
    ]);

    assert.equal(report.rows.find((row) => row.id === 'E03')?.state, 'Implemented');
    assert.deepEqual(report.uncovered, ['E03-J1']);
    assert.equal(report.ok, false);
  });

  it('fails when a test cites an unknown or a retired journey', () => {
    const report = trace(
      [],
      [
        { path: 'a.spec.ts', content: "test('E03-J9: …')" },
        { path: 'b.spec.ts', content: "test('E03-J2: …')" },
      ],
    );

    assert.deepEqual(report.orphans, [{ id: 'E03-J9', path: 'a.spec.ts' }]);
    assert.deepEqual(report.retiredCited, [{ id: 'E03-J2', path: 'b.spec.ts' }]);
    assert.equal(report.ok, false);
  });

  it('warns, without failing, about a draft spec whose epic waits for another one', () => {
    const report = trace([
      ['specs/001-account', 'Draft', ['ACC-01']],
      ['specs/002-pay', 'Draft', ['PAY-03']],
    ]);

    assert.deepEqual(report.blocked, [
      { featureDir: 'specs/002-pay', epicId: 'E03', waitingOn: ['E01'] },
    ]);
    assert.equal(report.ok, true);
  });

  it('no longer warns once the dependency is implemented', () => {
    const report = trace([
      ['specs/001-account', 'Implemented', ['ACC-01']],
      ['specs/002-pay', 'Draft', ['PAY-03']],
    ]);

    assert.deepEqual(report.blocked, []);
  });

  it('without epics, still fails on a test that cites a journey', () => {
    const empty = { requirements: [], epics: [] };
    const report = traceEpics(empty, [], [], [{ path: 'a.spec.ts', content: "test('E01-J1: …')" }]);

    assert.deepEqual(report.orphans, [{ id: 'E01-J1', path: 'a.spec.ts' }]);
    assert.equal(report.ok, false);
  });
});
