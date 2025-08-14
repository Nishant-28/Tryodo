import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  BarChart3,
  Settings,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { CommissionAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import CommissionDebugger from '../components/CommissionDebugger';

interface CommissionRule {
  id: string;
  category_id: string;
  commission_percentage: number;
  minimum_commission: number;
  maximum_commission: number | null;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  quality_id?: string | null;
  smartphone_model_id?: string | null;
  category?: {
    id: string;
    name: string;
  };
  quality?: {
    id: string;
    quality_name: string;
  };
  model?: {
    id: string;
    model_name: string;
  };
  created_by_profile?: {
    full_name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface QualityCategory {
  id: string;
  name: string;
}

interface SmartphoneModel {
  id: string;
  model_name: string;
}

interface CommissionForm {
  id?: string;
  categoryId: string;
  commissionPercentage: string;
  minimumCommission: string;
  maximumCommission: string;
  effectiveFrom: string;
  effectiveUntil: string;
  notes: string;
  qualityId?: string;
  smartphoneModelId?: string;
}

const AdminCommissionRules: React.FC = () => {
  // Add immediate console log to verify component is loading
  console.log('🔥 AdminCommissionRules component is loading...');
  
  // Also add an alert for immediate feedback
  React.useEffect(() => {
    alert('AdminCommissionRules component loaded!');
  }, []);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();
  
  // Test console log on component mount
  useEffect(() => {
    console.log('🔥 AdminCommissionRules component mounted!');
    console.log('🔥 Current profile on mount:', currentProfile);
  }, []);
  
  // State management
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityCategories, setQualityCategories] = useState<QualityCategory[]>([]);
  const [smartphoneModels, setSmartphoneModels] = useState<SmartphoneModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  
  // Form state
  const [commissionForm, setCommissionForm] = useState<CommissionForm>({
    categoryId: '',
    commissionPercentage: '',
    minimumCommission: '0',
    maximumCommission: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveUntil: '',
    notes: '',
    qualityId: '',
    smartphoneModelId: '',
  });

  // Filtered rules
  const filteredRules = commissionRules.filter(rule => {
    const matchesSearch = searchTerm === '' || 
      rule.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              rule.quality?.quality_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.model?.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || rule.category_id === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    loadCommissionRules();
    loadCategories();
    loadQualityCategories();
    loadSmartphoneModels();
  }, []);

  const loadCommissionRules = async () => {
    try {
      const response = await CommissionAPI.getCommissionRules();
      if (response.success && response.data) {
        setCommissionRules(response.data);
      }
    } catch (error) {
      console.error('Error loading commission rules:', error);
      toast({
        title: "Error",
        description: "Failed to load commission rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadQualityCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('category_qualities')
        .select('id, quality_name')
        .eq('is_active', true)
        .order('quality_name');

      if (error) throw error;
      
      // Map quality_name to name for component compatibility
      const mappedData = data?.map(item => ({
        id: item.id,
        name: item.quality_name
      })) || [];
      
      setQualityCategories(mappedData);
    } catch (error) {
      console.error('Error loading quality categories:', error);
    }
  };

  const loadSmartphoneModels = async () => {
    try {
      const { data, error } = await supabase
        .from('smartphone_models')
        .select('id, model_name')
        .eq('is_active', true)
        .order('model_name');

      if (error) throw error;
      setSmartphoneModels(data || []);
    } catch (error) {
      console.error('Error loading smartphone models:', error);
    }
  };

  const handleCreateRule = async () => {
    console.log('🚀 handleCreateRule called');
    console.log('📝 Form data:', commissionForm);
    console.log('👤 Current profile:', currentProfile);
    
    if (!commissionForm.categoryId || !commissionForm.commissionPercentage) {
      console.log('❌ Validation failed - missing required fields');
      console.log('Category ID:', commissionForm.categoryId);
      console.log('Commission Percentage:', commissionForm.commissionPercentage);
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    if (!currentProfile?.id) {
      console.log('❌ No current profile found');
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreateLoading(true);

      const result = await CommissionAPI.upsertCommissionRule({
        id: editingRule?.id,
        categoryId: commissionForm.categoryId,
        commissionPercentage: parseFloat(commissionForm.commissionPercentage),
        minimumCommission: commissionForm.minimumCommission ? parseFloat(commissionForm.minimumCommission) : 0,
        maximumCommission: commissionForm.maximumCommission ? parseFloat(commissionForm.maximumCommission) : undefined,
        effectiveFrom: commissionForm.effectiveFrom,
        effectiveUntil: commissionForm.effectiveUntil || undefined,
        notes: commissionForm.notes,
        createdBy: currentProfile.id,
        qualityId: (commissionForm.qualityId && commissionForm.qualityId !== 'any') ? commissionForm.qualityId : undefined,
        smartphoneModelId: (commissionForm.smartphoneModelId && commissionForm.smartphoneModelId !== 'any') ? commissionForm.smartphoneModelId : undefined,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: editingRule ? "Commission rule updated successfully" : "Commission rule created successfully"
        });
        
        // Reset form
        setCommissionForm({
          categoryId: '',
          commissionPercentage: '',
          minimumCommission: '0',
          maximumCommission: '',
          effectiveFrom: new Date().toISOString().split('T')[0],
          effectiveUntil: '',
          notes: '',
          qualityId: '',
          smartphoneModelId: '',
        });
        
        setShowCreateDialog(false);
        setEditingRule(null);
        loadCommissionRules();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save commission rule",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditRule = (rule: CommissionRule) => {
    setEditingRule(rule);
    setCommissionForm({
      id: rule.id,
      categoryId: rule.category_id,
      commissionPercentage: rule.commission_percentage.toString(),
      minimumCommission: rule.minimum_commission.toString(),
      maximumCommission: rule.maximum_commission?.toString() || '',
      effectiveFrom: rule.effective_from.split('T')[0],
      effectiveUntil: rule.effective_until?.split('T')[0] || '',
      notes: rule.notes || '',
      qualityId: rule.quality_id || '',
      smartphoneModelId: rule.smartphone_model_id || '',
    });
    setShowCreateDialog(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this commission rule?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('commission_rules')
        .update({ is_active: false })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Commission rule deleted successfully"
      });

      loadCommissionRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete commission rule",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setCommissionForm({
      categoryId: '',
      commissionPercentage: '',
      minimumCommission: '0',
      maximumCommission: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveUntil: '',
      notes: '',
      qualityId: '',
      smartphoneModelId: '',
    });
    setEditingRule(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Commission Rules Management</h1>
            <p className="text-gray-600">Configure commission rates for different categories</p>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Commission Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Commission Rule' : 'Create Commission Rule'}
              </DialogTitle>
              <DialogDescription>
                Set commission rates and conditions for a category
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category *</Label>
                <Select
                  value={commissionForm.categoryId}
                  onValueChange={(value) => setCommissionForm(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quality Category - Optional</Label>
                <Select
                  value={commissionForm.qualityId}
                  onValueChange={(value) => setCommissionForm(prev => ({ ...prev, qualityId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Quality</SelectItem>
                    {qualityCategories.map((quality) => (
                      <SelectItem key={quality.id} value={quality.id}>
                        {quality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Smartphone Model - Optional</Label>
                <Select
                  value={commissionForm.smartphoneModelId}
                  onValueChange={(value) => setCommissionForm(prev => ({ ...prev, smartphoneModelId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select smartphone model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Model</SelectItem>
                    {smartphoneModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.model_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Commission Percentage *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={commissionForm.commissionPercentage}
                    onChange={(e) => setCommissionForm(prev => ({ ...prev, commissionPercentage: e.target.value }))}
                    placeholder="10.5"
                  />
                </div>
                <div>
                  <Label>Minimum Commission (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={commissionForm.minimumCommission}
                    onChange={(e) => setCommissionForm(prev => ({ ...prev, minimumCommission: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>Maximum Commission (₹) - Optional</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={commissionForm.maximumCommission}
                  onChange={(e) => setCommissionForm(prev => ({ ...prev, maximumCommission: e.target.value }))}
                  placeholder="Leave empty for no limit"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Effective From *</Label>
                  <Input
                    type="date"
                    value={commissionForm.effectiveFrom}
                    onChange={(e) => setCommissionForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Effective Until - Optional</Label>
                  <Input
                    type="date"
                    value={commissionForm.effectiveUntil}
                    onChange={(e) => setCommissionForm(prev => ({ ...prev, effectiveUntil: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={commissionForm.notes}
                  onChange={(e) => setCommissionForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this commission rule..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={(e) => {
                  console.log('🔥 Button clicked!', e);
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateRule();
                }} 
                className="w-full"
                disabled={createLoading}
                type="button"
              >
                {createLoading ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionRules.length}</div>
            <p className="text-xs text-muted-foreground">
              {commissionRules.filter(r => r.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories Covered</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(commissionRules.filter(r => r.is_active).map(r => r.category_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              of {categories.length} total categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Commission</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionRules.length > 0 
                ? (commissionRules.reduce((sum, r) => sum + r.commission_percentage, 0) / commissionRules.length).toFixed(1)
                : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all active rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Changes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionRules.filter(r => r.effective_until && new Date(r.effective_until) > new Date()).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Rules with end dates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by category, quality, or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Debug Section - Remove this after fixing the issue */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Commission System</CardTitle>
          <CardDescription>
            Use this to diagnose commission form submission issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  console.log('🧪 Test button clicked!');
                  console.log('Current form state:', commissionForm);
                  console.log('Current profile:', currentProfile);
                }}
                variant="outline"
              >
                Test Console Log
              </Button>
              <Button 
                onClick={() => {
                  console.log('🧪 Testing handleCreateRule directly...');
                  handleCreateRule();
                }}
                variant="outline"
              >
                Test Form Handler
              </Button>
            </div>
            <CommissionDebugger />
          </div>
        </CardContent>
      </Card>

      {/* Commission Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Commission Rules ({filteredRules.length})
          </CardTitle>
          <CardDescription>
            Manage commission rates for different product categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold">
                      {rule.category?.name || 'Unknown Category'}
                      {rule.quality?.quality_name && ` - ${rule.quality.quality_name}`}
                      {rule.model?.model_name && ` (${rule.model.model_name})`}
                    </h4>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {rule.effective_until && new Date(rule.effective_until) > new Date() && (
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        Expires {new Date(rule.effective_until).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Commission:</span>
                      <span className="ml-1 font-medium">{rule.commission_percentage}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Min:</span>
                      <span className="ml-1 font-medium">₹{rule.minimum_commission}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Max:</span>
                      <span className="ml-1 font-medium">
                        {rule.maximum_commission ? `₹${rule.maximum_commission}` : 'No limit'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-1 font-medium">
                        {new Date(rule.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {rule.notes && (
                    <p className="mt-2 text-sm text-gray-600">{rule.notes}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRule(rule)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {filteredRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || filterCategory !== 'all' 
                  ? 'No commission rules found matching your filters'
                  : 'No commission rules configured yet'
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCommissionRules; 