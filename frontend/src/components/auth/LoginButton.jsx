import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@heroui/react';
import { FcGoogle } from 'react-icons/fc';

const LoginButton = ({ size = 'lg', fullWidth = false }) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setError(null);
        const result = await loginWithGoogle(codeResponse);

        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Login failed');
        }
      } catch (err) {
        console.error('Login error:', err);
        setError('Failed to login. Please try again.');
      }
    },
    onError: () => {
      setError('Google login failed. Please try again.');
    },
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="group relative flex justify-center">
        {}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-secondary opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30"></div>

        {}
        <div className="relative animate-gradient rounded-3xl bg-gradient-to-r from-primary via-secondary to-primary bg-200 p-[2px] shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-primary/60">
          <div className="w-full overflow-hidden rounded-3xl bg-content1">
            <Button
              onPress={() => login()}
              className="flex h-11 items-center justify-center gap-3 border border-gray-200/20 bg-white px-6 font-semibold text-black transition-all hover:bg-gray-50 active:scale-[0.98]"
              style={{ width: fullWidth ? '100%' : 'auto' }}
              disableRipple
            >
              <FcGoogle className="text-xl" />
              <span>Continue with Google</span>
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
};

export default LoginButton;
