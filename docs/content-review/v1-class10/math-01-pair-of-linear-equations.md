## Learning outcomes

> **Editorial scope note — NOT EDUCATOR APPROVED:** This is an algebraic introduction. The CBSE Class X 2026–27 topic also includes plotting and graphical solutions plus coefficient-based conditions for the number of solutions; these are **not fully taught here**. A qualified educator must approve the target board and any later graphing lesson before claiming complete chapter coverage. See the internal curriculum-alignment review packet.

By the end of this lesson, you should be able to:

- Explain what a pair of linear equations in two variables represents.
- Check whether an ordered pair satisfies both equations.
- Solve a pair by substitution or elimination and verify the answer.
- Recognise when a pair has exactly one solution, no solution, or infinitely many solutions.
- Set up two equations from a short everyday problem.

## 1. One equation is not enough

Imagine two unknown numbers, $x$ and $y$, whose sum is 9:

$$x+y=9.$$

Many pairs satisfy this equation: $(0,9)$, $(4,5)$, $(9,0)$ and so on. To identify a particular pair, we need another independent condition. Suppose:

$$x-y=3.$$

Now we want a pair that makes **both** statements true. This is a _pair of linear equations in two variables_. A solution is an ordered pair $(x,y)$ that satisfies both equations at once.

For example, $(6,3)$ works because $6+3=9$ and $6-3=3$. The pair $(4,5)$ satisfies the first equation but not the second; it is **not** a solution of the pair.

### Quick check

Does $(2,4)$ satisfy both equations $x+y=6$ and $2x+y=8$?

Yes: $2+4=6$ and $2(2)+4=8$. Always substitute into **both** equations when checking a proposed solution.

## 2. Method A: elimination

Elimination combines equations so that one variable disappears.

Solve:

$$
\begin{aligned}
x+y&=9 &&\text{(1)}\\
x-y&=3 &&\text{(2)}
\end{aligned}
$$

Add equations (1) and (2):

$$
(x+y)+(x-y)=9+3.
$$

The $+y$ and $-y$ cancel, leaving $2x=12$. Therefore $x=6$.

Substitute into equation (1):

$$6+y=9 \quad\Longrightarrow\quad y=3.$$

**Answer:** $(x,y)=(6,3)$.

**Check:** $6+3=9$ and $6-3=3$. Both equations hold.

You can also subtract equations or multiply an equation by the same nonzero number on both sides before eliminating. The aim is to make one variable's coefficients equal or opposite.

## 3. Method B: substitution

Substitution works by expressing one variable in terms of the other.

Solve:

$$
\begin{aligned}
2x+y&=13 &&\text{(1)}\\
x-y&=2 &&\text{(2)}
\end{aligned}
$$

Rearrange equation (2): $y=x-2$.

Put this expression into equation (1):

$$
2x+(x-2)=13.
$$

Simplify: $3x-2=13$, so $3x=15$ and $x=5$. Then $y=5-2=3$.

**Answer:** $(5,3)$.

**Check:** $2(5)+3=13$ and $5-3=2$.

Substitution is especially convenient when a variable already has coefficient $1$ or $-1$. Elimination may be quicker when the coefficients are easy to match. Both methods must lead to the same valid solution.

## 4. Turn words into equations

A fictional stationery shop sells notebooks and pens. Suppose two notebooks and one pen cost ₹65, while one notebook and two pens cost ₹55.

Let $n$ be the price of one notebook and $p$ the price of one pen, in rupees. Translate each statement:

$$
\begin{aligned}
2n+p&=65\\
n+2p&=55
\end{aligned}
$$

Double the second equation: $2n+4p=110$. Subtract the first equation:

$$
(2n+4p)-(2n+p)=110-65,
$$

so $3p=45$ and $p=15$. From $2n+p=65$, we get $2n=50$, hence $n=25$.

**Interpretation:** one notebook costs ₹25 and one pen costs ₹15 in this fictional example.

**Check in the story:** $2(25)+15=65$ and $25+2(15)=55$.

### A reliable word-problem checklist

1. State exactly what each variable means, including units.
2. Translate the two given conditions into equations.
3. Solve by a valid algebraic method.
4. Substitute the answer into **both** original equations.
5. Check that the result makes sense in the story; for example, a price should not be negative here.

## 5. Can a pair have more than one answer?

Compare these three situations:

- **One solution:** $x+y=5$ and $x-y=1$ meet at one pair, $(3,2)$.
- **Infinitely many solutions:** $x+y=5$ and $2x+2y=10$ describe exactly the same relationship. Every pair that works in one also works in the other.
- **No solution:** $x+y=5$ and $x+y=8$ cannot both be true for the same $(x,y)$.

On a graph, the corresponding straight lines intersect once, coincide, or are distinct parallel lines. A graph helps you see the three situations; algebra gives exact values.

## Practice: work without looking at the answers

1. Solve $x+y=14$ and $x-y=4$.
2. Solve $3a+b=17$ and $a+b=7$.
3. Solve $2p+3q=18$ and $p+q=7$.
4. Classify these two pairs as one solution, no solution, or infinitely many solutions:
   - (a) $u+v=5$ and $2u+2v=10$.
   - (b) $u+v=5$ and $u+v=8$.
5. At a fictional event, two adult tickets and three student tickets cost ₹260. One adult ticket and two student tickets cost ₹150. Form two equations and find the price of each ticket.
6. A classmate says $(4,2)$ solves $2x+y=10$ and $x+2y=8$. Is the classmate correct? Show both substitutions.

## Answers and explanations

1. Add the equations: $2x=18$, so $x=9$. Then $y=5$. **Answer: $(9,5)$.**
2. Subtract $a+b=7$ from $3a+b=17$: $2a=10$, so $a=5$ and $b=2$.
3. Since $p+q=7$, $p=7-q$. Then $2(7-q)+3q=18$, so $q=4$ and $p=3$. Check: $2(3)+3(4)=18$.
4. (a) **Infinitely many**, because the second equation is exactly twice the first. (b) **No solution**, because one sum cannot equal both 5 and 8.
5. Let adult price be $a$ and student price be $s$. Then $2a+3s=260$ and $a+2s=150$. Double the second: $2a+4s=300$. Subtract the first to get $s=40$; then $a=70$. Check both original totals.
6. **Yes.** First equation: $2(4)+2=10$. Second equation: $4+2(2)=8$. Both hold.

## Before moving on

Explain in your own words why checking just one equation does **not** prove that a pair solves a system. Then choose one practice problem and solve it using the _other_ method (substitution instead of elimination, or vice versa). If both methods agree and both original equations check out, you have a stronger reason to trust the result.
