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
import { User, MapPin, Settings, ArrowLeft } from 'lucide-react';
import ProfileContent from "./ProfileContent";
import SettingsContent from "./SettingsContent";
import AddressContent from "./AddressContent";
import Header from "@/components/Header";

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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hideCartOnMobile={true} />
      
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 lg:hidden">
        <div className="container-mobile mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-blue-600 touch-manipulation">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Back</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
            <div className="w-16"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="bg-white border-b border-gray-200 lg:hidden">
        <div className="container-mobile mx-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center py-3 px-2 touch-manipulation transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-grow py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl shadow-lg p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Sidebar */}
              <div className="md:col-span-1 border-r border-gray-200 pr-8">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
                  <p className="text-gray-600">Manage your account settings and preferences</p>
                </div>
                
                <nav className="flex flex-col space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant="ghost"
                        className={`justify-start text-lg font-medium px-4 py-3 rounded-lg transition-all ${
                          activeTab === tab.id 
                            ? 'bg-blue-100 text-blue-800 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </nav>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <Link 
                    to="/" 
                    className="flex items-center text-blue-600 hover:text-blue-800 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Link>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="md:col-span-2">
                {renderContent()}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage; 