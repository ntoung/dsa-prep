import type { Problem } from '../types'

export interface ProblemListDef {
  id: string
  name: string
  // Omitted entirely = "every problem in problems.json" (the full authored
  // set, which the app already calls NeetCode 150). Every other list is an
  // explicit subset of those same ids - all these curated lists draw from
  // the same underlying LeetCode problems, so membership is just a
  // reference, never a content copy.
  problemIds?: string[]
}

const BLIND_75_IDS = [
  'two-sum',
  'best-time-to-buy-and-sell-stock',
  'contains-duplicate',
  'product-of-array-except-self',
  'maximum-subarray',
  'maximum-product-subarray',
  'find-minimum-in-rotated-sorted-array',
  'search-in-rotated-sorted-array',
  '3sum',
  'container-with-most-water',
  'sum-of-two-integers',
  'number-of-1-bits',
  'counting-bits',
  'missing-number',
  'reverse-bits',
  'climbing-stairs',
  'coin-change',
  'longest-increasing-subsequence',
  'longest-common-subsequence',
  'word-break',
  'combination-sum',
  'house-robber',
  'house-robber-ii',
  'decode-ways',
  'unique-paths',
  'jump-game',
  'clone-graph',
  'course-schedule',
  'pacific-atlantic-water-flow',
  'number-of-islands',
  'longest-consecutive-sequence',
  'alien-dictionary',
  'graph-valid-tree',
  'number-of-connected-components-in-an-undirected-graph',
  'insert-interval',
  'merge-intervals',
  'non-overlapping-intervals',
  'meeting-rooms',
  'meeting-rooms-ii',
  'reverse-linked-list',
  'linked-list-cycle',
  'merge-two-sorted-lists',
  'merge-k-sorted-lists',
  'remove-nth-node-from-end-of-list',
  'reorder-list',
  'set-matrix-zeroes',
  'spiral-matrix',
  'rotate-image',
  'word-search',
  'longest-substring-without-repeating-characters',
  'longest-repeating-character-replacement',
  'minimum-window-substring',
  'valid-anagram',
  'group-anagrams',
  'valid-parentheses',
  'valid-palindrome',
  'longest-palindromic-substring',
  'palindromic-substrings',
  'encode-and-decode-strings',
  'top-k-frequent-elements',
  'binary-tree-maximum-path-sum',
  'serialize-and-deserialize-binary-tree',
  'subtree-of-another-tree',
  'construct-binary-tree-from-preorder-and-inorder-traversal',
  'validate-binary-search-tree',
  'kth-smallest-element-in-a-bst',
  'lowest-common-ancestor-of-a-binary-search-tree',
  'implement-trie-prefix-tree',
  'design-add-and-search-words-data-structure',
  'word-search-ii',
  'maximum-depth-of-binary-tree',
  'same-tree',
  'invert-binary-tree',
  'binary-tree-level-order-traversal',
  'find-median-from-data-stream',
]

export const PROBLEM_LISTS: ProblemListDef[] = [
  { id: 'neetcode150', name: 'NeetCode 150' },
  { id: 'blind75', name: 'Blind 75', problemIds: BLIND_75_IDS },
]

export function isProblemInList(problem: Problem, list: ProblemListDef): boolean {
  return list.problemIds ? list.problemIds.includes(problem.id) : true
}

export function isProblemInEnabledLists(problem: Problem, enabledListIds: string[]): boolean {
  return enabledListIds.some((id) => {
    const list = PROBLEM_LISTS.find((l) => l.id === id)
    return list ? isProblemInList(problem, list) : false
  })
}
