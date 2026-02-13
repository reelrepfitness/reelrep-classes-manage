/**
 * Metro shim: wraps react-native Text & TextInput with default Ploni font.
 * All app-code imports of 'react-native' are redirected here by metro.config.js.
 * This file's own require('react-native') is NOT redirected (excluded in metro config).
 */
const RN = require('react-native');
const React = require('react');

function getPloniFontFamily(fontWeight) {
  const w = String(fontWeight || '');
  if (['100', '200', '300'].includes(w)) return 'Ploni-Light';
  if (['500'].includes(w)) return 'Ploni-Medium';
  if (['600', '700', 'bold'].includes(w)) return 'Ploni-Bold';
  if (['800', '900'].includes(w)) return 'Ploni-Black';
  return 'Ploni-Regular';
}

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style;
}

const WrappedText = React.forwardRef(function Text(props, ref) {
  const flat = flattenStyle(props.style);
  if (!flat.fontFamily) {
    const font = getPloniFontFamily(flat.fontWeight);
    return React.createElement(RN.Text, {
      ...props,
      ref,
      style: [{ fontFamily: font }, props.style, flat.fontWeight ? { fontWeight: undefined } : null],
    });
  }
  return React.createElement(RN.Text, { ...props, ref });
});
WrappedText.displayName = 'Text';

const WrappedTextInput = React.forwardRef(function TextInput(props, ref) {
  const flat = flattenStyle(props.style);
  if (!flat.fontFamily) {
    const font = getPloniFontFamily(flat.fontWeight);
    return React.createElement(RN.TextInput, {
      ...props,
      ref,
      style: [{ fontFamily: font }, props.style, flat.fontWeight ? { fontWeight: undefined } : null],
    });
  }
  return React.createElement(RN.TextInput, { ...props, ref });
});
WrappedTextInput.displayName = 'TextInput';

// Proxy re-exports everything from react-native, but replaces Text & TextInput
module.exports = new Proxy(RN, {
  get(target, prop) {
    if (prop === 'Text') return WrappedText;
    if (prop === 'TextInput') return WrappedTextInput;
    return target[prop];
  },
});
