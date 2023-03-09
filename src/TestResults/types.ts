import { ItBlock, ParsedRange } from 'jest-editor-support';
import {
  Location,
  TestAssertionStatus,
  TestReconciliationStateType,
} from '../NightwatchRunner';
import { createMessaging } from './matchByContext';
import { ContainerNode, DataNode, IsMatchedEvents } from './matchNode';
import { createTestResultEvents } from './testResultEvents';

export type TestResultEvents = ReturnType<typeof createTestResultEvents>;

export type IsMatchedEvent = (typeof IsMatchedEvents)[number];
export type MatchEvent =
  | IsMatchedEvent
  | 'match-failed'
  | 'match-failed:1-to-many'
  | 'duplicate-name'
  | 'invalid-location'
  | 'missing-ancestor-info';

export interface OptionalAttributes {
  fullName?: string;
  nonLiteralName?: boolean;
  // zero-based location range
  range?: ParsedRange;
  isGroup?: IsGroupType;
}

export type ContextType = 'container' | 'data';

export type IsGroupType = 'yes' | 'no' | 'maybe';

export interface MatchOptions {
  /** if true, will ignore name difference if both nodes have NonLiteral names */
  ignoreNonLiteralNameDiff?: boolean;

  // accept regular name, i.e. the name of the node, not the fullName, match.
  acceptLocalNameMatch?: boolean;

  /** if true, will ignore isGroupNode() difference */
  ignoreGroupDiff?: boolean;
  /** if true, will perform position check to see if "this" is enclosed within "other" node */
  checkIsWithin?: boolean;
}

export type NodeType<T> = ContainerNode<T> | DataNode<T>;
export type ChildNodeType<T, C extends ContextType> = C extends 'container'
  ? ContainerNode<T>
  : DataNode<T>;

export type ItemNodeType = NodeType<ItBlock | TestAssertionStatus>;

export interface TestSuiteResult {
  status: TestReconciliationStateType;
  message: string;
  assertionContainer?: ContainerNode<TestAssertionStatus>;
  results?: TestResult[];
  sorted?: SortedTestResults;
}

export interface SortedTestResults {
  fail: TestResult[];
  skip: TestResult[];
  success: TestResult[];
  unknown: TestResult[];
}

// TODO: check this
export interface LocationRange {
  start: Location;
  end: Location;
}

// TODO: check this
export interface TestIdentifier {
  title: string;
  ancestorTitles: string[];
}

// TODO: check this
export interface TestResult extends LocationRange {
  name: string;

  identifier: TestIdentifier;

  status: TestReconciliationStateType;
  shortMessage?: string;
  terseMessage?: string;

  /** Zero-based line number */
  lineNumberOfError?: number;

  // multiple results for the given range, common for parameterized (.each) tests
  multiResults?: TestResult[];

  // matching process history
  sourceHistory?: MatchEvent[];
  assertionHistory?: MatchEvent[];
}

export type MessagingInfo = {
  type: 'report-unmatched';
  unmatchedItBlocks: DataNode<ItBlock>[];
  unmatchedAssertions: DataNode<TestAssertionStatus>[];
  tContainer: ContainerNode<ItBlock>;
  aContainer: ContainerNode<TestAssertionStatus>;
};

export type MatchResultType<C extends ContextType> = [
  ChildNodeType<ItBlock, C>,
  ChildNodeType<TestAssertionStatus, C>[],
  MatchEvent,
];

export interface MatchMethodResult<C extends ContextType> {
  unmatchedT: ChildNodeType<ItBlock, C>[];
  results: MatchResultType<C>[];
}

export interface FallbackMatchResult<C extends ContextType> {
  matched?: TestResult[];
  unmatchedT?: ChildNodeType<ItBlock, C>[];
  unmatchedA?: ChildNodeType<TestAssertionStatus, C>[];
}

export type ClassicMatchType = 'by-name' | 'by-location';

export interface ContextMatchAlgorithm {
  match: (
    tContainer: ContainerNode<ItBlock>,
    aContainer: ContainerNode<TestAssertionStatus>,
    messaging: ReturnType<typeof createMessaging>,
  ) => TestResult[];
}

export interface TestStats {
  success: number;
  fail: number;
  unknown: number;
}
