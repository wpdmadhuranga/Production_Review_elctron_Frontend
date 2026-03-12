import { Factory } from "lucide-react";
import { useNavigate } from "react-router";
import LoginForm from "../component/LoginForm";

export function LoginPage() {
  const navigate = useNavigate();

  const onSuccess = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Factory className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tyre Manufacturing</h1>
          <p className="text-gray-600">Production Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-1">Please sign in to your account</p>
          </div>

          <LoginForm onSuccess={onSuccess} />

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Need access? Contact your{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                system administrator
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            © 2026 Tyre Manufacturing Systems. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
