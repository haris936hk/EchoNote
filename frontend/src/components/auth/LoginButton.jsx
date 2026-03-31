import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const LoginButton = ({ size = 'lg', fullWidth = false }) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleSuccess = async (credentialResponse) => {
    try {
      setError(null);
      const result = await loginWithGoogle(credentialResponse);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
    }
  };

  const handleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="group relative flex justify-center">
        {/* Glowing background effect */}
        <div className="from-primary to-secondary absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30"></div>

        {/* Button wrapper with glow */}
        <div className="from-primary via-secondary to-primary bg-200 hover:shadow-primary/60 animate-gradient relative rounded-3xl bg-gradient-to-r p-[2px] shadow-lg transition-all duration-300 hover:shadow-2xl">
          <div className="bg-content1 overflow-hidden rounded-3xl">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              size={size === 'lg' ? 'large' : 'medium'}
              width={fullWidth ? '100%' : undefined}
              theme="outline"
              text="continue_with"
              shape="rectangular"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-danger text-center text-sm">{error}</p>}
    </div>
  );
};

export default LoginButton;
