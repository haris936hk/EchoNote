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
      <div className="flex justify-center relative group">
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500 rounded-2xl"></div>

        {/* Button wrapper with glow */}
        <div className="relative p-[2px] bg-gradient-to-r from-primary via-secondary to-primary bg-200 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-primary/60 transition-all duration-300 animate-gradient">
          <div className="bg-content1 rounded-3xl overflow-hidden">
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

      {error && (
        <p className="text-danger text-sm text-center">{error}</p>
      )}
    </div>
  );
};

export default LoginButton;
