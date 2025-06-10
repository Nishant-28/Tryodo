
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PhoneSearchProps {
  onSearch: (brand: string, model: string) => void;
}

const phoneModels = [
  { brand: 'Apple', models: ['iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 12'] },
  { brand: 'Samsung', models: ['Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy S22', 'Galaxy A54', 'Galaxy A34'] },
  { brand: 'OnePlus', models: ['OnePlus 11', 'OnePlus 10 Pro', 'OnePlus Nord CE 3', 'OnePlus 9 Pro'] },
  { brand: 'Xiaomi', models: ['Mi 13 Pro', 'Redmi Note 12 Pro', 'Mi 12', 'Redmi K50'] },
];

const PhoneSearch = ({ onSearch }: PhoneSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [filteredModels, setFilteredModels] = useState<string[]>([]);

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    const brandData = phoneModels.find(p => p.brand === brand);
    setFilteredModels(brandData?.models || []);
  };

  const handleModelSelect = (model: string) => {
    onSearch(selectedBrand, model);
  };

  const filteredBrands = phoneModels.filter(phone => 
    phone.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Select Your Phone</h3>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search phone brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {!selectedBrand ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredBrands.map((phone) => (
            <Button
              key={phone.brand}
              variant="outline"
              onClick={() => handleBrandSelect(phone.brand)}
              className="p-4 h-auto justify-start hover:bg-blue-50 hover:border-blue-300"
            >
              <div className="text-left">
                <div className="font-semibold">{phone.brand}</div>
                <div className="text-xs text-gray-500">{phone.models.length} models</div>
              </div>
            </Button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">{selectedBrand} Models</h4>
            <Button variant="ghost" size="sm" onClick={() => setSelectedBrand('')}>
              Back
            </Button>
          </div>
          <div className="grid gap-2">
            {filteredModels.map((model) => (
              <Button
                key={model}
                variant="outline"
                onClick={() => handleModelSelect(model)}
                className="justify-start hover:bg-blue-50 hover:border-blue-300"
              >
                {model}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneSearch;
