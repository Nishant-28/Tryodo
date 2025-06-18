import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ProfileContent from "./ProfileContent";
import SettingsContent from "./SettingsContent";
import AddressContent from "./AddressContent";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const UserProfilePage = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileContent />;
      case 'address':
        return <AddressContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <ProfileContent />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItems={0} onCartClick={() => {}} />
      <main className="flex-grow bg-gradient-to-r from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="md:col-span-1 border-r md:border-r-0 md:border-b-0 border-gray-200 pr-8">
            <nav className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                className={`justify-start text-lg font-medium px-4 py-2 rounded-lg ${
                  activeTab === 'profile' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                className={`justify-start text-lg font-medium px-4 py-2 rounded-lg ${
                  activeTab === 'address' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('address')}
              >
                Address
              </Button>
              <Button
                variant="ghost"
                className={`justify-start text-lg font-medium px-4 py-2 rounded-lg ${
                  activeTab === 'settings' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </Button>
              <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium px-4 py-2 mt-4 text-center md:text-left">
                Back to Home
              </Link>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="md:col-span-2">
            {renderContent()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfilePage; 