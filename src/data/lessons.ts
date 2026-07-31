import type { Topic } from '../types'

export interface PatternSnippet {
  // The specific algorithm's name (e.g. "Graph BFS", "Reverse a Linked
  // List") - never the lesson's own category, since one category can cover
  // more than one named algorithm (Linked List: reverse + cycle detection;
  // Graphs: BFS + DFS).
  name: string
  code: string
}

export interface Lesson {
  category: Topic
  recognize: string
  template: string
  tips: string
  // Generic, problem-agnostic Python skeleton(s) for the pattern itself -
  // distinct from `template`'s prose description, and from any specific
  // problem's solutionCode in problems.json. Follows the same style guide
  // as problem solutions (see CLAUDE.md's "Code style for solutions"). Most
  // categories are one named algorithm; a few cover more than one distinct
  // technique, hence an array rather than a single snippet.
  snippets: PatternSnippet[]
}

export const LESSONS: Lesson[] = [
  {
    category: 'Arrays & Hashing',
    recognize:
      'A hash set or map trades space for O(1) average lookups, turning an O(n^2) brute-force scan into a single O(n) pass. Reach for it whenever you catch yourself thinking "have I seen this before," "how many times does this appear," or "group these by some derived key."',
    template:
      'Walk the array once. Maintain a hash structure - a set for plain membership, a dict for counts or last-seen index, a defaultdict(list) for grouping - and on each element either check it against what you have so far or update the structure, often after computing a complement or a signature key.',
    tips:
      'Use collections.Counter for frequency counts and comparisons instead of a hand-rolled dict. Prefix/suffix product passes avoid division entirely. A sorted-character tuple makes a clean grouping key for anagrams.',
    snippets: [
      {
        name: 'Hash Map Lookup',
        code: `seen: dict[int, int] = {}
for i, num in enumerate(nums):
    complement = target - num
    if complement in seen:
        return [seen[complement], i]
    seen[num] = i
return []`,
      },
    ],
  },
  {
    category: 'Two Pointers',
    recognize:
      'On a sorted array, or a symmetric check like a palindrome, two indices closing in from opposite ends (or one chasing the other) replace nested loops with a single O(n) pass. Look for "pair that sums to X," "is this a palindrome," or "container/water" problems.',
    template:
      'Place left at the start and right at the end. Compare the pair against the target or condition, then move whichever pointer can only improve things - usually the side that is currently the limiting factor. Continue until the pointers cross.',
    tips:
      'Sort first if the answer does not depend on original order. Skip over duplicate values carefully when the problem wants unique results. For two-boundary problems like trapping rain water, track a running max from each side as you go.',
    snippets: [
      {
        name: 'Two Pointers',
        code: `left, right = 0, len(nums) - 1
while left < right:
    total = nums[left] + nums[right]
    if total == target:
        return [left, right]
    elif total < target:
        left += 1
    else:
        right -= 1
return []`,
      },
    ],
  },
  {
    category: 'Sliding Window',
    recognize:
      'A contiguous subarray or substring question where growing the window from the right and shrinking it from the left maintains some invariant, avoiding recomputation from scratch. Look for "longest/shortest substring with property X" or "at most K distinct."',
    template:
      'Expand the window by one on the right, updating window state (a count map, a running sum, a max frequency). While the window violates the invariant, shrink from the left, updating state as items leave. Record the best window whenever it is valid.',
    tips:
      'A fixed-size window just slides both edges together in lockstep. A monotonic deque handles sliding-window max/min in O(n) total instead of O(n*k) by evicting values that can never win again.',
    snippets: [
      {
        name: 'Sliding Window',
        code: `left = 0
window: dict[str, int] = {}
result = 0
for right, char in enumerate(s):
    window[char] = window.get(char, 0) + 1
    while not is_valid(window):
        window[s[left]] -= 1
        if window[s[left]] == 0:
            del window[s[left]]
        left += 1
    result = max(result, right - left + 1)
return result`,
      },
    ],
  },
  {
    category: 'Stack',
    recognize:
      'A stack captures "the most recent unresolved item," which is exactly what nested structure (parentheses), next-greater lookups, and expression evaluation need. Look for matching pairs, "next warmer/greater element," or postfix evaluation.',
    template:
      'Push items as you scan. Before pushing a new item, pop everything on the stack that it resolves (e.g. every smaller value, for a next-greater problem), using the current index or value to answer for each popped item. Whatever is left on the stack at the end is unresolved.',
    tips:
      'A monotonic stack (always increasing or always decreasing) turns an O(n^2) pairwise comparison into O(n), since each element is pushed and popped at most once.',
    snippets: [
      {
        name: 'Monotonic Stack',
        code: `stack: list[int] = []
result = [0] * len(nums)
for i, num in enumerate(nums):
    while stack and nums[stack[-1]] < num:
        j = stack.pop()
        result[j] = num
    stack.append(i)
return result`,
      },
    ],
  },
  {
    category: 'Binary Search',
    recognize:
      'Halving the search space works whenever "is the answer to the left or right of here" can be answered in O(1) - even if the array is not literally sorted, as long as the underlying condition is monotonic. Look for sorted lookups, rotated arrays, or "minimum X such that condition holds."',
    template:
      'Maintain low/high bounds. Compute mid, evaluate a condition there, and narrow to the half that must contain the answer. Repeat until the bounds meet.',
    tips:
      'For "binary search on the answer" problems (minimum speed, minimum capacity), search over the space of possible answers using a feasibility check as the condition, rather than searching array indices.',
    snippets: [
      {
        name: 'Binary Search',
        code: `low, high = 0, len(nums) - 1
while low <= high:
    mid = (low + high) // 2
    if nums[mid] == target:
        return mid
    elif nums[mid] < target:
        low = mid + 1
    else:
        high = mid - 1
return -1`,
      },
    ],
  },
  {
    category: 'Linked List',
    recognize:
      'List problems are almost always about carefully re-pointing next references while tracking a small, constant number of pointers, since you cannot index into a list. Look for reverse, reorder, cycle detection, merging, or "remove the nth from the end."',
    template:
      'Use a dummy head node so the real head never needs special-casing. Walk with one or two pointers, saving curr.next before overwriting it whenever you reverse a link. Use fast/slow pointers (fast moves two steps for every one of slow) to find the middle or detect a cycle with no extra memory.',
    tips:
      'Draw the list on paper before coding a reorder or reverse - it is easy to lose a reference and accidentally create a cycle.',
    snippets: [
      {
        name: 'Reverse a Linked List',
        code: `prev, curr = None, head
while curr:
    next_node = curr.next
    curr.next = prev
    prev = curr
    curr = next_node
return prev`,
      },
      {
        name: "Cycle Detection (Floyd's)",
        code: `slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow is fast:
        return True
return False`,
      },
    ],
  },
  {
    category: 'Trees',
    recognize:
      'Nearly every tree problem is a recursive question about a node\'s left and right subtrees: compute something bottom-up, or pass a constraint top-down, and combine results at each node. Look for depth, balance, path sums, BST validation, or serialization.',
    template:
      'Write a helper that takes a node and returns whatever is needed from its subtree, with a base case for None. Call it on left and right, then combine the two results at the current node - using a nonlocal variable when the real answer is not simply what gets returned, like diameter or max path sum.',
    tips:
      'For a BST, exploit the ordering to prune - compare against bounds, or go directly left or right - instead of visiting every node. An in-order traversal of a BST visits values in sorted order.',
    snippets: [
      {
        name: 'Tree DFS',
        code: `def dfs(node: TreeNode | None) -> int:
    if not node:
        return 0
    left = dfs(node.left)
    right = dfs(node.right)
    return 1 + max(left, right)`,
      },
    ],
  },
  {
    category: 'Tries',
    recognize:
      'When many strings share prefixes, a trie (a tree where each edge is one character) checks prefix or word membership in O(word length) instead of scanning every string. Look for autocomplete-style prefix queries or word search over a fixed dictionary.',
    template:
      'Each node holds a dict of children keyed by character, plus an end-of-word flag. Insert walks (creating children as needed) then marks the final node. Search/startsWith walk the same path, failing the moment a character is missing.',
    tips:
      'For wildcard search where "." matches any character, branch into every child at that position with a small recursive DFS instead of following a single path.',
    snippets: [
      {
        name: 'Trie Insert',
        code: `class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.is_word = False

def insert(root: TrieNode, word: str) -> None:
    node = root
    for char in word:
        node = node.children.setdefault(char, TrieNode())
    node.is_word = True`,
      },
    ],
  },
  {
    category: 'Heap / Priority Queue',
    recognize:
      'Whenever you repeatedly need "the current smallest or largest of a changing set," a heap gives O(log n) insert and extract instead of re-sorting from scratch. Look for "top/kth largest," "closest K points," merging sorted sources, or scheduling by priority.',
    template:
      'Push candidates onto a heap (Python\'s heapq is min-heap only, so negate values to simulate a max-heap). To keep only the k best, cap the heap at size k and pop whenever it grows past that. Pop the top whenever you need the current best, optionally pushing a replacement.',
    tips:
      'A tuple element like (priority, tie_breaker, payload) avoids comparing non-orderable payloads directly. Two heaps - a max-heap for the smaller half, a min-heap for the larger half - track a running median.',
    snippets: [
      {
        name: 'Top-K Heap',
        code: `import heapq

heap: list[int] = []
for num in nums:
    heapq.heappush(heap, num)
    if len(heap) > k:
        heapq.heappop(heap)
return heap[0]`,
      },
    ],
  },
  {
    category: 'Backtracking',
    recognize:
      'To enumerate every valid combination or arrangement, build a partial answer incrementally, recurse into each choice, and undo that choice before trying the next - exploring a decision tree and pruning dead branches. Look for "all subsets/permutations/combinations," N-Queens, or board search.',
    template:
      'Write a recursive function over the current partial state. If it is a complete valid answer, record a copy. Otherwise loop over each next choice, apply it, recurse, then undo it before trying the next choice.',
    tips:
      'Sort the input first when you need to skip duplicates at the same recursion depth. Prune early (break, not continue) once the remaining choices cannot possibly work, e.g. the remaining sum is already too small.',
    snippets: [
      {
        name: 'Backtracking',
        code: `result: list[list[int]] = []

def backtrack(start: int, path: list[int]) -> None:
    if is_complete(path):
        result.append(path[:])
        return
    for i in range(start, len(choices)):
        path.append(choices[i])
        backtrack(i + 1, path)
        path.pop()

backtrack(0, [])
return result`,
      },
    ],
  },
  {
    category: 'Graphs',
    recognize:
      'Model the problem as nodes and edges - a grid\'s cells are nodes connected to their four neighbors, or build an explicit adjacency list - then explore with DFS or BFS: DFS for connectivity and flood-fill, BFS for shortest paths in unweighted graphs. Look for island counting, flood fill, or course prerequisites.',
    template:
      'Maintain a visited set. DFS recursively visits a node then recurses into unvisited neighbors. BFS uses a queue, fully processing one layer of neighbors before the next, which naturally finds shortest paths since it explores in increasing distance order.',
    tips:
      'Topological sort (Kahn\'s algorithm: repeatedly remove in-degree-0 nodes) both detects cycles and orders prerequisite-style dependencies in one pass. Union-find answers "are these already connected" and component-count questions faster than repeated DFS.',
    snippets: [
      {
        name: 'Graph BFS',
        code: `from collections import deque

def bfs(start: int, graph: dict[int, list[int]]) -> None:
    visited = {start}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)`,
      },
      {
        name: 'Graph DFS',
        code: `def dfs(node: int, graph: dict[int, list[int]], visited: set[int]) -> None:
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(neighbor, graph, visited)`,
      },
    ],
  },
  {
    category: 'Advanced Graphs',
    recognize:
      'Once edges have weights, plain BFS no longer finds the shortest path. Reach for Dijkstra\'s (always expand the currently-cheapest unvisited node) for non-negative weights, or Bellman-Ford when you need to cap the number of edges used. Look for cheapest path, minimum spanning tree, or network delay problems.',
    template:
      'For Dijkstra\'s: push (0, source) onto a min-heap, pop the cheapest unfinalized node, finalize its distance, and relax its outgoing edges by pushing improved distances. For a minimum spanning tree (Prim\'s): grow a connected set by always adding the cheapest edge leaving it.',
    tips:
      'Bellman-Ford relaxes from a snapshot of the previous round\'s distances, not in place, whenever the problem caps the number of edges or stops allowed - updating in place could chain multiple edges together within a single round.',
    snippets: [
      {
        name: "Dijkstra's Algorithm",
        code: `import heapq

def dijkstra(source: int, graph: dict[int, list[tuple[int, int]]]) -> dict[int, int]:
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist.get(node, float('inf')):
            continue
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_dist
                heapq.heappush(heap, (new_dist, neighbor))
    return dist`,
      },
    ],
  },
  {
    category: '1-D Dynamic Programming',
    recognize:
      'When the answer for size n builds from the answers to smaller sizes (like n-1 and n-2), define that recurrence and either memoize a recursive solution or fill a 1D array bottom-up. Look for climbing stairs, house robber, coin change, or longest increasing subsequence.',
    template:
      'Define dp[i] as "the answer considering just the first i elements." Write the recurrence relating dp[i] to earlier dp values. Fill in increasing order of i, seeding the base case(s). The final answer is dp[n], or a max/min over the array.',
    tips:
      'If dp[i] only ever depends on the last one or two entries, replace the whole array with a couple of rolling variables to cut space to O(1).',
    snippets: [
      {
        name: '1-D DP Recurrence',
        code: `dp = [0] * (n + 1)
dp[0], dp[1] = base_case_0, base_case_1
for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]
return dp[n]`,
      },
    ],
  },
  {
    category: '2-D Dynamic Programming',
    recognize:
      'When the state needs two indices to describe - two strings\' prefixes, or a grid position - the DP table is 2D: dp[i][j] is the answer for the first i of one input and first j of another, built from neighboring cells. Look for edit distance, longest common subsequence, grid paths, or string interleaving.',
    template:
      'Build a table sized (n+1) x (m+1) with a base row/column for the "empty prefix" case. Fill row by row (or by increasing interval width for interval DP), computing dp[i][j] from dp[i-1][j], dp[i][j-1], and/or dp[i-1][j-1] depending on whether the current characters or cells match. Read the answer from the final corner.',
    tips:
      'Interval DP (like Burst Balloons) fills by increasing interval width and tries every split point inside each interval, since smaller sub-intervals must be solved before the larger ones that contain them.',
    snippets: [
      {
        name: '2-D DP Table',
        code: `n, m = len(a), len(b)
dp = [[0] * (m + 1) for _ in range(n + 1)]
for i in range(1, n + 1):
    for j in range(1, m + 1):
        if a[i - 1] == b[j - 1]:
            dp[i][j] = dp[i - 1][j - 1] + 1
        else:
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
return dp[n][m]`,
      },
    ],
  },
  {
    category: 'Greedy',
    recognize:
      'At each step, make the locally-best choice and never reconsider it - no backtracking required, which is what makes greedy solutions O(n) or O(n log n) instead of exponential. Look for "maximum/minimum in a single pass," interval scheduling, or resource-station circuits.',
    template:
      'Often sort first by some key (end time, ratio, position) so the greedy choice becomes "take the next one that fits." Walk once, maintaining just enough running state - a running sum, the last kept boundary - to decide each step, and commit to that decision permanently.',
    tips:
      'If a single counterexample breaks your greedy rule, that usually means it is the wrong rule, not a sign to add backtracking - look for a different sort key or invariant instead.',
    snippets: [
      {
        // Maximizing a count: seed the running boundary at -inf so the very
        // first interval always clears it.
        name: 'Interval Greedy (Max Kept)',
        code: `intervals.sort(key=lambda interval: interval[1])
result = 0
last_end = float('-inf')
for start, end in intervals:
    if start >= last_end:
        result += 1
        last_end = end
return result`,
      },
      {
        // Minimizing a count: seed the tracked boundary at +inf instead, so
        // "no room free yet" never satisfies <= start on the first interval.
        name: 'Interval Greedy (Min Rooms)',
        code: `intervals.sort(key=lambda interval: interval[0])
room_ends: list[int] = []
for start, end in intervals:
    earliest_free = min(room_ends, default=float('inf'))
    if earliest_free <= start:
        room_ends.remove(earliest_free)
    room_ends.append(end)
return len(room_ends)`,
      },
    ],
  },
  {
    category: 'Intervals',
    recognize:
      'Sorting intervals - usually by start, sometimes by end - turns overlap, merge, and scheduling questions into a single linear scan, since sorted intervals that overlap become adjacent. Look for merging meetings, inserting a new interval, or minimum rooms needed.',
    template:
      'Sort by start (or by end, for "remove the fewest to make non-overlapping"). Walk through, comparing each interval to the last one kept or merged; if they overlap, merge or count it, otherwise start a new group.',
    tips:
      '"Minimum meeting rooms" is really "max simultaneous overlaps" - find it by scanning sorted start and end times separately with two pointers, or with a min-heap of active end times.',
    snippets: [
      {
        name: 'Merge Intervals',
        code: `intervals.sort(key=lambda interval: interval[0])
merged: list[list[int]] = []
for start, end in intervals:
    if merged and start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
return merged`,
      },
    ],
  },
  {
    category: 'Math & Geometry',
    recognize:
      'These problems usually have one clean mathematical trick - a formula, an in-place index transformation, a digit-by-digit simulation - rather than a general algorithmic pattern. The skill is spotting which trick applies. Look for matrix rotation/traversal, digit manipulation, or numeric cycle detection.',
    template:
      'For matrix problems, work out the index mapping on paper first (rotating 90 degrees is a transpose plus a row reverse). For digit problems, peel one digit at a time with %10 and //10 (or divmod) and build the answer incrementally. For numeric cycle detection, reuse the fast/slow pointer trick from linked lists.',
    tips:
      'Simulate a small example by hand before coding a matrix-index trick - off-by-one errors are the most common bug here.',
    snippets: [
      {
        name: 'Matrix Rotation',
        code: `n = len(matrix)
# Transpose, then reverse each row - rotates 90 degrees clockwise in place.
for i in range(n):
    for j in range(i + 1, n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
for row in matrix:
    row.reverse()`,
      },
    ],
  },
  {
    category: 'Bit Manipulation',
    recognize:
      'Operations like XOR, AND-with-shift, and n & (n-1) solve problems on a number\'s binary representation in O(1) or O(log n), often replacing what looks like it needs extra memory with pure arithmetic. Look for "find the single/missing number," counting set bits, or addition without +.',
    template:
      'XOR cancels identical values (a ^ a = 0), useful whenever "everything appears twice except one." n & (n - 1) clears the lowest set bit, useful for counting or iterating over set bits. Addition without + is simulated with XOR (sum without carry) and AND-then-shift (the carry), repeated until there is no carry left.',
    tips:
      'Python integers are arbitrary-precision, so problems that assume a fixed 32-bit width need explicit masking (& 0xFFFFFFFF) to match expected overflow behavior.',
    snippets: [
      {
        name: 'XOR Trick',
        code: `result = 0
for num in nums:
    result ^= num
return result`,
      },
    ],
  },
]

// The full topic vocabulary, in Learn-tab order - reused wherever something
// needs to pick from or validate against "one of the 18 topics" (e.g. the
// MCQ generator's pattern-recognition distractor pool) instead of hardcoding
// a second copy of this list.
export const TOPICS: Topic[] = LESSONS.map((lesson) => lesson.category)
