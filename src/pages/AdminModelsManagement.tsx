import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Trash2, Edit, Smartphone, AlertTriangle, Upload, FileText, Download, Check, X, BarChart3, TrendingUp, Calendar, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

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

interface CSVModel {
  brand: string;
  model_name: string;
  full_model_name: string;
  release_year?: string;
  rowIndex: number;
  errors: string[];
  status: 'pending' | 'success' | 'error';
}

// Chart color palette
const CHART_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const AdminModelsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('overview');
  
  // Form state for manual entry
  const [newModel, setNewModel] = useState<NewModelForm>({
    brand_id: '',
    model_name: '',
    model_number: '',
    release_year: ''
  });

  // CSV upload state
  const [csvModels, setCsvModels] = useState<CSVModel[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvUploaded, setCsvUploaded] = useState(false);

  // Analytics data processing
  const analyticsData = useMemo(() => {
    // Models by brand
    const modelsByBrand = brands.map(brand => ({
      name: brand.name,
      total: models.filter(m => m.brand_id === brand.id).length,
      active: models.filter(m => m.brand_id === brand.id && m.is_active).length,
      inactive: models.filter(m => m.brand_id === brand.id && !m.is_active).length,
    })).filter(item => item.total > 0).sort((a, b) => b.total - a.total);

    // Models by release year
    const yearCounts: { [key: string]: number } = {};
    models.forEach(model => {
      if (model.release_year) {
        const year = model.release_year.toString();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    const modelsByYear = Object.entries(yearCounts)
      .map(([year, count]) => ({
        year: parseInt(year),
        count,
        name: year
      }))
      .sort((a, b) => a.year - b.year);

    // Status distribution
    const statusData = [
      { name: 'Active', value: models.filter(m => m.is_active).length, color: '#10B981' },
      { name: 'Inactive', value: models.filter(m => !m.is_active).length, color: '#EF4444' },
    ];

    // Models added over time (monthly)
    const monthlyData: { [key: string]: number } = {};
    models.forEach(model => {
      const date = new Date(model.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    const modelsOverTime = Object.entries(monthlyData)
      .map(([month, count]) => ({
        month,
        count,
        name: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    // Brand market share
    const totalModels = models.length;
    const brandMarketShare = modelsByBrand.map(brand => ({
      ...brand,
      percentage: totalModels > 0 ? ((brand.total / totalModels) * 100).toFixed(1) : 0
    }));

    return {
      modelsByBrand,
      modelsByYear,
      statusData,
      modelsOverTime,
      brandMarketShare,
      totalModels,
      totalBrands: brands.length,
      activeModels: models.filter(m => m.is_active).length,
      averageModelsPerBrand: brands.length > 0 ? (models.length / brands.length).toFixed(1) : 0,
      newestModel: models.length > 0 ? models.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] : null,
      oldestModel: models.length > 0 ? models.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] : null,
    };
  }, [models, brands]);

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

  const validateManualForm = () => {
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
    const errors = validateManualForm();
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
        release_year: ''
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
      
      const { error } = await supabase
        .from('smartphone_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      setModels(prev => prev.filter(model => model.id !== modelId));

      toast({
        title: "Success",
        description: `Model "${modelName}" deleted successfully!`,
      });

    } catch (error: any) {
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
      
      const { data, error } = await supabase
        .from('smartphone_models')
        .update({ is_active: !currentStatus })
        .eq('id', modelId)
        .select()
        .single();

      if (error) throw error;

      setModels(prev => prev.map(model => 
        model.id === modelId 
          ? { ...model, is_active: !currentStatus }
          : model
      ));

      toast({
        title: "Success",
        description: `Model ${!currentStatus ? 'activated' : 'deactivated'} successfully!`,
      });

    } catch (error: any) {
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

  // CSV handling functions
  const downloadCSVTemplate = () => {
    const csvContent = "brand,model_name,full_model_name,release_year\nApple,iPhone 15,Apple iPhone 15,2023\nSamsung,Galaxy S24,Samsung Galaxy S24,2024\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (file: File): Promise<CSVModel[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV file must contain at least a header row and one data row'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const requiredHeaders = ['brand', 'model_name', 'full_model_name'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
            return;
          }

          const models: CSVModel[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const errors: string[] = [];
            
            const brand = values[headers.indexOf('brand')] || '';
            const model_name = values[headers.indexOf('model_name')] || '';
            const full_model_name = values[headers.indexOf('full_model_name')] || '';
            const release_year = values[headers.indexOf('release_year')] || '';

            // Validation
            if (!brand) errors.push('Brand is required');
            if (!model_name) errors.push('Model name is required');
            if (!full_model_name) errors.push('Full model name is required');
            if (release_year && (isNaN(Number(release_year)) || Number(release_year) < 1990 || Number(release_year) > new Date().getFullYear() + 2)) {
              errors.push('Invalid release year');
            }

            models.push({
              brand,
              model_name,
              full_model_name,
              release_year: release_year || undefined,
              rowIndex: i + 1,
              errors,
              status: errors.length > 0 ? 'error' : 'pending'
            });
          }

          resolve(models);
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please check the format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCsvLoading(true);
      setCsvFile(file);
      const parsedModels = await parseCSV(file);
      setCsvModels(parsedModels);
      setCsvUploaded(true);
      
      toast({
        title: "CSV Parsed",
        description: `Found ${parsedModels.length} models. Review the data before importing.`,
      });
    } catch (error: any) {
      toast({
        title: "CSV Parse Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCsvLoading(false);
    }
  };

  const importCSVModels = async () => {
    const validModels = csvModels.filter(m => m.errors.length === 0);
    
    if (validModels.length === 0) {
      toast({
        title: "No Valid Models",
        description: "Please fix all errors before importing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCsvLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const model of validModels) {
        try {
          // Find brand by name
          const brand = brands.find(b => b.name.toLowerCase() === model.brand.toLowerCase());
          if (!brand) {
            setCsvModels(prev => prev.map(m => 
              m.rowIndex === model.rowIndex 
                ? { ...m, errors: [...m.errors, `Brand "${model.brand}" not found`], status: 'error' }
                : m
            ));
            errorCount++;
            continue;
          }

          const modelData = {
            brand_id: brand.id,
            model_name: model.model_name,
            model_number: model.full_model_name,
            release_year: model.release_year ? parseInt(model.release_year) : null,
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

          // Add to models list
          const newModelWithBrand = {
            ...data,
            brand_name: data.brands?.name || 'Unknown Brand'
          };
          
          setModels(prev => [newModelWithBrand, ...prev]);
          
          setCsvModels(prev => prev.map(m => 
            m.rowIndex === model.rowIndex 
              ? { ...m, status: 'success' }
              : m
          ));
          
          successCount++;
        } catch (error: any) {
          setCsvModels(prev => prev.map(m => 
            m.rowIndex === model.rowIndex 
              ? { ...m, errors: [...m.errors, error.message], status: 'error' }
              : m
          ));
          errorCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} models. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      toast({
        title: "Import Error",
        description: "Failed to import models. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCsvLoading(false);
    }
  };

  const resetCSVUpload = () => {
    setCsvFile(null);
    setCsvModels([]);
    setCsvUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              <p className="text-gray-600">Loading models data...</p>
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Phone Models Management</h1>
          <p className="text-gray-600">Add and manage phone models for all brands in the marketplace.</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Manage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Models</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsData.totalModels}</p>
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
                      <p className="text-2xl font-bold text-green-600">{analyticsData.activeModels}</p>
                    </div>
                    <Check className="h-10 w-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Brands</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsData.totalBrands}</p>
                    </div>
                    <Smartphone className="h-10 w-10 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Avg Models/Brand</p>
                      <p className="text-2xl font-bold text-orange-600">{analyticsData.averageModelsPerBrand}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks for phone model management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button onClick={() => setActiveMainTab('manage')} className="flex items-center gap-2 h-12">
                    <Plus className="h-4 w-4" />
                    Add New Model
                  </Button>
                  <Button onClick={downloadCSVTemplate} variant="outline" className="flex items-center gap-2 h-12">
                    <Download className="h-4 w-4" />
                    Download CSV Template
                  </Button>
                  <Button onClick={() => setActiveMainTab('analytics')} variant="outline" className="flex items-center gap-2 h-12">
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models by Brand Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Models by Brand
                  </CardTitle>
                  <CardDescription>Distribution of models across different brands</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.modelsByBrand}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="active" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Status Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Model Status Distribution
                  </CardTitle>
                  <CardDescription>Active vs Inactive models</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Models by Release Year */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Models by Release Year
                  </CardTitle>
                  <CardDescription>Model releases over different years</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.modelsByYear}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="count" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Models Added Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Models Added Over Time
                  </CardTitle>
                  <CardDescription>Monthly model addition trends (Last 12 months)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.modelsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Brand Market Share Table */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Market Share</CardTitle>
                <CardDescription>Detailed breakdown of models by brand with percentages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Models</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inactive</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Share</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.brandMarketShare.map((brand, index) => (
                        <tr key={brand.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-3`} style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                              <span className="text-sm font-medium text-gray-900">{brand.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{brand.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{brand.active}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{brand.inactive}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{brand.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
        {/* Add Models Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Models</CardTitle>
            <CardDescription>
              Add phone models manually or import multiple models via CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      placeholder="2024"
                      value={newModel.release_year}
                      onChange={(e) => setNewModel(prev => ({ ...prev, release_year: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleAddModel} disabled={loading}>
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Model
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">CSV Upload</h3>
                      <p className="text-sm text-gray-600">
                        Upload a CSV file with columns: brand, model_name, full_model_name, release_year
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={downloadCSVTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  
                  {!csvUploaded ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
                        <p className="text-gray-500 mb-4">
                          Choose a CSV file with phone models data
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={csvLoading}
                        >
                          {csvLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          Select CSV File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">CSV Preview: {csvFile?.name}</h4>
                          <p className="text-sm text-gray-600">
                            {csvModels.length} models found, {csvModels.filter(m => m.errors.length === 0).length} valid
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={resetCSVUpload}
                          >
                            Reset
                          </Button>
                          <Button
                            onClick={importCSVModels}
                            disabled={csvLoading || csvModels.filter(m => m.errors.length === 0).length === 0}
                          >
                            {csvLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            Import Models
                          </Button>
                        </div>
                      </div>
                      
                      <div className="max-h-64 overflow-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Row</th>
                              <th className="px-3 py-2 text-left">Status</th>
                              <th className="px-3 py-2 text-left">Brand</th>
                              <th className="px-3 py-2 text-left">Model Name</th>
                              <th className="px-3 py-2 text-left">Full Model Name</th>
                              <th className="px-3 py-2 text-left">Release Year</th>
                              <th className="px-3 py-2 text-left">Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvModels.map((model) => (
                              <tr key={model.rowIndex} className="border-t">
                                <td className="px-3 py-2">{model.rowIndex}</td>
                                <td className="px-3 py-2">
                                  {model.status === 'success' && <Check className="h-4 w-4 text-green-600" />}
                                  {model.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                                  {model.status === 'pending' && model.errors.length === 0 && <div className="h-4 w-4 rounded-full bg-blue-100" />}
                                  {model.status === 'pending' && model.errors.length > 0 && <X className="h-4 w-4 text-red-600" />}
                                </td>
                                <td className="px-3 py-2">{model.brand}</td>
                                <td className="px-3 py-2">{model.model_name}</td>
                                <td className="px-3 py-2">{model.full_model_name}</td>
                                <td className="px-3 py-2">{model.release_year || '-'}</td>
                                <td className="px-3 py-2">
                                  {model.errors.length > 0 && (
                                    <span className="text-red-600 text-xs">
                                      {model.errors.join(', ')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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
                    placeholder="Search by model name, full name, or brand..."
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
                      ? 'Add your first phone model to get started.'
                      : 'Add your first phone model to get started.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model Details
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
                            <div className="text-sm font-medium text-gray-900">{model.model_number || model.model_name}</div>
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
                                    Are you sure you want to delete "{model.model_number || model.model_name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteModel(model.id, model.model_number || model.model_name)}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminModelsManagement;