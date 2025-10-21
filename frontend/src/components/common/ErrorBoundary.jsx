import { Component } from 'react';
import { Button, Card, CardBody } from '@nextui-org/react';
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
        <div className="flex items-center justify-center min-h-screen p-4 bg-content1">
          <Card className="max-w-2xl w-full">
            <CardBody className="gap-6 p-8">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-danger/10">
                  <FiAlertTriangle size={48} className="text-danger" />
                </div>
              </div>

              {/* Error Title */}
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-default-500">
                  We're sorry for the inconvenience. An unexpected error has occurred.
                </p>
              </div>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-default-100 rounded-lg p-4 overflow-auto max-h-60">
                  <p className="font-mono text-sm text-danger mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="cursor-pointer">
                      <summary className="font-semibold text-sm mb-2">
                        Stack Trace
                      </summary>
                      <pre className="text-xs whitespace-pre-wrap text-default-600">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                <Button
                  color="primary"
                  variant="solid"
                  startContent={<FiRefreshCw size={18} />}
                  onPress={this.handleReset}
                >
                  Try Again
                </Button>
                
                <Button
                  color="default"
                  variant="bordered"
                  onPress={this.handleReload}
                >
                  Reload Page
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-center text-sm text-default-400">
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