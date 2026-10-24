import { Component, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ErrorBoundaryState = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[Daymark ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>{this.state.message}</Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F7F5F0' },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1C2020', marginBottom: 8 },
  body: { fontSize: 14, color: '#62716B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  button: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10, backgroundColor: '#FF6F59' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
