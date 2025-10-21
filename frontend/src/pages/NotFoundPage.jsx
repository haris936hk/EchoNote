import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { FiHome, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardBody className="text-center py-16 px-8">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-danger/10 rounded-full mb-4">
              <FiAlertCircle size={48} className="text-danger" />
            </div>
            <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          </div>

          {/* Message */}
          <div className="space-y-3 mb-8">
            <h2 className="text-2xl font-bold">Page Not Found</h2>
            <p className="text-default-600">
              Sorry, we couldn't find the page you're looking for. 
              It might have been moved or deleted.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              color="primary"
              startContent={<FiHome size={18} />}
              onPress={handleGoHome}
              size="lg"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="bordered"
              startContent={<FiArrowLeft size={18} />}
              onPress={handleGoBack}
              size="lg"
            >
              Go Back
            </Button>
          </div>

          {/* Additional Help */}
          <div className="mt-8 pt-8 border-t border-divider">
            <p className="text-sm text-default-500">
              Need help? Contact support or visit our help center
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default NotFoundPage;