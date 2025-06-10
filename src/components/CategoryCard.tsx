
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
}

const CategoryCard = ({ title, description, icon: Icon, gradient, onClick }: CategoryCardProps) => {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${gradient}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-white/80 text-sm">{description}</p>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full transform translate-x-10 -translate-y-10"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full transform -translate-x-8 translate-y-8"></div>
    </div>
  );
};

export default CategoryCard;
