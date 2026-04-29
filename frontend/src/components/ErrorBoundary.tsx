import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-lg text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-800">Щось пішло не так</h2>
            <p className="mb-4 text-gray-600">Сталася непередбачувана помилка. Спробуйте оновити сторінку.</p>
            <button
              onClick={this.handleReload}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Оновити сторінку
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
