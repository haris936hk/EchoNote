import { Link } from 'react-router-dom';


const Footer = () => {
  return (
    <footer
      className="w-full border-t border-[#454653]/15 py-16"
      style={{ backgroundColor: '#0c1324' }}
    >
      <div className="mx-auto max-w-7xl px-8">
        {/* 4-Column Grid */}
        <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4">
          <div>
            <h5 className="mb-6 font-mono text-xs uppercase tracking-widest text-slate-500">
              Product
            </h5>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li>
                <Link to="/features" className="transition-colors hover:text-slate-100">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="transition-colors hover:text-slate-100">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="transition-colors hover:text-slate-100">
                  Enterprise
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="transition-colors hover:text-slate-100">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="mb-6 font-mono text-xs uppercase tracking-widest text-slate-500">
              Resources
            </h5>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li>
                <Link to="/docs" className="transition-colors hover:text-slate-100">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/docs" className="transition-colors hover:text-slate-100">
                  API Reference
                </Link>
              </li>
              <li>
                <Link to="/help" className="transition-colors hover:text-slate-100">
                  Community
                </Link>
              </li>
              <li>
                <Link to="/help" className="transition-colors hover:text-slate-100">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="mb-6 font-mono text-xs uppercase tracking-widest text-slate-500">
              Legal
            </h5>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li>
                <Link to="/privacy" className="transition-colors hover:text-slate-100">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition-colors hover:text-slate-100">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition-colors hover:text-slate-100">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="mb-6 font-mono text-xs uppercase tracking-widest text-slate-500">
              Connect
            </h5>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li>
                <span className="cursor-pointer transition-colors hover:text-slate-100">
                  Twitter
                </span>
              </li>
              <li>
                <span className="cursor-pointer transition-colors hover:text-slate-100">
                  LinkedIn
                </span>
              </li>
              <li>
                <span className="cursor-pointer transition-colors hover:text-slate-100">
                  GitHub
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between border-t border-[#454653]/10 pt-8 md:flex-row">
          <div className="mb-4 text-lg font-black text-white md:mb-0">EchoNote</div>
          <div className="text-sm font-medium text-slate-500">
            © 2025 EchoNote. Made by Riphah Students
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
