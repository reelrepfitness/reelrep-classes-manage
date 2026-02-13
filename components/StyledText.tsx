import { Text as DefaultText, TextProps } from 'react-native';
import Fonts from '@/constants/typography';

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  return <DefaultText style={[{ fontFamily: Fonts.regular }, style]} {...otherProps} />;
}

export function BoldText(props: TextProps) {
  const { style, ...otherProps } = props;
  return <DefaultText style={[{ fontFamily: Fonts.bold }, style]} {...otherProps} />;
}

export function LightText(props: TextProps) {
  const { style, ...otherProps } = props;
  return <DefaultText style={[{ fontFamily: Fonts.light }, style]} {...otherProps} />;
}

export function MediumText(props: TextProps) {
  const { style, ...otherProps } = props;
  return <DefaultText style={[{ fontFamily: Fonts.medium }, style]} {...otherProps} />;
}

export function BlackText(props: TextProps) {
  const { style, ...otherProps } = props;
  return <DefaultText style={[{ fontFamily: Fonts.black }, style]} {...otherProps} />;
}
