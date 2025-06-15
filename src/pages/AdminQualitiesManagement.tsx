import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Trash2, Edit, Settings, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  gradient?: string;
}

interface CategoryQuality {
  id: string;
  category_id: string;
  quality_name: string;
  quality_description?: string;
  specifications?: any;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: {
    name: string;
    icon?: string;
    gradient?: string;
  };
}

interface NewQualityForm {
  category_id: string;
  quality_name: string;
  quality_description: string;
  specifications: string; // JSON string
  sort_order: string;
}

const AdminQualitiesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedCategoryId = searchParams.get('category');
  
  // State management
  const [qualities, setQualities] = useState<CategoryQuality[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredQualities, setFilteredQualities] = useState<CategoryQuality[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(preselectedCategoryId || 'all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState<CategoryQuality | null>(null);
  
  // Form state
  const [newQuality, setNewQuality] = useState<NewQualityForm>({
    category_id: preselectedCategoryId || '',
    quality_name: '',
    quality_description: '',
    specifications: '',
    sort_order: '0'
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter qualities when search term or filters change
  useEffect(() => {
    filterQualities();
  }, [qualities, searchTerm, selectedCategoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load category qualities with category information
      const { data: qualitiesData, error: qualitiesError } = await supabase
        .from('category_qualities')
        .select(`
          *,
          categories!inner(name, icon, gradient)
        `)
        .order('category_id, sort_order');
      
      if (qualitiesError) throw qualitiesError;
      
      setQualities(qualitiesData || []);

    } catch (error: any) {
      console.error('Failed to load qualities data:', error);
      
      let errorMessage = "Failed to load qualities data.";
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage = "Category qualities table not found. Please run the database setup script first.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Permission denied. Please check your admin access rights.";
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

  const filterQualities = () => {
    let filtered = qualities;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(quality =>
        quality.quality_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quality.quality_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quality.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategoryFilter && selectedCategoryFilter !== "all") {
      filtered = filtered.filter(quality => quality.category_id === selectedCategoryFilter);
    }

    setFilteredQualities(filtered);
  };

  const validateForm = (form: NewQualityForm) => {
    const errors: string[] = [];
    
    if (!form.category_id) errors.push('Please select a category');
    if (!form.quality_name.trim()) errors.push('Please enter quality name');
    if (!form.quality_description.trim()) errors.push('Please enter quality description');
    if (form.sort_order && (isNaN(Number(form.sort_order)) || Number(form.sort_order) < 0)) {
      errors.push('Please enter a valid sort order (0 or positive number)');
    }
    
    // Validate JSON if specifications is provided
    if (form.specifications.trim()) {
      try {
        JSON.parse(form.specifications);
      } catch (e) {
        errors.push('Specifications must be valid JSON format');
      }
    }
    
    return errors;
  };

  const handleAddQuality = async () => {
    const errors = validateForm(newQuality);
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
      
      const qualityData = {
        category_id: newQuality.category_id,
        quality_name: newQuality.quality_name.trim(),
        quality_description: newQuality.quality_description.trim(),
        specifications: newQuality.specifications.trim() ? JSON.parse(newQuality.specifications) : null,
        sort_order: newQuality.sort_order ? parseInt(newQuality.sort_order) : 0,
        is_active: true
      };

      const { data, error } = await supabase
        .from('category_qualities')
        .insert(qualityData)
        .select(`
          *,
          categories!inner(name, icon, gradient)
        `)
        .single();

      if (error) throw error;

      // Add the new quality to the list
      setQualities(prev => [...prev, data].sort((a, b) => {
        if (a.category_id === b.category_id) {
          return a.sort_order - b.sort_order;
        }
        return a.category_id.localeCompare(b.category_id);
      }));

      toast({
        title: "Success",
        description: "Quality added successfully!",
      });

      // Reset form and close dialog
      setNewQuality({
        category_id: preselectedCategoryId || '',
        quality_name: '',
        quality_description: '',
        specifications: '',
        sort_order: '0'
      });
      setIsAddDialogOpen(false);

    } catch (error: any) {
      console.error('Error adding quality:', error);
      let errorMessage = "Failed to add quality. Please try again.";
      
      if (error.code === '23505') {
        errorMessage = "A quality with this name already exists for this category.";
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

  const handleUpdateQuality = async () => {
    if (!editingQuality) return;
    
    const errors = validateForm(newQuality);
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
      
      const qualityData = {
        category_id: newQuality.category_id,
        quality_name: newQuality.quality_name.trim(),
        quality_description: newQuality.quality_description.trim(),
        specifications: newQuality.specifications.trim() ? JSON.parse(newQuality.specifications) : null,
        sort_order: newQuality.sort_order ? parseInt(newQuality.sort_order) : 0
      };

      const { data, error } = await supabase
        .from('category_qualities')
        .update(qualityData)
        .eq('id', editingQuality.id)
        .select(`
          *,
          categories!inner(name, icon, gradient)
        `)
        .single();

      if (error) throw error;

      // Update the quality in the list
      setQualities(prev => prev.map(quality => 
        quality.id === editingQuality.id ? data : quality
      ).sort((a, b) => {
        if (a.category_id === b.category_id) {
          return a.sort_order - b.sort_order;
        }
        return a.category_id.localeCompare(b.category_id);
      }));

      toast({
        title: "Success",
        description: "Quality updated successfully!",
      });

      // Reset form and close dialog
      setEditingQuality(null);
      setNewQuality({
        category_id: preselectedCategoryId || '',
        quality_name: '',
        quality_description: '',
        specifications: '',
        sort_order: '0'
      });

    } catch (error: any) {
      console.error('Error updating quality:', error);
      let errorMessage = "Failed to update quality. Please try again.";
      
      if (error.code === '23505') {
        errorMessage = "A quality with this name already exists for this category.";
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

  const handleDeleteQuality = async (qualityId: string, qualityName: string) => {
    try {
      setLoading(true);

      // Check if quality is being used by any models
      const { data: modelUsage, error: checkError } = await supabase
        .from('model_category_qualities')
        .select('id')
        .eq('category_quality_id', qualityId)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (modelUsage && modelUsage.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This quality cannot be deleted because it's being used by phone models.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('category_qualities')
        .delete()
        .eq('id', qualityId);

      if (error) throw error;

      // Remove quality from local state
      setQualities(prev => prev.filter(quality => quality.id !== qualityId));

      toast({
        title: "Success",
        description: `Quality "${qualityName}" deleted successfully!`,
      });

    } catch (error) {
      console.error('Error deleting quality:', error);
      toast({
        title: "Error",
        description: "Failed to delete quality. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (qualityId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('category_qualities')
        .update({ is_active: !currentStatus })
        .eq('id', qualityId);

      if (error) throw error;

      // Update local state
      setQualities(prev => prev.map(quality => 
        quality.id === qualityId 
          ? { ...quality, is_active: !currentStatus }
          : quality
      ));

      toast({
        title: "Success",
        description: `Quality ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
      });

    } catch (error) {
      console.error('Error updating quality status:', error);
      toast({
        title: "Error",
        description: "Failed to update quality status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (quality: CategoryQuality) => {
    setEditingQuality(quality);
    setNewQuality({
      category_id: quality.category_id,
      quality_name: quality.quality_name,
      quality_description: quality.quality_description || '',
      specifications: quality.specifications ? JSON.stringify(quality.specifications, null, 2) : '',
      sort_order: quality.sort_order.toString()
    });
  };

  const closeDialog = () => {
    setEditingQuality(null);
    setIsAddDialogOpen(false);
    setNewQuality({
      category_id: preselectedCategoryId || '',
      quality_name: '',
      quality_description: '',
      specifications: '',
      sort_order: '0'
    });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading qualities...</p>
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Category Qualities</h1>
          <p className="text-gray-600">Define fixed quality options for each category (e.g., TFT, OLED for Display)</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Qualities</p>
                  <p className="text-2xl font-bold text-gray-900">{qualities.length}</p>
                </div>
                <Settings className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Qualities</p>
                  <p className="text-2xl font-bold text-green-600">
                    {qualities.filter(q => q.is_active).length}
                  </p>
                </div>
                <Settings className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Categories</p>
                  <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
                </div>
                <Package className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="search">Search Qualities</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search qualities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="categoryFilter">Filter by Category</Label>
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={isAddDialogOpen || !!editingQuality} onOpenChange={closeDialog}>
                <DialogTrigger>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Quality
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuality ? 'Edit Quality' : 'Add New Quality'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingQuality 
                        ? 'Update the quality information.'
                        : 'Define a quality option for a category (e.g., "TFT" for Display category).'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={newQuality.category_id}
                        onValueChange={(value) => setNewQuality(prev => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="qualityName">Quality Name *</Label>
                      <Input
                        id="qualityName"
                        placeholder="e.g., TFT, OLED, Li-Ion, Triple Camera"
                        value={newQuality.quality_name}
                        onChange={(e) => setNewQuality(prev => ({ ...prev, quality_name: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="qualityDescription">Quality Description *</Label>
                      <Textarea
                        id="qualityDescription"
                        placeholder="Describe this quality option in detail..."
                        value={newQuality.quality_description}
                        onChange={(e) => setNewQuality(prev => ({ ...prev, quality_description: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newQuality.sort_order}
                        onChange={(e) => setNewQuality(prev => ({ ...prev, sort_order: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="specifications">Technical Specifications (JSON)</Label>
                      <Textarea
                        id="specifications"
                        placeholder='{"type": "LCD", "color_depth": "16-bit"}'
                        value={newQuality.specifications}
                        onChange={(e) => setNewQuality(prev => ({ ...prev, specifications: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional: Technical specifications in JSON format
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={closeDialog}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={editingQuality ? handleUpdateQuality : handleAddQuality} 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        editingQuality ? 'Update Quality' : 'Add Quality'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Qualities Table */}
        <Card>
          <CardHeader>
            <CardTitle>Category Qualities ({filteredQualities.length})</CardTitle>
            <CardDescription>
              Fixed quality options for each category. Display will always have these same qualities available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredQualities.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No qualities found</p>
                <p className="text-gray-400">
                  {searchTerm || (selectedCategoryFilter && selectedCategoryFilter !== "all")
                    ? 'Try adjusting your search or filter criteria.'
                    : qualities.length === 0 
                      ? 'Add your first quality to get started or run the database setup script.'
                      : 'Add your first quality to get started.'
                  }
                </p>
                {qualities.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Tip:</strong> Make sure you have categories set up first, 
                      then run the 
                      <code className="mx-1 px-2 py-1 bg-yellow-100 rounded">database-categories-extension-v2.sql</code> 
                      script for sample qualities.
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
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sort Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredQualities.map((quality) => (
                      <tr key={quality.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{quality.category?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{quality.quality_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm text-gray-500 truncate">{quality.quality_description}</div>
                            {quality.specifications && (
                              <div className="text-xs text-gray-400 mt-1">Has technical specs</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{quality.sort_order}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={quality.is_active ? 'default' : 'secondary'}
                            className={quality.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {quality.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(quality)}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(quality.id, quality.is_active)}
                              disabled={loading}
                            >
                              {quality.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={loading}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Delete Quality
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the quality "{quality.quality_name}" from {quality.category?.name}? 
                                    This action cannot be undone and will affect any models using this quality.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteQuality(quality.id, quality.quality_name)}
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

export default AdminQualitiesManagement; 