import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit3, Trash2, Search, Filter, Building, Users, Package, Settings, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import { sectorAPI, type Sector } from '@/lib/deliveryApi';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SectorFormData {
  name: string;
  city_name: string;
  pincodes: number[];
  is_active: boolean;
}

const AdminSectorManagement = () => {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [formData, setFormData] = useState<SectorFormData>({
    name: '',
    city_name: '',
    pincodes: [],
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    try {
      setLoading(true);
      const sectorsData = await sectorAPI.getAll();
      setSectors(sectorsData);
    } catch (error: any) {
      console.error('Error loading sectors:', error);
      toast({
        title: "Error",
        description: "Failed to load sectors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSector = () => {
    setEditingSector(null);
    setFormData({
      name: '',
      city_name: '',
      pincodes: [],
      is_active: true
    });
    setPincodeInput('');
    setShowModal(true);
  };

  const handleEditSector = (sector: Sector) => {
    setEditingSector(sector);
    setFormData({
      name: sector.name,
      city_name: sector.city_name,
      pincodes: sector.pincodes,
      is_active: sector.is_active
    });
    setPincodeInput(sector.pincodes.join(', '));
    setShowModal(true);
  };

  const handleDeleteSector = async (sectorId: string) => {
    if (!confirm('Are you sure you want to delete this sector? This action cannot be undone.')) {
      return;
    }

    try {
      await sectorAPI.delete(sectorId);
      setSectors(sectors.filter(s => s.id !== sectorId));
      toast({
        title: "Success",
        description: "Sector deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting sector:', error);
      toast({
        title: "Error",
        description: "Failed to delete sector",
        variant: "destructive",
      });
    }
  };

  const validateFormData = () => {
    if (!formData.name.trim() || !formData.city_name.trim()) {
      return "Name and city are required";
    }

    if (formData.pincodes.length === 0) {
      return "At least one pincode is required";
    }

    // Check for duplicate pincodes
    const duplicatePincodes = formData.pincodes.filter((pincode, index, arr) => 
      arr.indexOf(pincode) !== index
    );
    if (duplicatePincodes.length > 0) {
      return `Duplicate pincodes found: ${duplicatePincodes.join(', ')}`;
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateFormData();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (editingSector) {
        const updatedSector = await sectorAPI.update(editingSector.id, formData);
        setSectors(sectors.map(s => s.id === editingSector.id ? updatedSector : s));
        toast({
          title: "Success",
          description: "Sector updated successfully",
        });
      } else {
        const newSector = await sectorAPI.create(formData);
        setSectors([...sectors, newSector]);
        toast({
          title: "Success",
          description: "Sector created successfully",
        });
      }

      setShowModal(false);
    } catch (error: any) {
      console.error('Error saving sector:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save sector",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePincodeInputChange = (value: string) => {
    setPincodeInput(value);
    
    // Parse pincodes from input and convert to numbers
    const pincodes = value
      .split(/[,\s]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && /^\d{6}$/.test(p))
      .map(p => parseInt(p, 10));
    
    setFormData(prev => ({ ...prev, pincodes }));
  };

  const getFilteredSectors = () => {
    return sectors.filter(sector => {
      const matchesSearch = sector.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sector.city_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sector.pincodes.some(p => p.toString().includes(searchTerm));
      
      const matchesCity = cityFilter === 'all' || sector.city_name === cityFilter;
      
      return matchesSearch && matchesCity;
    });
  };

  const getUniqueCities = () => {
    const cities = [...new Set(sectors.map(s => s.city_name))];
    return cities.sort();
  };

  const getSectorStats = () => {
    const totalSectors = sectors.length;
    const activeSectors = sectors.filter(s => s.is_active).length;
    const totalPincodes = sectors.reduce((acc, s) => acc + s.pincodes.length, 0);
    const uniqueCities = new Set(sectors.map(s => s.city_name)).size;

    return { totalSectors, activeSectors, totalPincodes, uniqueCities };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sectors...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getSectorStats();
  const filteredSectors = getFilteredSectors();
  const uniqueCities = getUniqueCities();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sector Management</h1>
              <p className="text-gray-600">Manage delivery sectors and pincode groupings</p>
            </div>
            <Button onClick={handleCreateSector}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sector
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sectors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSectors}</p>
                </div>
                <Building className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sectors</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeSectors}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pincodes</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalPincodes}</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cities</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.uniqueCities}</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search sectors, cities, or pincodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="w-full sm:w-auto min-w-[180px]">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Cities</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sectors Grid */}
        {filteredSectors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sectors found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || cityFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by creating your first delivery sector.'
                }
              </p>
              {(!searchTerm && cityFilter === 'all') && (
                <Button onClick={handleCreateSector}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Sector
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSectors.map((sector) => (
              <Card key={sector.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {sector.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{sector.city_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sector.is_active ? "default" : "secondary"}>
                        {sector.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Pincodes ({sector.pincodes.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {sector.pincodes.slice(0, 6).map((pincode) => (
                        <Badge key={pincode} variant="outline" className="text-xs">
                          {pincode}
                        </Badge>
                      ))}
                      {sector.pincodes.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{sector.pincodes.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditSector(sector)}
                      className="flex-1"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSector(sector.id)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSector ? 'Edit Sector' : 'Create New Sector'}
            </DialogTitle>
            <DialogDescription>
              {editingSector 
                ? 'Update the sector details and pincode assignments.'
                : 'Create a new delivery sector by grouping pincodes together.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Sector Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Dakbunglow Zone"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="city_name" className="text-sm font-medium">
                  City *
                </Label>
                <Input
                  id="city_name"
                  placeholder="e.g., Patna"
                  value={formData.city_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, city_name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pincodes" className="text-sm font-medium">
                Pincodes *
              </Label>
              <Textarea
                id="pincodes"
                placeholder="Enter pincodes separated by commas (e.g., 800001, 800002, 800003)"
                value={pincodeInput}
                onChange={(e) => handlePincodeInputChange(e.target.value)}
                rows={3}
              />
              {formData.pincodes.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">
                    Valid pincodes ({formData.pincodes.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {formData.pincodes.map((pincode) => (
                      <Badge key={pincode} variant="outline" className="text-xs">
                        {pincode}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active Sector
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingSector ? 'Update Sector' : 'Create Sector'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSectorManagement; 