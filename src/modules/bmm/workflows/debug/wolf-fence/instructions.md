# Wolf Fence Binary Search Debugging Instructions

## Overview

Execute binary search debugging methodology to efficiently isolate bug location through systematic code region elimination.

## Wolf Fence Principle

"There's one wolf in Alaska; how do you find it? First build a fence down the middle of the state, wait for the wolf to howl, then go to the side where you heard it."

## Methodology

1. **Define Search Space** - Identify code region containing the bug
2. **Bisection Strategy** - Divide region into two equal parts
3. **Test Point Selection** - Choose midpoint for testing
4. **Behavior Verification** - Determine which half contains the bug
5. **Recursive Narrowing** - Repeat process on identified half
6. **Isolation Completion** - Continue until bug location is isolated

## Process Steps

1. **Establish Known Good/Bad Points** - Verify working and failing states
2. **Binary Division** - Split code/data/timeline into halves
3. **Midpoint Testing** - Insert test points or checkpoints
4. **Result Analysis** - Determine which side exhibits the bug
5. **Range Refinement** - Focus search on problematic half
6. **Iteration** - Repeat until precise location identified

## Application Scenarios

- Code regression debugging
- Data corruption location
- Timeline-based issue isolation
- Configuration problem hunting
- Memory corruption detection

## Expected Outputs

- Precise bug location identification
- Minimal reproduction case
- Verification test points
- Isolated code region for detailed analysis
