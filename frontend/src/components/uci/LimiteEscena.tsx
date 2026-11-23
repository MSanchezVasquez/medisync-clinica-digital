import { Component, type ReactNode } from 'react';

export class LimiteEscena extends Component<
  { children: ReactNode; alternativa: ReactNode },
  { error: boolean }
> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    return this.state.error ? this.props.alternativa : this.props.children;
  }
}
