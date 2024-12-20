/**
 * @file SCSS grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const CSS = require('tree-sitter-css/grammar');

module.exports = grammar(CSS, {
  name: 'scss',

  externals: ($, original) => original.concat([$._concat]),

  rules: {
    _top_level_item: ($, original) =>
      choice(
        original,
        $.postcss_statement,
        $.use_statement,
        $.forward_statement,
        $.mixin_statement,
        $.include_statement,
        $.function_statement,
        $.return_statement,
        $.extend_statement,
        $.error_statement,
        $.warn_statement,
        $.debug_statement,
        $.at_root_statement,
        $.if_statement,
        $.each_statement,
        $.for_statement,
        $.while_statement,
      ),

    _block_item: ($, original) =>
      choice(
        original,
        $.mixin_statement,
        $.include_statement,
        $.function_statement,
        $.return_statement,
        $.extend_statement,
        $.error_statement,
        $.warn_statement,
        $.debug_statement,
        $.at_root_statement,
        $.if_statement,
        $.each_statement,
        $.for_statement,
        $.while_statement,
      ),

    // Selectors

    selector_combinator: _ =>
      choice(prec.left('>'), prec.left('~'), prec.left('+')),

    _selector: ($, original) =>
      choice(
        original,
        alias($._concatenated_identifier, $.tag_name),
        $.selector_combinator,
        $.placeholder,
      ),

    class_selector: $ =>
      prec(
        1,
        seq(
          optional($._selector),
          choice('.', $.nesting_selector),
          alias(choice($.identifier, $._concatenated_identifier), $.class_name),
        ),
      ),

    pseudo_class_selector: $ =>
      seq(
        optional($._selector),
        alias($._pseudo_class_selector_colon, ':'),
        alias(choice($.identifier, $._concatenated_identifier), $.class_name),
        optional(alias($.pseudo_class_arguments, $.arguments)),
      ),

    // Declarations

    declaration: $ =>
      choice(
        seq(
          $.variable,
          ':',
          $._value,
          repeat(seq(optional(','), $._value)),
          optional(choice($.important, $.default, $.global)),
          ';',
        ),
        seq(
          alias(
            choice($.identifier, $._concatenated_identifier),
            $.property_name,
          ),
          ':',
          $._value,
          repeat(seq(optional(','), $._value)),
          optional(choice($.important, $.default)),
          ';',
        ),
      ),

    // Media queries

    _query: ($, original) => choice(original, prec(-1, $.interpolation)),

    // Property Values

    _value: ($, original) =>
      choice(
        original,
        $.escape_sequence,
        $.map,
        prec(
          -1,
          choice($._concatenated_identifier, $.nesting_selector, $.list_value),
        ),
        $.variable,
      ),

    arguments: $ =>
      seq(
        token.immediate('('),
        optional(sep1(choice(',', ';'), repeat1($._value))),
        ')',
      ),

    use_namespace: $ => seq('as', choice('*', $.namespace)),

    use_statement: $ =>
      seq('@use', $.string_value, optional($.use_namespace), ';'),

    forward_statement: $ => seq('@forward', $._value, ';'),

    mixin_statement: $ =>
      seq(
        '@mixin',
        field('name', $.identifier),
        optional($.parameters),
        $.block,
      ),

    include_statement: $ =>
      seq(
        '@include',
        $.identifier,
        optional(alias($._include_arguments, $.arguments)),
        choice($.block, ';'),
      ),

    _include_arguments: $ =>
      seq(
        token.immediate('('),
        sep1(',', alias($._include_argument, $.argument)),
        ')',
      ),

    _include_argument: $ =>
      seq(
        optional(seq(field('name', $.variable), ':')),
        field('value', $._include_value),
      ),

    _include_value: $ => seq($._value, repeat($._value)),

    function_statement: $ =>
      seq(
        '@function',
        field('name', $.identifier),
        optional($.parameters),
        $.block,
      ),

    parameters: $ => seq('(', sep1(',', $.parameter), ')'),

    parameter: $ =>
      seq($.variable, optional(seq(':', field('default', $._value)))),

    return_statement: $ => seq('@return', $._value, ';'),

    extend_statement: $ =>
      seq('@extend', choice($._value, $.class_selector), ';'),

    error_statement: $ => seq('@error', $._value, ';'),

    warn_statement: $ => seq('@warn', $._value, ';'),

    debug_statement: $ => seq('@debug', $._value, ';'),

    at_root_statement: $ => seq('@at-root', $._selector, $.block),

    default: _ => '!default',

    global: _ => '!global',

    if_statement: $ =>
      seq(
        '@if',
        field('condition', $._value),
        $.block,
        repeat($.else_if_clause),
        optional($.else_clause),
      ),

    else_if_clause: $ =>
      seq('@else', 'if', field('condition', $._value), $.block),

    else_clause: $ => seq('@else', $.block),

    each_statement: $ =>
      seq(
        '@each',
        optional(seq(field('key', $.variable), ',')),
        field('value', $.variable),
        'in',
        $._value,
        $.block,
      ),

    for_statement: $ =>
      seq(
        '@for',
        $.variable,
        'from',
        field('from', $._value),
        'through',
        field('through', $._value),
        $.block,
      ),

    while_statement: $ => seq('@while', $._value, $.block),

    call_expression: $ =>
      seq(
        alias(choice($.identifier, $.plain_value), $.function_name),
        $.arguments,
      ),

    map: $ => prec(2, seq('(', optional(sep1(',', $.map_pair)), ')')),

    map_pair: $ =>
      prec(
        2,
        seq(
          alias($._value, $.key),
          ':',
          alias($._value, $.value),
          optional($.default),
        ),
      ),

    binary_expression: $ =>
      prec.left(
        seq(
          $._value,
          choice('+', '-', '*', '/', '==', '<', '>', '!=', '<=', '>='),
          $._value,
        ),
      ),

    list_value: $ => seq('(', sep2(',', $._value), ')'),

    interpolation: $ => seq('#{', $._value, '}'),

    placeholder: $ => seq('%', $.identifier),

    _concatenated_identifier_token: _ =>
      /(--|-?[0-9a-zA-Z_\xA0-\xFF])[a-zA-Z0-9-_\xA0-\xFF]*/,

    _concatenated_identifier: $ =>
      choice(
        seq(
          $.identifier,
          repeat1(
            seq(
              $._concat,
              choice(
                $.interpolation,
                alias($._concatenated_identifier_token, $.identifier),
                alias(token.immediate('-'), $.identifier),
              ),
            ),
          ),
        ),
        seq(
          $.interpolation,
          repeat(
            seq(
              $._concat,
              choice(
                $.interpolation,
                alias($._concatenated_identifier_token, $.identifier),
                alias(token.immediate('-'), $.identifier),
              ),
            ),
          ),
        ),
      ),

    namespace: _ => /[a-zA-Z_\xA0-\xFF][a-zA-Z0-9-_\xA0-\xFF]*/,

    variable: _ => /([a-zA-Z_]+\.)?\$[a-zA-Z-_][a-zA-Z0-9-_]*/,
  },
});

/**
 * Creates a rule to match one or more of the rules separated by `separator`
 *
 * @param {RuleOrLiteral} separator
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function sep1(separator, rule) {
  return seq(rule, repeat(seq(separator, rule)));
}

/**
 * Creates a rule to match two or more of the rules separated by `separator`
 *
 * @param {RuleOrLiteral} separator
 *
 * @param {RuleOrLiteral} rules
 *
 * @return {SeqRule}
 */
function sep2(separator, rules) {
  return seq(rules, repeat1(seq(separator, rules)));
}
