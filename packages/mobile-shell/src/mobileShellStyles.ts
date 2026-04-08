import { StyleSheet } from 'react-native';

export const palette = {
  bg: '#1a1a1a',
  surface: '#252525',
  border: '#3a3a3a',
  accent: '#6b6bd6',
  text: '#f0f0f0',
  textSecondary: '#a0a0a0',
} as const;

export const shellStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  webview: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  overlay: {
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: palette.textSecondary,
    marginTop: 16,
    fontSize: 15,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  url: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 300,
  },
  btn: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnGhost: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    padding: 13,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 12,
  },
});
