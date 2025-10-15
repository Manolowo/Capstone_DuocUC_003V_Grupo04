import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // Aquí podríamos reportar a un servicio de errores
    // console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <h2 className="text-red-600 font-semibold">Ha ocurrido un error</h2>
          <pre className="whitespace-pre-wrap mt-4 text-sm text-gray-800">{String(this.state.error)}</pre>
          {this.state.info && (
            <details className="mt-2 text-xs text-gray-600">
              <summary>Detalles</summary>
              <pre className="whitespace-pre-wrap">{this.state.info.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
