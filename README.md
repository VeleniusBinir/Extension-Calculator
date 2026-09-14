SillyTavern Calculator

A small third-party SillyTavern extension that registers a Calculator function tool for Chat Completion models.

It provides exact arithmetic, mathematical functions, and calendar date calculations without evaluating arbitrary JavaScript.

Features
Exact arithmetic and mathematical operations
Parentheses and operator precedence
Mathematical functions including sqrt, abs, round, floor, ceil, sin, cos, tan, min, and max
Calendar date calculations using YYYY-MM-DD
Calculate the number of days between two dates
Add or subtract days from a date
Nest date functions inside other calculations
Restricted tokenizer/parser; arbitrary JavaScript is not executed
Installation
Install from Git

In SillyTavern, open:
Extensions → Install Extension → Install from Git

Enter:
https://github.com/VeleniusBinir/Extension-Calculator

Manual installation
Place the extension folder in:
C:\AI\SillyTavern\public\scripts\extensions\third-party\Extension-Calculator
Then reload SillyTavern.

Tool
The extension registers:
Calculator(expression)
The model is instructed to use the calculator whenever an exact numerical or date result is needed instead of estimating.

Supported operators
/ % ^ ( )
Supported functions

sqrt(x)
abs(x)
round(x)
floor(x)
ceil(x)
sin(x)
cos(x)
tan(x)
min(x, ...)
max(x, ...)
daysBetween(date1, date2)
addDays(date, amount)

Examples

(23 + 13) / 2
→ 18

sqrt(144)
→ 12

2^10
→ 1024

daysBetween("2026-08-08", "2026-09-13")
→ 36

addDays("2026-09-13", 45)
→ 2026-10-28

Date functions can also be nested:

addDays(addDays("2026-02-01", 30), daysBetween("2026-03-01", "2026-04-01"))

Date handling

Dates must use the YYYY-MM-DD format.

Invalid calendar dates are rejected rather than silently normalized. Day calculations use UTC date arithmetic to avoid daylight-saving and local-time effects.

Security

The calculator does not evaluate arbitrary JavaScript expressions.

It uses a restricted tokenizer and parser with an explicit set of supported operators and functions. Unsupported identifiers, syntax, characters, and invalid values are rejected.

Author

VeleniusBinir

License

See LICENSE.
