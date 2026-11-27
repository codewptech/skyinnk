## Learning outcomes

> **EDITORIAL DRAFT — NOT EDUCATOR APPROVED OR PUBLISHED.** Companion to M-02, proposed Class 10 mathematics. A qualified educator must confirm curriculum, notation, level and every answer. All examples are original and fictional.

By the end, you should be able to solve a quadratic using the quadratic formula, classify its real roots using the discriminant, and select a meaningful solution in a contextual problem.

## 1. Beyond factorisation

Some quadratics do not split into simple integer-coefficient factors. The quadratic formula gives a general method for solving real-coefficient quadratic equations.

Write the equation in standard form:

$$ax^2+bx+c=0,\qquad a\ne0.$$

The coefficient of $x^2$ is $a$, the coefficient of $x$ is $b$, and the constant is $c$. Include each sign. If a term is missing, its coefficient is zero.

For example, $3x^2=7x+2$ becomes $3x^2-7x-2=0$, so $a=3$, $b=-7$, $c=-2$.

## 2. Where the formula comes from

Divide by $a$ and move the constant to the right:

$$x^2+\frac{b}{a}x=-\frac{c}{a}.$$

Add $\left(\frac{b}{2a}\right)^2$ to both sides to complete the square:

$$\left(x+\frac{b}{2a}\right)^2=\frac{b^2-4ac}{4a^2}.$$

Equivalently,

$$(2ax+b)^2=b^2-4ac.$$

When $b^2-4ac\ge0$, take both possible real square roots and rearrange:

$$x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}.$$

The symbol $\pm$ means evaluate once with plus and once with minus. If the square root is zero, the two expressions give the same value.

## 3. The discriminant

Define $D=b^2-4ac$.

| Condition | Number of distinct real roots | Interpretation            |
| --------- | ----------------------------- | ------------------------- |
| $D>0$     | 2                             | Two different real values |
| $D=0$     | 1                             | One repeated real root    |
| $D<0$     | 0                             | No real roots             |

A negative discriminant means no **real** roots; it does not mean that the equation is invalid. Complex numbers are outside this introductory lesson.

### Example A: two distinct rational roots

Solve $2x^2-5x+2=0$.

$a=2$, $b=-5$, $c=2$.

$$D=(-5)^2-4(2)(2)=25-16=9.$$

$$x=\frac{5\pm3}{4}.$$

The roots are $2$ and $\frac12$. Checks: $2(4)-5(2)+2=0$, and $2(\frac14)-5(\frac12)+2=0$.

### Example B: irrational real roots

Solve $x^2-4x+1=0$.

$D=16-4=12>0$.

$$x=\frac{4\pm\sqrt{12}}2=2\pm\sqrt3.$$

Keep the exact roots unless an approximate answer is requested. To verify both, write the equation as $(x-2)^2-3=0$. For either root, $(x-2)^2=3$.

### Example C: one repeated root

Solve $4x^2+12x+9=0$. Here $D=144-144=0$.

$$x=\frac{-12}{8}=-\frac32.$$

Check: the expression is $(2x+3)^2$, which equals zero at $x=-\frac32$.

### Example D: no real roots

Consider $x^2+2x+5=0$. Here $D=4-20=-16<0$.

The expression equals $(x+1)^2+4$, which is at least 4 for every real $x$. Therefore the equation cannot equal zero in the real numbers.

## 4. A meaningful root in a word problem

A fictional garden has width $w$ metres and length $w+2$ metres. The area is $17\text{ m}^2$.

$$w(w+2)=17,\quad w^2+2w-17=0.$$

$D=4+68=72$. Therefore

$$w=\frac{-2\pm\sqrt{72}}{2}=-1\pm3\sqrt2.$$

The negative root is not a possible width. The positive root gives width $3\sqrt2-1$ metres and length $3\sqrt2+1$ metres.

Check the area exactly:

$$(3\sqrt2-1)(3\sqrt2+1)=18-1=17.$$

Both algebraic roots remain mathematically valid; only the positive root makes sense for the physical width.

## 5. Avoid common mistakes

- Rearrange to standard form before identifying coefficients.
- Use parentheses in $(-5)^2$, so a negative coefficient is squared correctly.
- Calculate $4ac$ with the sign of $c$.
- Divide the entire numerator by $2a$, not only the square-root term.
- Do not discard a root merely because it is negative unless the context imposes that restriction.
- Check roots by substitution, an equivalent completed square, or an exact factorisation.

## Independent practice

1. Solve $x^2-7x+10=0$ using the formula. Verify both roots.
2. Solve $3x^2+2x-1=0$.
3. Solve $x^2-6x+9=0$ and state its discriminant.
4. Without solving, classify the real roots of $2x^2+3x+4=0$.
5. Solve $2x^2-8=0$. Identify the missing coefficient.
6. Solve $x^2-2x-2=0$ exactly and verify using a completed square.
7. A fictional rectangle has length 1 metre greater than its width and area $11\text{ m}^2$. Find exact dimensions and identify the rejected algebraic root.

## Answers and explanations

1. $D=49-40=9$, $x=(7\pm3)/2$, giving $5$ and $2$. Checks: $25-35+10=0$ and $4-14+10=0$.
2. $D=4+12=16$. $x=(-2\pm4)/6$, giving $\frac13$ and $-1$. Substitution gives $3(\frac19)+2(\frac13)-1=0$ and $3-2-1=0$.
3. $D=36-36=0$. Repeated root $x=3$.
4. $D=9-32=-23$, so no real roots.
5. $b=0$, $a=2$, $c=-8$. $D=64$; $x=\pm8/4=\pm2$. Both roots satisfy $2x^2=8$.
6. $D=4+8=12$. Roots are $1\pm\sqrt3$. The equation is $(x-1)^2-3=0$, verifying both.
7. $w^2+w-11=0$; $D=45$. Roots are $\frac{-1\pm3\sqrt5}{2}$. The positive width is $\frac{3\sqrt5-1}{2}$ metres, and length is $\frac{3\sqrt5+1}{2}$ metres. Their product is $(45-1)/4=11$. Reject $\frac{-1-3\sqrt5}{2}$ as a physical width.

## Before moving on

For each of the three discriminant cases, choose an example and explain why the number of distinct real roots follows from $(2ax+b)^2=D$. Compare your answer with the factorisation method when both methods are convenient.
