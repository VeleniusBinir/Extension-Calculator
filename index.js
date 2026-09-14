const TOOL_NAME = 'Calculator';

/*
 * Supported calculator functions.
 *
 * args:
 *   1  = exactly one argument
 *   2  = exactly two arguments
 *   -1 = one or more arguments
 *
 * type:
 *   'number' = numeric result/function
 *   'date'   = YYYY-MM-DD string result/function
 */
const FUNCTIONS = {
    sqrt: { args: 1, type: 'number', fn: Math.sqrt },
    abs: { args: 1, type: 'number', fn: Math.abs },
    round: { args: 1, type: 'number', fn: Math.round },
    floor: { args: 1, type: 'number', fn: Math.floor },
    ceil: { args: 1, type: 'number', fn: Math.ceil },
    sin: { args: 1, type: 'number', fn: Math.sin },
    cos: { args: 1, type: 'number', fn: Math.cos },
    tan: { args: 1, type: 'number', fn: Math.tan },

    min: { args: -1, type: 'number', fn: Math.min },
    max: { args: -1, type: 'number', fn: Math.max },

    daysBetween: {
        args: 2,
        type: 'number',
        fn: (d1, d2) => daysBetween(d1, d2),
    },

    addDays: {
        args: 2,
        type: 'date',
        fn: (date, amount) => addDays(date, amount),
    },
};

function parseDateOnly(value) {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        throw new Error('Invalid date format (use YYYY-MM-DD)');
    }

    const [year, month, day] = value.split('-').map(Number);

    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);

    // Prevent JavaScript from silently normalizing invalid dates.
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        throw new Error(`Invalid calendar date: ${value}`);
    }

    return date;
}

function daysBetween(d1, d2) {
    const dt1 = parseDateOnly(d1);
    const dt2 = parseDateOnly(d2);

    return Math.trunc(
        (dt2.getTime() - dt1.getTime()) / 86400000
    );
}

function addDays(dateString, amount) {
    const date = parseDateOnly(dateString);
    const n = Number(amount);

    if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new Error(
            'Number of days must be a finite integer.'
        );
    }

    date.setUTCDate(date.getUTCDate() + n);

    return date.toISOString().slice(0, 10);
}

/*
 * Tokenizer
 *
 * Supported:
 *   numbers:
 *     123
 *     12.34
 *     .5
 *     1.2e-3
 *
 *   strings:
 *     "2026-09-13"
 *     '2026-09-13'
 *
 *   operators:
 *     + - * / % ^
 *
 *   punctuation:
 *     ( ) ,
 *
 *   functions:
 *     sqrt abs round floor ceil sin cos tan
 *     min max
 *     daysBetween addDays
 */
function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
        const char = input[i];

        // Whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Quoted string
        if (char === '"' || char === "'") {
            const quote = char;
            let end = i + 1;

            while (end < input.length && input[end] !== quote) {
                end++;
            }

            if (end >= input.length) {
                throw new Error('Unterminated string.');
            }

            const value = input.slice(i + 1, end);

            tokens.push({
                type: 'string',
                value,
            });

            i = end + 1;
            continue;
        }

        // Number
        if (/[0-9.]/.test(char)) {
            const match = input.slice(i).match(
                /^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/
            );

            if (!match) {
                throw new Error(
                    `Invalid number near "${input.slice(i)}"`
                );
            }

            const value = Number(match[0]);

            if (!Number.isFinite(value)) {
                throw new Error(
                    `Invalid numeric value: ${match[0]}`
                );
            }

            tokens.push({
                type: 'number',
                value,
            });

            i += match[0].length;
            continue;
        }

        // Identifier / function name
        if (/[A-Za-z_]/.test(char)) {
            const match = input.slice(i).match(
                /^[A-Za-z_][A-Za-z0-9_]*/
            );

            if (!match) {
                throw new Error('Invalid identifier.');
            }

            const name = match[0];

            if (!FUNCTIONS[name]) {
                throw new Error(
                    `Unsupported function or identifier: ${name}`
                );
            }

            tokens.push({
                type: 'function',
                value: name,
            });

            i += name.length;
            continue;
        }

        // Operators and punctuation
        if ('+-*/%^(),'.includes(char)) {
            tokens.push({
                type:
                    char === '(' ||
                    char === ')' ||
                    char === ','
                        ? char
                        : 'operator',
                value: char,
            });

            i++;
            continue;
        }

        throw new Error(
            `Unsupported character: "${char}"`
        );
    }

    return tokens;
}

const PRECEDENCE = {
    '+': 2,
    '-': 2,
    '*': 3,
    '/': 3,
    '%': 3,
    '^': 4,
};

function applyOperator(op, a, b) {
    if (
        typeof a !== 'number' ||
        !Number.isFinite(a) ||
        typeof b !== 'number' ||
        !Number.isFinite(b)
    ) {
        throw new Error(
            `Operator "${op}" requires numeric operands.`
        );
    }

    switch (op) {
        case '+':
            return a + b;

        case '-':
            return a - b;

        case '*':
            return a * b;

        case '/':
            if (b === 0) {
                throw new Error('Division by zero.');
            }

            return a / b;

        case '%':
            if (b === 0) {
                throw new Error('Modulo by zero.');
            }

            return a % b;

        case '^':
            return a ** b;

        default:
            throw new Error(`Unknown operator: ${op}`);
    }
}

function parseMathExpression(expression) {
    const tokens = tokenize(expression);
    let index = 0;

    function parseExpression(minPrecedence = 0) {
        let left = parseUnary();

        while (index < tokens.length) {
            const token = tokens[index];

            // Stop at comma or closing parenthesis.
            if (
                token.type !== 'operator' ||
                token.value === ','
            ) {
                break;
            }

            const precedence = PRECEDENCE[token.value];

            if (precedence < minPrecedence) {
                break;
            }

            const op = token.value;
            index++;

            // ^ is right-associative.
            const nextMinPrecedence =
                op === '^'
                    ? precedence
                    : precedence + 1;

            const right = parseExpression(
                nextMinPrecedence
            );

            left = applyOperator(
                op,
                left,
                right
            );
        }

        return left;
    }

    function parseUnary() {
        if (
            index < tokens.length &&
            tokens[index].type === 'operator'
        ) {
            const op = tokens[index].value;

            if (op === '+' || op === '-') {
                index++;

                const value = parseUnary();

                if (
                    typeof value !== 'number' ||
                    !Number.isFinite(value)
                ) {
                    throw new Error(
                        `Unary "${op}" requires a numeric operand.`
                    );
                }

                return op === '-'
                    ? -value
                    : value;
            }
        }

        return parsePrimary();
    }

    function parsePrimary() {
        if (index >= tokens.length) {
            throw new Error(
                'Unexpected end of expression.'
            );
        }

        const token = tokens[index];

        // Number
        if (token.type === 'number') {
            index++;
            return token.value;
        }

        // String
        if (token.type === 'string') {
            index++;
            return token.value;
        }

        // Parenthesized expression
        if (token.type === '(') {
            index++;

            const value = parseExpression();

            if (
                index >= tokens.length ||
                tokens[index].type !== ')'
            ) {
                throw new Error(
                    'Missing closing parenthesis.'
                );
            }

            index++;

            return value;
        }

        // Function call
        if (token.type === 'function') {
            const name = token.value;
            const fn = FUNCTIONS[name];

            index++;

            if (
                index >= tokens.length ||
                tokens[index].type !== '('
            ) {
                throw new Error(
                    `Expected "(" after ${name}.`
                );
            }

            index++;

            const args = [];

            if (
                index < tokens.length &&
                tokens[index].type !== ')'
            ) {
                while (true) {
                    args.push(parseExpression());

                    if (
                        index < tokens.length &&
                        tokens[index].type === ','
                    ) {
                        index++;
                        continue;
                    }

                    break;
                }
            }

            if (
                index >= tokens.length ||
                tokens[index].type !== ')'
            ) {
                throw new Error(
                    `Missing ")" after ${name}.`
                );
            }

            index++;

            // Argument count
            if (
                fn.args !== -1 &&
                args.length !== fn.args
            ) {
                throw new Error(
                    `${name} expects ${fn.args} argument(s), got ${args.length}.`
                );
            }

            if (args.length === 0) {
                throw new Error(
                    `${name} requires at least one argument.`
                );
            }

            // Validate argument types.
            if (name === 'daysBetween') {
                if (
                    typeof args[0] !== 'string' ||
                    typeof args[1] !== 'string'
                ) {
                    throw new Error(
                        'daysBetween requires two YYYY-MM-DD date strings.'
                    );
                }
            } else if (name === 'addDays') {
                if (typeof args[0] !== 'string') {
                    throw new Error(
                        'addDays requires a YYYY-MM-DD date string as its first argument.'
                    );
                }

                if (
                    typeof args[1] !== 'number' ||
                    !Number.isFinite(args[1])
                ) {
                    throw new Error(
                        'addDays requires a numeric day count as its second argument.'
                    );
                }
            } else {
                // All normal math functions require numbers.
                for (const arg of args) {
                    if (
                        typeof arg !== 'number' ||
                        !Number.isFinite(arg)
                    ) {
                        throw new Error(
                            `${name} requires numeric arguments.`
                        );
                    }
                }
            }

            const result = fn.fn(...args);

            if (fn.type === 'date') {
                if (
                    typeof result !== 'string' ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(result)
                ) {
                    throw new Error(
                        `${name} produced an invalid date.`
                    );
                }

                return result;
            }

            if (
                typeof result !== 'number' ||
                !Number.isFinite(result)
            ) {
                throw new Error(
                    `${name} produced a non-finite result.`
                );
            }

            return result;
        }

        throw new Error(
            `Unexpected token: ${token.value}`
        );
    }

    const result = parseExpression();

    if (index !== tokens.length) {
        throw new Error(
            `Unexpected token: ${tokens[index].value}`
        );
    }

    return result;
}

function calculateExpression(expression) {
    if (
        typeof expression !== 'string' ||
        !expression.trim()
    ) {
        throw new Error(
            'A non-empty expression is required.'
        );
    }

    const raw = expression.trim();

    if (raw.length > 250) {
        throw new Error(
            'Expression is too long.'
        );
    }

    const result = parseMathExpression(raw);

    if (typeof result === 'string') {
        return result;
    }

    if (
        typeof result !== 'number' ||
        !Number.isFinite(result)
    ) {
        throw new Error(
            'The result is not a finite number.'
        );
    }

    return Number.isInteger(result)
        ? String(result)
        : String(
            Number(result.toPrecision(15))
        );
}

function registerTool() {
    const context = SillyTavern.getContext();

    const {
        registerFunctionTool,
        unregisterFunctionTool,
    } = context;

    if (
        !registerFunctionTool ||
        !unregisterFunctionTool
    ) {
        console.warn(
            '[Calculator] Function tool API is unavailable.'
        );
        return;
    }

    unregisterFunctionTool(TOOL_NAME);

    registerFunctionTool({
        name: TOOL_NAME,

        displayName: 'Calculator',

        description:
            'Performs exact arithmetic, advanced math (^, sqrt, abs, round, floor, ceil, sin, cos, tan, min, max), and calendar date math. Use this tool whenever an exact numerical or date calculation is needed instead of estimating. Date functions can be nested inside other functions. Examples: "(23+13)/2", "sqrt(144)", "2^10", "daysBetween(\\"2026-08-08\\",\\"2026-09-13\\")", "addDays(\\"2026-09-13\\",45)", or "addDays(addDays(\\"2026-02-01\\",30),daysBetween(\\"2026-03-01\\",\\"2026-04-01\\"))".',

        parameters: {
            $schema:
                'http://json-schema.org/draft-04/schema#',

            type: 'object',

            properties: {
                expression: {
                    type: 'string',

                    description:
                        'A supported arithmetic, math, or date expression. Date functions may be nested inside other functions. Use YYYY-MM-DD for dates.',
                },
            },

            required: ['expression'],
        },

        action: async (args) => {
            try {
                return calculateExpression(
                    args?.expression
                );
            } catch (error) {
                return `Calculation error: ${error.message}`;
            }
        },

        formatMessage: () => '',
    });

    console.log(
        '[Calculator] Secure math/date tool registered.'
    );
}

jQuery(function () {
    try {
        registerTool();
    } catch (error) {
        console.error(
            '[Calculator] Failed to register tool:',
            error
        );
    }
});