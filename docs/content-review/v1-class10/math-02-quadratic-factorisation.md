## Learning outcomes

By the end of this lesson, you should be able to:

- Recognise a quadratic equation and write it in standard form.
- Use the zero-product rule to find roots from factors.
- Factorise simple monic and non-monic quadratic expressions.
- Substitute each root back into the original equation.
- Decide whether a mathematical root makes sense in an everyday situation.

## 1. What makes an equation quadratic?

A quadratic equation in one variable can be written as

$$ax^2+bx+c=0,$$

where $a$, $b$ and $c$ are numbers and $a\ne 0$. The highest power of $x$ is $2$.

Examples:

- $x^2-5x+6=0$ is quadratic.
- $2x^2+7x+3=0$ is quadratic.
- $3x-8=0$ is **linear**, not quadratic, because it has no $x^2$ term.
- $x^2=9$ is quadratic once written as $x^2-9=0$.

A *root* of an equation is a value of $x$ that makes the equation true. Some quadratic equations have two distinct real roots; others have one repeated real root or no real roots.

## 2. The zero-product rule

If two real numbers multiply to give zero, at least one of them must be zero.

$$AB=0 \quad\Longrightarrow\quad A=0\ \text{or}\ B=0.$$

This rule lets us solve a factored quadratic.

For example:

$$(x-2)(x-3)=0.$$

Either $x-2=0$ or $x-3=0$. Thus the roots are $x=2$ and $x=3$.

**Important:** You can use this rule only after the equation has been written as a *product equal to zero*. Do not apply it to a product equal to 6 or to a sum of factors.

## 3. Factorise a quadratic with leading coefficient 1

Solve:

$$x^2-5x+6=0.$$

Find two numbers whose **product** is $+6$ and whose **sum** is $-5$. The numbers are $-2$ and $-3$.

Therefore:

$$x^2-5x+6=(x-2)(x-3).$$

Using the zero-product rule, $x-2=0$ or $x-3=0$.

**Roots:** $2$ and $3$.

**Check:**

- For $x=2$: $2^2-5(2)+6=4-10+6=0$.
- For $x=3$: $3^2-5(3)+6=9-15+6=0$.

Both values satisfy the original equation.

### Why the signs matter

For $x^2+5x+6$, the suitable numbers are $+2$ and $+3$, so

$$x^2+5x+6=(x+2)(x+3).$$

Its roots are $-2$ and $-3$, not $+2$ and $+3$. A plus sign inside the factor means the corresponding root has the opposite sign.

## 4. Factorise when the coefficient of $x^2$ is not 1

Solve:

$$2x^2+7x+3=0.$$

The product of the first and last coefficients is $2\times3=6$. Find two numbers with product 6 and sum 7: these are 6 and 1.

Split the middle term:

$$2x^2+6x+x+3=0.$$

Group terms:

$$2x(x+3)+1(x+3)=0.$$

Factor out the common bracket:

$$(2x+1)(x+3)=0.$$

Therefore $2x+1=0$ or $x+3=0$.

**Roots:** $x=-\frac12$ and $x=-3$.

**Check the first root:** $2(\frac14)+7(-\frac12)+3=\frac12-\frac72+3=0$.

**Check the second root:** $2(9)+7(-3)+3=18-21+3=0$.

Both work. Splitting the middle term is one convenient factorisation method; not every quadratic factorises into simple integer-coefficient brackets.

## 5. Special case: difference of squares

Recognise the identity:

$$a^2-b^2=(a-b)(a+b).$$

For example:

$$x^2-9=0\quad\Longrightarrow\quad (x-3)(x+3)=0.$$

Thus $x=3$ or $x=-3$. Check: both have square 9.

This method is useful when the expression has two square terms with a minus sign between them.

## 6. A word problem: use the meaningful root

A fictional rectangular vegetable patch has a length 3 metres greater than its width. Its area is $40\ \text{m}^2$. Find its dimensions.

Let the width be $w$ metres. Then the length is $w+3$ metres.

Area equals length times width:

$$w(w+3)=40.$$

Rearrange:

$$w^2+3w-40=0.$$

Factorise:

$$(w+8)(w-5)=0.$$

The algebraic roots are $w=-8$ and $w=5$. A physical width cannot be negative, so **reject $-8$ for this situation**.

**Meaningful answer:** width $5\ \text{m}$; length $8\ \text{m}$.

**Check:** $5\times8=40\ \text{m}^2$ and the length exceeds the width by $3\ \text{m}$.

The negative root remains a mathematically valid root of the equation; it simply does not represent a valid dimension in this problem.

## Practice: try before checking

1. Solve $x^2-7x+12=0$ by factorisation. Verify both roots.
2. Solve $x^2+5x+6=0$.
3. Solve $3x^2-12x=0$. Remember that zero may itself be a root.
4. Solve $2x^2-5x-3=0$.
5. Find the roots of $x^2-25=0$ without splitting the middle term.
6. A fictional rectangle has width $w$ centimetres and length $w+2$ centimetres. Its area is $24\ \text{cm}^2$. Write the quadratic equation and find its physical dimensions.

## Answers and explanations

1. $(x-3)(x-4)=0$, so $x=3$ or $x=4$. For $x=3$, $9-21+12=0$; for $x=4$, $16-28+12=0$.
2. $(x+2)(x+3)=0$, so $x=-2$ or $x=-3$.
3. $3x(x-4)=0$, so $x=0$ or $x=4$. Dividing both sides by $x$ too early would lose the valid root $x=0$.
4. $(2x+1)(x-3)=0$, so $x=-\frac12$ or $x=3$. Expand the factors to confirm $2x^2-5x-3$.
5. $(x-5)(x+5)=0$, so $x=5$ or $x=-5$.
6. $w(w+2)=24$, giving $w^2+2w-24=0=(w+6)(w-4)$. Roots are $-6$ and $4$. The width must be positive, so width $4\ \text{cm}$ and length $6\ \text{cm}$.

## Before moving on

Use the following checklist on any factorisation problem:

1. Is the equation in the form *something = 0*?
2. When I multiply my factors back out, do I get the original quadratic?
3. Did I use the zero-product rule to solve **every** factor?
4. Do all proposed roots satisfy the original equation?
5. If the roots describe a real-world quantity, which ones are meaningful there?

For extra practice, create your own quadratic equation with roots 1 and 5 by starting from $(x-1)(x-5)=0$. Expand it, give it to a classmate, and ask them to recover the roots.
