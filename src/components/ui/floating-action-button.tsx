import React, { useState } from 'react';
import { Plus, Zap, Calculator, Package, DollarSign, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FloatingActionButtonProps {
  onQuickAction?: (action: string) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onQuickAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const quickActions = [
    { id: 'add-product', label: 'Add Product', icon: Plus, color: 'bg-blue-600 hover:bg-blue-700' },
    { id: 'bulk-pricing', label: 'Bulk Pricing', icon: DollarSign, color: 'bg-green-600 hover:bg-green-700' },
    { id: 'restock-alert', label: 'Restock Alert', icon: Package, color: 'bg-orange-600 hover:bg-orange-700' },
    { id: 'profit-calc', label: 'Profit Calculator', icon: Calculator, color: 'bg-purple-600 hover:bg-purple-700' },
    { id: 'analytics', label: 'Quick Analytics', icon: TrendingUp, color: 'bg-pink-600 hover:bg-pink-700' }
  ];

  const handleAction = (actionId: string) => {
    setIsOpen(false);
    if (onQuickAction) {
      onQuickAction(actionId);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Quick Actions Menu */}
      {isOpen && (
        <Card className="mb-4 shadow-lg">
          <CardContent className="p-2">
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => handleAction(action.id)}
                >
                  <action.icon className="h-4 w-4 mr-3" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main FAB */}
      <Button
        className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen 
            ? 'bg-red-600 hover:bg-red-700 rotate-45' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Zap className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
};

export default FloatingActionButton; 