import { useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Button className="mt-6 w-full md:w-auto" onClick={() => (window.location.href = '/')}>
          Return to Home Page
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
