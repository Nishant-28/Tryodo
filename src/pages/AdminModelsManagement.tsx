import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Trash2, Edit, Smartphone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  is_active: boolean;
}

interface Model {
  id: string;
  brand_id: string;
  model_name: string;
  model_number?: string;
  release_year?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand_name?: string;
}

interface NewModelForm {
  brand_id: string;
  model_name: string;
  model_number: string;
  release_year: string;
}

const AdminModelsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [newModel, setNewModel] = useState<NewModelForm>({
    brand_id: '',
    model_name: '',
    model_number: '',
    release_year: new Date().getFullYear().toString()
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter models when search term or brand filter changes
  useEffect(() => {
    filterModels();
  }, [models, searchTerm, selectedBrandFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      
      // Load brands first
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (brandsError) {
        throw brandsError;
      }
      
      setBrands(brandsData || []);

      // Load models with brand information
      const { data: modelsData, error: modelsError } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands(name)
        `)
        .order('created_at', { ascending: false });
      
      if (modelsError) {
        // If the join fails, try loading models without brands
        const { data: simpleModelsData, error: simpleError } = await supabase
          .from('smartphone_models')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        
        setModels(simpleModelsData || []);
        return;
      }

      // Transform models data to include brand name
      const modelsWithBrandNames = modelsData?.map(model => ({
        ...model,
        brand_name: model.brands?.name || 'Unknown Brand'
      })) || [];

      setModels(modelsWithBrandNames);
      
    } catch (error: any) {
      let errorMessage = 'Failed to load data. ';
      
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage += 'Database tables may not be properly set up. Please contact the administrator.';
      } else if (error.code === '42P01') {
        errorMessage += 'Required database tables are missing. Please run the database migration scripts.';
      } else if (error.message?.includes('JWT')) {
        errorMessage += 'Authentication token expired. Please refresh the page and try again.';
      } else if (error.message?.includes('permission')) {
        errorMessage += 'You do not have permission to access this data.';
      } else {
        errorMessage += error.message || 'An unknown error occurred.';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterModels = () => {
    let filtered = models;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(model =>
        model.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by brand
    if (selectedBrandFilter && selectedBrandFilter !== "all") {
      filtered = filtered.filter(model => model.brand_id === selectedBrandFilter);
    }

    setFilteredModels(filtered);
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!newModel.brand_id) errors.push('Please select a brand');
    if (!newModel.model_name.trim()) errors.push('Please enter model name');
    if (!newModel.model_number.trim()) errors.push('Please enter full model name');
    if (newModel.release_year && (isNaN(Number(newModel.release_year)) || Number(newModel.release_year) < 1990 || Number(newModel.release_year) > new Date().getFullYear() + 2)) {
      errors.push('Please enter a valid release year');
    }
    
    return errors;
  };

  const handleAddModel = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join('\n'),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const modelData = {
        brand_id: newModel.brand_id,
        model_name: newModel.model_name.trim(),
        model_number: newModel.model_number.trim(),
        release_year: newModel.release_year ? parseInt(newModel.release_year) : null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('smartphone_models')
        .insert(modelData)
        .select(`
          *,
          brands(name)
        `)
        .single();

      if (error) throw error;

      // Add the new model to the list
      const newModelWithBrand = {
        ...data,
        brand_name: data.brands?.name || 'Unknown Brand'
      };
      
      setModels(prev => [newModelWithBrand, ...prev]);

      toast({
        title: "Success",
        description: "Model added successfully!",
      });

      // Reset form and close dialog
      setNewModel({
        brand_id: '',
        model_name: '',
        model_number: '',
        release_year: new Date().getFullYear().toString()
      });
      setIsAddDialogOpen(false);

    } catch (error: any) {
      console.error('Error adding model:', error);
      let errorMessage = "Failed to add model. Please try again.";
      
      if (error.code === '23505') {
        errorMessage = "A model with this name already exists for this brand.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelId: string, modelName: string) => {
    try {
      setLoading(true);
      
      // Check if model is being used in vendor_products
      const { data: vendorProducts, error: checkError } = await supabase
        .from('vendor_products')
        .select('id')
        .eq('model_id', modelId)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (vendorProducts && vendorProducts.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This model cannot be deleted because it has products associated with it.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('smartphone_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      // Remove model from local state
      setModels(prev => prev.filter(model => model.id !== modelId));

      toast({
        title: "Success",
        description: `Model "${modelName}" deleted successfully!`,
      });

    } catch (error) {
      console.error('Error deleting model:', error);
      toast({
        title: "Error",
        description: "Failed to delete model. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (modelId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('smartphone_models')
        .update({ is_active: !currentStatus })
        .eq('id', modelId);

      if (error) throw error;

      // Update local state
      setModels(prev => prev.map(model => 
        model.id === modelId 
          ? { ...model, is_active: !currentStatus }
          : model
      ));

      toast({
        title: "Success",
        description: `Model ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
      });

    } catch (error) {
      console.error('Error updating model status:', error);
      toast({
        title: "Error",
        description: "Failed to update model status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading models...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Phone Models</h1>
          <p className="text-gray-600">Add, edit, and manage phone models for all brands</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Models</p>
                  <p className="text-2xl font-bold text-gray-900">{models.length}</p>
                </div>
                <Smartphone className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Models</p>
                  <p className="text-2xl font-bold text-green-600">
                    {models.filter(m => m.is_active).length}
                  </p>
                </div>
                <Smartphone className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Brands</p>
                  <p className="text-2xl font-bold text-purple-600">{brands.length}</p>
                </div>
                <Smartphone className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Search Models</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by model name or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-64">
                <Label htmlFor="brandFilter">Filter by Brand</Label>
                <Select value={selectedBrandFilter} onValueChange={setSelectedBrandFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Phone Model</DialogTitle>
                    <DialogDescription>
                      Create a new phone model for the selected brand.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="brand">Brand *</Label>
                      <Select
                        value={newModel.brand_id}
                        onValueChange={(value) => setNewModel(prev => ({ ...prev, brand_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.filter(b => b.is_active).map(brand => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="modelName">Model Name *</Label>
                      <Input
                        id="modelName"
                        placeholder="e.g., iPhone 15 Pro"
                        value={newModel.model_name}
                        onChange={(e) => setNewModel(prev => ({ ...prev, model_name: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="fullName">Full Model Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="e.g., Apple iPhone 15 Pro"
                        value={newModel.model_number}
                        onChange={(e) => setNewModel(prev => ({ ...prev, model_number: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="releaseYear">Release Year</Label>
                      <Input
                        id="releaseYear"
                        type="number"
                        min="1990"
                        max={new Date().getFullYear() + 2}
                        placeholder={new Date().getFullYear().toString()}
                        value={newModel.release_year}
                        onChange={(e) => setNewModel(prev => ({ ...prev, release_year: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddModel} disabled={loading}>
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Add Model'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <CardTitle>Phone Models ({filteredModels.length})</CardTitle>
            <CardDescription>
              Manage all phone models across different brands
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredModels.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No models found</p>
                <p className="text-gray-400">
                  {searchTerm || (selectedBrandFilter && selectedBrandFilter !== "all")
                    ? 'Try adjusting your search or filter criteria.'
                    : models.length === 0 
                      ? 'Add your first phone model to get started or run the sample data script.'
                      : 'Add your first phone model to get started.'
                  }
                </p>
                {models.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Tip:</strong> If you haven't set up the database yet, please run the 
                      <code className="mx-1 px-2 py-1 bg-yellow-100 rounded">supabase-setup.sql</code> 
                      and 
                      <code className="mx-1 px-2 py-1 bg-yellow-100 rounded">sample-data.sql</code> 
                      scripts first.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Release Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredModels.map((model) => (
                      <tr key={model.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{model.model_number || 'Unknown Model'}</div>
                            <div className="text-sm text-gray-500">{model.model_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{model.brand_name || 'Unknown Brand'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {model.release_year || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={model.is_active ? 'default' : 'secondary'}
                            className={model.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {model.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(model.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(model.id, model.is_active)}
                              disabled={loading}
                            >
                              {model.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Delete Model
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{model.model_number}"? This action cannot be undone.
                                    {'\n\n'}Note: You can only delete models that are not being used by any vendors.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteModel(model.id, model.model_number || 'Unknown Model')}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminModelsManagement;