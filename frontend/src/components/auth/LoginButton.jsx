import { Button } from '@nextui-org/react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

const LoginButton = ({ size = 'lg', fullWidth = false }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await login();
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        size={size}
        color="default"
        variant="bordered"
        onPress={handleLogin}
        isLoading={isLoading}
        startContent={!isLoading && <FcGoogle size={24} />}
        fullWidth={fullWidth}
        className="font-semibold"
      >
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </Button>
      
      {error && (
        <p className="text-danger text-sm text-center">{error}</p>
      )}
    </div>
  );
};

export default LoginButton;