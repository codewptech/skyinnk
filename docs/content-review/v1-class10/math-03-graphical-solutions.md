## Learning outcomes

> **EDITORIAL DRAFT — NOT EDUCATOR APPROVED OR PUBLISHED.** Companion to M-01, proposed Class 10 mathematics. A qualified educator must confirm curriculum, notation, level, and every answer before use. All examples are original and fictional.

By the end, you should be able to construct a table of coordinates, plot two straight lines, interpret their intersection, and use coefficients to distinguish one solution, no solution, and infinitely many solutions.

## 1. A line represents many ordered pairs

Consider $x+y=6$. Rearrange it to $y=6-x$.

| $x$ | $y$ | Coordinate |
| --- | --- | --- |
| 0 | 6 | $(0,6)$ |
| 2 | 4 | $(2,4)$ |
| 6 | 0 | $(6,0)$ |

Each row satisfies the equation. On squared paper, draw horizontal $x$ and vertical $y$ axes using the same scale, mark the origin and label both axes. Plot the three points, draw the straight line through them, and label it $x+y=6$. Two distinct points determine a straight line; the third is a useful check.

Now plot $x-y=2$, or $y=x-2$, using the same axes.

| $x$ | $y$ | Coordinate |
| --- | --- | --- |
| 0 | -2 | $(0,-2)$ |
| 2 | 0 | $(2,0)$ |
| 4 | 2 | $(4,2)$ |

The lines meet at $(4,2)$. That coordinate is the graphical solution because it lies on both lines. Check: $4+2=6$ and $4-2=2$.

A graph may give an approximate coordinate when the intersection is between grid marks. Verify by substitution or solve algebraically for an exact result. You do not need to see the drawing to follow this example: the tables specify each point, and both equations give $y=2$ when $x=4$.

## 2. Three possible relationships

- Intersecting lines: exactly one common point, so exactly one solution.
- Distinct parallel lines: no common point, so no solution.
- Coincident lines: every point on either line is on the other, so infinitely many solutions.

Try plotting $x+y=4$ and $x+y=7$. Both have slope $-1$, but their vertical intercepts are 4 and 7. They are distinct parallel lines.

Compare $x+y=4$ and $2x+2y=8$. Dividing the second equation by 2 gives the first. They describe the same line.

## 3. A coefficient test that works even with zero coefficients

Write both equations as $a_1x+b_1y+c_1=0$ and $a_2x+b_2y+c_2=0$. Assume that neither equation has both its variable coefficients equal to zero. This ensures each equation describes a line.

Calculate

$$D=a_1b_2-a_2b_1.$$

If $D\ne0$, there is exactly one solution. The lines intersect.

If $D=0$, compare two more products:

$$P=a_1c_2-a_2c_1,\qquad Q=b_1c_2-b_2c_1.$$

- If both $P=0$ and $Q=0$, the equations represent the same line: infinitely many solutions.
- If at least one of $P,Q$ is nonzero, the lines are distinct parallel lines: no solution.

Why this works: $D=0$ means the two nonzero coefficient pairs $(a_1,b_1)$ and $(a_2,b_2)$ are proportional. The other two comparisons check whether the constant terms follow that same proportion.

When the denominators are nonzero, the familiar ratio version is:

- $a_1/a_2\ne b_1/b_2$: one solution.
- $a_1/a_2=b_1/b_2\ne c_1/c_2$: no solution.
- $a_1/a_2=b_1/b_2=c_1/c_2$: infinitely many solutions.

Do not divide by a zero coefficient. Use the product test instead.

### Worked example: vertical lines

For $x=3$ and $x=5$, the standard forms are $x-3=0$ and $x-5=0$. Their coefficient triples are $(1,0,-3)$ and $(1,0,-5)$.

$D=1(0)-1(0)=0$, $P=1(-5)-1(-3)=-2$, and $Q=0$.

There is no solution. Both lines are vertical, one through $x=3$ and the other through $x=5$. A slope calculation would require division by zero, so the product test is useful here.

### Worked example: a coincident pair

For $2x-y=1$ and $4x-2y=2$, the triples are $(2,-1,-1)$ and $(4,-2,-2)$. All three product differences are zero. The second equation is twice the first, so the lines coincide.

### Worked example: a unique solution

For $2x+y=7$ and $x-y=2$, the triples are $(2,1,-7)$ and $(1,-1,-2)$. Here $D=2(-1)-1(1)=-3$, which is nonzero.

Adding the original equations gives $3x=9$, so $x=3$ and $y=1$. Check both equations: $2(3)+1=7$, and $3-1=2$.

## 4. Independent practice

1. Plot $x+y=8$ and $x-y=2$. Make a three-row table for each equation. Read the intersection and verify it algebraically.
2. Classify $3x+2y=12$ and $6x+4y=24$ using the product test.
3. Classify $3x+2y=12$ and $6x+4y=20$. Explain why the lines cannot meet.
4. Classify $y=4$ and $x=2$, and find their common point.
5. Two lines are $2x+3y=12$ and $x+2y=7$. Calculate $D$, solve and check.
6. Explain why a sketch alone is not reliable when two lines appear almost parallel.

## Answers and explanations

1. For the first line use $(0,8),(4,4),(8,0)$; for the second use $(0,-2),(2,0),(5,3)$. Intersection: $(5,3)$, since $5+3=8$ and $5-3=2$.
2. Infinitely many: $D=0$, $P=3(-24)-6(-12)=0$, $Q=2(-24)-4(-12)=0$.
3. None: $D=0$, $P=3(-20)-6(-12)=12$, $Q=2(-20)-4(-12)=8$. Their coefficient pairs are proportional, but constants are not.
4. One solution, $(2,4)$. The horizontal line $y=4$ meets the vertical line $x=2$. With the equations in that order, $D=0(0)-1(1)=-1$.
5. $D=2(2)-1(3)=1$. From $x=7-2y$, $2(7-2y)+3y=12$, giving $y=2$ and $x=3$. Check $6+6=12$ and $3+4=7$.
6. A drawing can hide small differences in slope or place the intersection outside the visible grid. Use exact coefficients and substitute the solution into both equations.

## Before moving on

Describe the three line relationships in words, then explain how the product test handles a vertical line. Use your graph to support the algebra, not replace it.
