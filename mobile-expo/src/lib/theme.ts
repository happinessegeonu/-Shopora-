import { Platform } from 'react-native';

export const theme = {
  colors: { paper: '#fbf9f4', white: '#fffefa', ink: '#24241f', green: '#435b45', muted: '#77766e', line: '#e5e0d6', peach: '#f4eade', gold: '#efcf83', soft: '#e8eee3', error: '#8b2a26' },
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  radius: 16,
};
