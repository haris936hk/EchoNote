import { Component } from 'react';
import { Button, Card, CardBody } from '@heroui/react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-content1 flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardBody className="gap-6 p-8">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="bg-danger/10 rounded-full p-4">
                  <FiAlertTriangle size={48} className="text-danger" />
                </div>
              </div>

              {/* Error Title */}
              <div className="text-center">
                <h1 className="mb-2 text-2xl font-bold">Oops! Something went wrong</h1>
                <p className="text-default-500">
                  We're sorry for the inconvenience. An unexpected error has occurred.
                </p>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-default-100 max-h-60 overflow-auto rounded-lg p-4">
                  <p className="text-danger mb-2 font-mono text-sm">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="cursor-pointer">
                      <summary className="mb-2 text-sm font-semibold">Stack Trace</summary>
                      <pre className="text-default-600 whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  color="primary"
                  variant="solid"
                  startContent={<FiRefreshCw size={18} />}
                  onPress={this.handleReset}
                >
                  Try Again
                </Button>

                <Button color="default" variant="bordered" onPress={this.handleReload}>
                  Reload Page
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-default-400 text-center text-sm">
                If the problem persists, please contact support or try again later.
              </p>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
