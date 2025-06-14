import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Trash2, Edit, Package, AlertTriangle, Monitor, Battery, Camera, Cpu, HardDrive, Wifi, Smartphone, Shield, Volume2, Lock } from 'lucide-react';
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
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  qualities_count?: number;
}

interface NewCategoryForm {
  name: string;
  description: string;
  icon: string;
  gradient: string;
  sort_order: string;
}

const iconOptions = [
  { value: 'monitor', label: 'Monitor (Display)', icon: Monitor },
  { value: 'battery', label: 'Battery', icon: Battery },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'cpu', label: 'Processor', icon: Cpu },
  { value: 'hard-drive', label: 'Storage', icon: HardDrive },
  { value: 'wifi', label: 'Connectivity', icon: Wifi },
  { value: 'smartphone', label: 'Operating System', icon: Smartphone },
  { value: 'shield', label: 'Build Quality', icon: Shield },
  { value: 'volume-2', label: 'Audio', icon: Volume2 },
  { value: 'lock', label: 'Security', icon: Lock },
  { value: 'package', label: 'Other', icon: Package }
];

const gradientOptions = [
  { value: 'from-blue-500 to-blue-700', label: 'Blue Gradient' },
  { value: 'from-green-500 to-green-700', label: 'Green Gradient' },
  { value: 'from-purple-500 to-purple-700', label: 'Purple Gradient' },
  { value: 'from-red-500 to-red-700', label: 'Red Gradient' },
  { value: 'from-yellow-500 to-yellow-700', label: 'Yellow Gradient' },
  { value: 'from-indigo-500 to-indigo-700', label: 'Indigo Gradient' },
  { value: 'from-gray-500 to-gray-700', label: 'Gray Gradient' },
  { value: 'from-teal-500 to-teal-700', label: 'Teal Gradient' },
  { value: 'from-pink-500 to-pink-700', label: 'Pink Gradient' },
  { value: 'from-orange-500 to-orange-700', label: 'Orange Gradient' }
];

const AdminCategoriesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state
  const [newCategory, setNewCategory] = useState<NewCategoryForm>({
    name: '',
    description: '',
    icon: 'package',
    gradient: 'from-gray-500 to-gray-700',
    sort_order: '0'
  });

  // Load data on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories when search term changes
  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);
      
      console.log('Loading categories...');
      
      // First try to load categories with quality counts
      let categoriesData;
      let qualityCounts: Record<string, number> = {};
      
      try {
        // Load basic categories first
        const { data: basicCategories, error: basicError } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (basicError) throw basicError;
        categoriesData = basicCategories || [];
        
        // Try to load quality counts separately (this may fail if table doesn't exist)
        try {
          const { data: qualityData, error: qualityError } = await supabase
            .from('category_qualities')
            .select('category_id')
            .eq('is_active', true);
          
          if (!qualityError && qualityData) {
            // Count qualities per category
            qualityData.forEach(quality => {
              qualityCounts[quality.category_id] = (qualityCounts[quality.category_id] || 0) + 1;
            });
          }
        } catch (qualityError) {
          console.log('Category qualities table not found, using counts of 0');
        }
        
      } catch (error) {
        console.error('Categories error:', error);
        throw error;
      }
      
      // Transform data to include quality counts
      const categoriesWithCounts = categoriesData.map(category => ({
        ...category,
        qualities_count: qualityCounts[category.id] || 0
      }));
      
      console.log('Categories loaded:', categoriesWithCounts.length);
      setCategories(categoriesWithCounts);

    } catch (error: any) {
      console.error('Failed to load categories:', error);
      
      let errorMessage = "Failed to load categories data.";
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage = "Categories table not found. Please run the database setup script first.";
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

  const filterCategories = () => {
    let filtered = categories;

    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCategories(filtered);
  };

  const validateForm = (form: NewCategoryForm) => {
    const errors: string[] = [];
    
    if (!form.name.trim()) errors.push('Please enter category name');
    if (!form.description.trim()) errors.push('Please enter category description');
    if (!form.icon) errors.push('Please select an icon');
    if (!form.gradient) errors.push('Please select a gradient');
    if (form.sort_order && (isNaN(Number(form.sort_order)) || Number(form.sort_order) < 0)) {
      errors.push('Please enter a valid sort order (0 or positive number)');
    }
    
    return errors;
  };

  const handleAddCategory = async () => {
    const errors = validateForm(newCategory);
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
      
      const categoryData = {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        icon: newCategory.icon,
        gradient: newCategory.gradient,
        sort_order: newCategory.sort_order ? parseInt(newCategory.sort_order) : 0,
        is_active: true
      };

      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;

      // Add the new category to the list
      const newCategoryWithCounts = {
        ...data,
        qualities_count: 0
      };
      
      setCategories(prev => [...prev, newCategoryWithCounts].sort((a, b) => a.sort_order - b.sort_order));

      toast({
        title: "Success",
        description: "Category added successfully!",
      });

      // Reset form and close dialog
      setNewCategory({
        name: '',
        description: '',
        icon: 'package',
        gradient: 'from-gray-500 to-gray-700',
        sort_order: '0'
      });
      setIsAddDialogOpen(false);

    } catch (error: any) {
      console.error('Error adding category:', error);
      let errorMessage = "Failed to add category. Please try again.";
      
      if (error.code === '23505') {
        errorMessage = "A category with this name already exists.";
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

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    const errors = validateForm(newCategory);
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
      
      const categoryData = {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        icon: newCategory.icon,
        gradient: newCategory.gradient,
        sort_order: newCategory.sort_order ? parseInt(newCategory.sort_order) : 0
      };

      const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id)
        .select()
        .single();

      if (error) throw error;

      // Update the category in the list
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id 
          ? { ...data, qualities_count: cat.qualities_count }
          : cat
      ).sort((a, b) => a.sort_order - b.sort_order));

      toast({
        title: "Success",
        description: "Category updated successfully!",
      });

      // Reset form and close dialog
      setEditingCategory(null);
      setNewCategory({
        name: '',
        description: '',
        icon: 'package',
        gradient: 'from-gray-500 to-gray-700',
        sort_order: '0'
      });

    } catch (error: any) {
      console.error('Error updating category:', error);
      let errorMessage = "Failed to update category. Please try again.";
      
      if (error.code === '23505') {
        errorMessage = "A category with this name already exists.";
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

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      setLoading(true);
      
      // Check if category has qualities (this may fail if table doesn't exist)
      let hasQualities = false;
      try {
        const { data: qualities, error: checkError } = await supabase
          .from('category_qualities')
          .select('id')
          .eq('category_id', categoryId)
          .limit(1);
        
        if (!checkError && qualities && qualities.length > 0) {
          hasQualities = true;
        }
      } catch (qualityCheckError) {
        console.log('Category qualities table not found, proceeding with deletion');
      }
      
      if (hasQualities) {
        toast({
          title: "Cannot Delete",
          description: "This category cannot be deleted because it has qualities associated with it.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      // Remove category from local state
      setCategories(prev => prev.filter(category => category.id !== categoryId));

      toast({
        title: "Success",
        description: `Category "${categoryName}" deleted successfully!`,
      });

    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId);

      if (error) throw error;

      // Update local state
      setCategories(prev => prev.map(category => 
        category.id === categoryId 
          ? { ...category, is_active: !currentStatus }
          : category
      ));

      toast({
        title: "Success",
        description: `Category ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
      });

    } catch (error) {
      console.error('Error updating category status:', error);
      toast({
        title: "Error",
        description: "Failed to update category status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'package',
      gradient: category.gradient || 'from-gray-500 to-gray-700',
      sort_order: category.sort_order.toString()
    });
  };

  const closeDialog = () => {
    setEditingCategory(null);
    setIsAddDialogOpen(false);
    setNewCategory({
      name: '',
      description: '',
      icon: 'package',
      gradient: 'from-gray-500 to-gray-700',
      sort_order: '0'
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Package;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading categories...</p>
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Product Categories</h1>
          <p className="text-gray-600">Define categories for organizing phone specifications and features</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Categories</p>
                  <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                </div>
                <Package className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Categories</p>
                  <p className="text-2xl font-bold text-green-600">
                    {categories.filter(c => c.is_active).length}
                  </p>
                </div>
                <Package className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Qualities</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {categories.reduce((sum, cat) => sum + (cat.qualities_count || 0), 0)}
                  </p>
                </div>
                <Package className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Add Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Search Categories</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by category name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Dialog open={isAddDialogOpen || !!editingCategory} onOpenChange={closeDialog}>
                <DialogTrigger>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? 'Edit Category' : 'Add New Category'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategory 
                        ? 'Update the category information.'
                        : 'Create a new product category for organizing phone features.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Category Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Display, Battery, Camera"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this category represents..."
                        value={newCategory.description}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="icon">Icon</Label>
                      <Select
                        value={newCategory.icon}
                        onValueChange={(value) => setNewCategory(prev => ({ ...prev, icon: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map(option => {
                            const IconComponent = option.icon;
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="gradient">Color Gradient</Label>
                      <Select
                        value={newCategory.gradient}
                        onValueChange={(value) => setNewCategory(prev => ({ ...prev, gradient: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gradient" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradientOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded bg-gradient-to-r ${option.value}`}></div>
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input
                        id="sortOrder"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newCategory.sort_order}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, sort_order: e.target.value }))}
                      />
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
                      onClick={editingCategory ? handleUpdateCategory : handleAddCategory} 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        editingCategory ? 'Update Category' : 'Add Category'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Categories Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Product Categories ({filteredCategories.length})</CardTitle>
            <CardDescription>
              Manage categories for organizing phone specifications and features. Each category will have fixed quality options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No categories found</p>
                <p className="text-gray-400">
                  {searchTerm
                    ? 'Try adjusting your search criteria.'
                    : categories.length === 0 
                      ? 'Add your first category to get started or run the database setup script.'
                      : 'Add your first category to get started.'
                  }
                </p>
                {categories.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Tip:</strong> Run the 
                      <code className="mx-1 px-2 py-1 bg-yellow-100 rounded">database-categories-extension-v2.sql</code> 
                      script to set up the categories system.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category) => {
                  const IconComponent = getIconComponent(category.icon || 'package');
                  return (
                    <div key={category.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-r ${category.gradient || 'from-gray-500 to-gray-700'}`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(category)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
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
                                  Delete Category
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                  {'\n\n'}Note: You can only delete categories that have no qualities associated with them.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={category.is_active ? 'default' : 'secondary'}
                            className={category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {category.qualities_count || 0} qualities
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(category.id, category.is_active)}
                          disabled={loading}
                          className="flex-1"
                        >
                          {category.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/admin/qualities?category=${category.id}`)}
                          className="flex-1"
                        >
                          Manage Qualities
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminCategoriesManagement; 