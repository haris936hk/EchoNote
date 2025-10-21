import { Link } from 'react-router-dom';
import { Divider } from '@heroui/react';
import { FiGithub, FiMail, FiHeart } from 'react-icons/fi';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-content1 border-t border-divider">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-3">EchoNote</h3>
            <p className="text-default-500 text-sm mb-4">
              AI-powered meeting transcription and summarization platform. 
              Transform your meetings into searchable, actionable knowledge.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/your-repo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-default-500 hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <FiGithub size={20} />
              </a>
              <a
                href="mailto:support@echonote.com"
                className="text-default-500 hover:text-primary transition-colors"
                aria-label="Email"
              >
                <FiMail size={20} />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-default-500 hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-default-500 hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-default-500 hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="text-default-500 hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-default-500 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-default-500 hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Divider className="mb-6" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-default-500">
          <p>
            © {currentYear} EchoNote. All rights reserved.
          </p>
          
          <p className="flex items-center gap-1">
            Made with <FiHeart size={14} className="text-danger" /> by Riphah Team
          </p>
          
          <p className="text-xs">
            Powered by Whisper ASR, SpaCy & Mistral AI
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;